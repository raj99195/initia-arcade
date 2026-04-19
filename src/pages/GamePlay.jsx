import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useInterwovenKit } from "@initia/interwovenkit-react";
import { useAccount } from "wagmi";
import EnableAutoSign from "../components/EnableAutoSign";
import { useGames } from "../hooks/useGames";
import { saveScore } from "../lib/gameService";

const CHAIN_ID = "initiation-2";
const CONTRACT = "0xd1aa08d2de31ca1af55682f4185547f92332bee";

function encodeU64(value) {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setBigUint64(0, BigInt(value), true);
  return new Uint8Array(buf);
}

function encodeAddress(hexAddr) {
  const hex = hexAddr.replace("0x", "").padStart(64, "0");
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bech32ToHex(addr) {
  const charset = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
  const stripped = addr.slice(addr.indexOf("1") + 1);
  const data = [];
  for (const c of stripped) {
    const idx = charset.indexOf(c);
    if (idx !== -1) data.push(idx);
  }
  const result = [];
  let acc = 0, bits = 0;
  for (const val of data.slice(0, -6)) {
    acc = ((acc << 5) | val) & 0x1fff;
    bits += 5;
    if (bits >= 8) { bits -= 8; result.push((acc >> bits) & 0xff); }
  }
  return "0x" + result.map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function GamePlay() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { games } = useGames();
  const game = games.find(g => g.id === Number(gameId));

  const { submitTxBlock, autoSign, initiaAddress } = useInterwovenKit();
  const { isConnected } = useAccount();

  const [score, setScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [gameLoading, setGameLoading] = useState(true);
  const [tokensEarned, setTokensEarned] = useState(0);
  const iframeRef = useRef(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (games.length > 0) setGameLoading(false);
  }, [games]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (!event.data?._sdk && !event.data?.type) return;
      if (event.data?.type === "SCORE_UPDATE") {
        setScore(event.data.score);
      }
      if (event.data?.type === "GAME_OVER") {
        setScore(event.data.score);
        submitScore(event.data.score);
      }
      if (event.data?.type === "GET_PLAYER_INFO") {
        const iframe = iframeRef.current;
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage({
            type: "PLAYER_INFO",
            _platform: true,
            player: {
              address: initiaAddress || "",
              username: null,
              balance: "0",
            }
          }, "*");
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [autoSign, initiaAddress]);

  const submitScore = async (finalScore) => {
    if (submittingRef.current) return;
    if (!initiaAddress) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError("");
    try {
      const sender = initiaAddress;
      const rewardRate = game.rewardRate || 50;
      const playerReward = Math.floor(rewardRate * 80 / 100); // 40 (80%)
      const creatorReward = Math.floor(rewardRate * 20 / 100); // 10 (20%)

      // Step 1 — Auto-sign enable karo
      if (!autoSign?.isEnabledByChain?.[CHAIN_ID]) {
        await autoSign.enable(CHAIN_ID);
      }

      // Step 2 — submit_score on chain
      const result = await submitTxBlock({
        messages: [{
          typeUrl: "/initia.move.v1.MsgExecute",
          value: {
            sender,
            moduleAddress: CONTRACT,
            moduleName: "leaderboard",
            functionName: "submit_score",
            typeArgs: [],
            args: [
              encodeAddress(CONTRACT),
              encodeU64(game.id),
              encodeU64(finalScore),
            ],
          },
        }],
        fee: {
          amount: [{ denom: "uinit", amount: "6000" }],
          gas: "400000",
        },
      });

      // Step 3 — Player ko 80% ARCADE tokens
      try {
        await submitTxBlock({
          messages: [{
            typeUrl: "/initia.move.v1.MsgExecute",
            value: {
              sender,
              moduleAddress: CONTRACT,
              moduleName: "arcade_token",
              functionName: "auto_mint_reward",
              typeArgs: [],
              args: [
                encodeAddress(CONTRACT),
                encodeU64(finalScore),
                encodeU64(playerReward),
              ],
            },
          }],
          fee: {
            amount: [{ denom: "uinit", amount: "6000" }],
            gas: "400000",
          },
        });
        setTokensEarned(playerReward);
      } catch (tokenErr) {
        console.warn("Player token mint failed:", tokenErr);
      }

      // Step 4 — Creator ko 20% ARCADE tokens
      try {
        const creatorHex = bech32ToHex(game.creator);

        // Creator ka init_player pehle
        await submitTxBlock({
          messages: [{
            typeUrl: "/initia.move.v1.MsgExecute",
            value: {
              sender,
              moduleAddress: CONTRACT,
              moduleName: "arcade_token",
              functionName: "init_player",
              typeArgs: [],
              args: [],
            },
          }],
          fee: {
            amount: [{ denom: "uinit", amount: "6000" }],
            gas: "400000",
          },
        });

        // Creator ko mint_to se tokens
        await submitTxBlock({
          messages: [{
            typeUrl: "/initia.move.v1.MsgExecute",
            value: {
              sender,
              moduleAddress: CONTRACT,
              moduleName: "arcade_token",
              functionName: "mint_to",
              typeArgs: [],
              args: [
                encodeAddress(creatorHex),  // recipient = creator
                encodeU64(creatorReward),   // amount = 10
                encodeAddress(CONTRACT),    // admin_addr
              ],
            },
          }],
          fee: {
            amount: [{ denom: "uinit", amount: "6000" }],
            gas: "400000",
          },
        });
      } catch (creatorErr) {
        console.warn("Creator token mint failed:", creatorErr);
      }

      // Step 5 — Record play + Creator earnings on chain
      try {
        await submitTxBlock({
          messages: [{
            typeUrl: "/initia.move.v1.MsgExecute",
            value: {
              sender,
              moduleAddress: CONTRACT,
              moduleName: "platform",
              functionName: "record_play_and_earn",
              typeArgs: [],
              args: [
                encodeAddress(CONTRACT),
                encodeU64(game.id),
                encodeU64(rewardRate),
              ],
            },
          }],
          fee: {
            amount: [{ denom: "uinit", amount: "6000" }],
            gas: "400000",
          },
        });
      } catch (recordErr) {
        console.warn("Record play failed:", recordErr);
      }

      // Step 6 — Firebase mein save karo
      await saveScore({
        player: sender,
        score: finalScore,
        gameId: game.id,
        gameName: game.name,
        txHash: result.transactionHash,
      });

      setTxHash(result.transactionHash);
      setSubmitted(true);

      const iframe = iframeRef.current;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({
          type: "TRANSACTION_SUCCESS",
          _platform: true,
          txHash: result.transactionHash,
        }, "*");
      }

    } catch (err) {
      console.error("Score submit failed:", err);
      setSubmitError(err.message || "Transaction failed");
      const iframe = iframeRef.current;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({
          type: "TRANSACTION_FAILED",
          _platform: true,
          error: err.message,
        }, "*");
      }
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  if (gameLoading) return (
    <div style={{ padding: 52, textAlign: "center", fontSize: 13, color: "#444" }}>
      Loading game...
    </div>
  );

  if (!game) return (
    <div style={{ padding: 52, color: "#555", textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🎮</div>
      <div style={{ fontSize: 16, marginBottom: 8 }}>Game not found</div>
      <button onClick={() => navigate("/games")}
        style={{ color: "#00FF88", background: "none", border: "0.5px solid #1a3a1a", padding: "8px 20px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
        Browse Games
      </button>
    </div>
  );

  return (
    <div style={{ padding: "32px 52px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <button onClick={() => navigate("/games")} style={{
          background: "transparent", border: "0.5px solid #1e1e1e",
          borderRadius: 8, color: "#555", fontSize: 13, padding: "8px 14px", cursor: "pointer",
        }}>
          ← Back
        </button>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.5px" }}>
            {game.emoji || "🎮"} {game.name}
          </h1>
          <p style={{ fontSize: 12, color: "#444", marginTop: 2 }}>{game.description}</p>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <EnableAutoSign />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20 }}>

        <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 12, overflow: "hidden" }}>
          {game.iframeUrl && !game.iframeUrl.includes("your-unity-game") ? (
            <iframe
              ref={iframeRef}
              src={game.iframeUrl}
              style={{ width: "100%", height: 560, border: "none", display: "block" }}
              allow="fullscreen"
              title={game.name}
            />
          ) : (
            <div style={{
              height: 560, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              background: game.bg || "#0d1a10", gap: 16,
            }}>
              <div style={{ fontSize: 64 }}>{game.emoji || "🎮"}</div>
              <div style={{ fontSize: 16, color: "#555" }}>Game coming soon</div>
              <div style={{ fontSize: 12, color: "#333" }}>Unity WebGL build not yet linked</div>
              <button onClick={() => {
                const testScore = Math.floor(Math.random() * 10000);
                setScore(testScore);
                submitScore(testScore);
              }} style={{
                marginTop: 16, padding: "10px 24px",
                background: "#00FF88", border: "none", borderRadius: 8,
                color: "#0C0C0C", fontSize: 13, fontWeight: 500, cursor: "pointer",
              }}>
                Simulate Game Over (Test)
              </button>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
              Current Score
            </div>
            <div style={{ fontSize: 42, fontWeight: 500, letterSpacing: "-1px", color: "#00FF88" }}>
              {score.toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>
              Reward: +{Math.floor((game.reward || game.rewardRate || 50) * 80 / 100)} ARCADE (you) · +{Math.floor((game.reward || game.rewardRate || 50) * 20 / 100)} ARCADE (creator)
            </div>
          </div>

          <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
              Auto-sign
            </div>
            {autoSign?.isEnabledByChain?.[CHAIN_ID] ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#00FF88", marginBottom: 6 }}>
                  <span style={{ width: 6, height: 6, background: "#00FF88", borderRadius: "50%" }} />
                  Active — no popups
                </div>
                <div style={{ fontSize: 11, color: "#444" }}>
                  Scores submit automatically on game over
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 12, color: "#555", marginBottom: 8 }}>
                  Enable auto-sign for seamless score submission
                </div>
                <EnableAutoSign />
              </div>
            )}
          </div>

          {!autoSign?.isEnabledByChain?.[CHAIN_ID] && score > 0 && !submitted && (
            <button
              onClick={() => submitScore(score)}
              disabled={submitting || !isConnected || !initiaAddress}
              style={{
                padding: "12px",
                background: submitting ? "#1a1a1a" : "#00FF88",
                border: "none", borderRadius: 10,
                color: submitting ? "#333" : "#0C0C0C",
                fontSize: 13, fontWeight: 500,
                cursor: submitting ? "not-allowed" : "pointer",
              }}>
              {submitting ? "Submitting..." : "Submit Score On-Chain"}
            </button>
          )}

          {submitting && (
            <div style={{ background: "#0d1020", border: "0.5px solid #1a2540", borderRadius: 10, padding: 14, textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "#4499ff" }}>Submitting score to blockchain...</div>
            </div>
          )}

          {submitError && (
            <div style={{ background: "#1f0d0d", border: "0.5px solid #3a1a1a", borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, color: "#ff4444", marginBottom: 4 }}>Submission failed</div>
              <div style={{ fontSize: 10, color: "#555", wordBreak: "break-all" }}>{submitError}</div>
            </div>
          )}

          {submitted && txHash && (
            <div style={{ background: "#0d1f12", border: "0.5px solid #1a3a1a", borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 11, color: "#00FF88", marginBottom: 6 }}>
                ✓ Score submitted on-chain!
              </div>
              {tokensEarned > 0 && (
                <div style={{ fontSize: 13, color: "#00FF88", fontWeight: 500, marginBottom: 6 }}>
                  +{tokensEarned} ARCADE earned! 🎉
                </div>
              )}
              <div style={{ fontSize: 10, color: "#444", wordBreak: "break-all", fontFamily: "monospace" }}>
                {txHash}
              </div>
              <a href={`https://scan.testnet.initia.xyz/initiation-2/txs/${txHash}`}
                target="_blank" rel="noreferrer"
                style={{ display: "block", marginTop: 8, fontSize: 11, color: "#4499ff", textDecoration: "none" }}>
                View on Explorer →
              </a>
            </div>
          )}

          <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
              Game Info
            </div>
            {[
              ["Category", game.category],
              ["Player Reward", `+${Math.floor((game.reward || game.rewardRate || 50) * 80 / 100)} ARCADE`],
              ["Creator Reward", `+${Math.floor((game.reward || game.rewardRate || 50) * 20 / 100)} ARCADE`],
              ["Total Plays", (game.plays || 0).toLocaleString()],
              ["Chain", "initiation-2"],
              ["Contract", CONTRACT.slice(0, 10) + "..."],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
                <span style={{ color: "#444" }}>{k}</span>
                <span style={{ color: "#888" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}