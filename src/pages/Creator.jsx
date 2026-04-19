import { useState, useEffect } from "react";
import { useInterwovenKit, useUsernameQuery } from "@initia/interwovenkit-react";
import { useAccount } from "wagmi";
import { saveGame, saveCreator, getGamesByCreator, bech32ToHex, registerCreator, getCreatorStatus } from "../lib/gameService";

const CONTRACT = "0xd1aa08d2de31ca1af55682f4185547f92332bee";
const REST = "https://rest.testnet.initia.xyz";
const CHAIN_ID = "initiation-2";

function encodeU64(value) {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setBigUint64(0, BigInt(value), true);
  return new Uint8Array(buf);
}

function encodeString(value) {
  const bytes = new TextEncoder().encode(value);
  const lenPrefix = new Uint8Array([bytes.length & 0xFF]);
  const combined = new Uint8Array(lenPrefix.length + bytes.length);
  combined.set(lenPrefix);
  combined.set(bytes, lenPrefix.length);
  return combined;
}

function encodeAddress(hexAddr) {
  const hex = hexAddr.replace("0x", "").padStart(64, "0");
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function GameModal({ game, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  if (!game) return null;
  const statusColor = {
    approved: { bg: "#0d1f12", color: "#00FF88", border: "#1a3a1a", label: "✓ Approved" },
    pending:  { bg: "#1f1a0d", color: "#FFB800", border: "#3a2a1a", label: "⏳ Pending Review" },
    rejected: { bg: "#1f0d0d", color: "#ff4444", border: "#3a1a1a", label: "✗ Rejected" },
  }[game.status] || { bg: "#1f1a0d", color: "#FFB800", border: "#3a2a1a", label: "⏳ Pending" };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}>
      <div style={{ background: "#111", border: "0.5px solid #2a2a2a", borderRadius: 16, padding: 32, width: "100%", maxWidth: 520, position: "relative" }}
        onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "transparent", border: "0.5px solid #2a2a2a", borderRadius: 6, color: "#555", fontSize: 13, padding: "4px 10px", cursor: "pointer" }}>✕</button>
        {game.thumbnailUrl && (
          <div style={{ marginBottom: 20, borderRadius: 8, overflow: "hidden", height: 140 }}>
            <img src={game.thumbnailUrl} alt={game.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ fontSize: 20, fontWeight: 500 }}>{game.name}</div>
            <span style={{ padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 500, background: statusColor.bg, color: statusColor.color, border: `0.5px solid ${statusColor.border}` }}>
              {statusColor.label}
            </span>
          </div>
          {game.description && <div style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>{game.description}</div>}
        </div>
        <div style={{ marginBottom: 20 }}>
          {[
            ["Game ID", `#${game.gameId}`],
            ["Category", game.category],
            ["Reward Rate", `${game.rewardRate} ARCADE per play`],
            ["Total Plays", (game.plays || 0).toLocaleString()],
            ["Earned", `${game.earned || 0} ARCADE`],
            ["Creator Revenue", "20% of all rewards"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "9px 0", borderBottom: "0.5px solid #1a1a1a" }}>
              <span style={{ color: "#444" }}>{k}</span>
              <span style={{ color: "#888" }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ background: "#0a0a0a", border: "0.5px solid #1a1a1a", borderRadius: 8, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "#444", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Unity Integration</div>
          <div style={{ fontFamily: "monospace", fontSize: 12, color: "#888", marginBottom: 10 }}>
            Application.ExternalCall("arcade_init", "{game.gameId}");
          </div>
          <button onClick={() => copy(`Application.ExternalCall("arcade_init", "${game.gameId}");`)}
            style={{ padding: "5px 12px", background: copied ? "#0d1f12" : "transparent", border: `0.5px solid ${copied ? "#1a3a1a" : "#2a2a2a"}`, borderRadius: 6, color: copied ? "#00FF88" : "#555", fontSize: 11, cursor: "pointer" }}>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        {game.txHash && (
          <a href={`https://scan.testnet.initia.xyz/initiation-2/txs/${game.txHash}`} target="_blank" rel="noreferrer"
            style={{ display: "block", textAlign: "center", padding: "10px", background: "#0d1020", border: "0.5px solid #1a2540", borderRadius: 8, color: "#4499ff", fontSize: 12, textDecoration: "none" }}>
            View on Initia Explorer →
          </a>
        )}
      </div>
    </div>
  );
}

export default function Creator() {
  const { initiaAddress, requestTxBlock, submitTxBlock, autoSign } = useInterwovenKit();
  const { isConnected } = useAccount();
  const { data: displayName, isLoading: usernameLoading } = useUsernameQuery();

  const [activeTab, setActiveTab] = useState("my-games");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [newGameId, setNewGameId] = useState(null);
  const [error, setError] = useState("");
  const [myGames, setMyGames] = useState([]);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimMsg, setClaimMsg] = useState("");
  const [arcadeBalance, setArcadeBalance] = useState(null);
  const [arcadeLoading, setArcadeLoading] = useState(false);

  // Creator auth states
  const [creatorStatus, setCreatorStatus] = useState(null); // null | "pending" | "approved"
  const [creatorLoading, setCreatorLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  const [form, setForm] = useState({
    name: "", description: "", iframeUrl: "",
    thumbnailUrl: "", category: "Action", rewardRate: "50",
  });

  const categories = ["Action", "Runner", "Strategy", "Puzzle", "Casual", "Shooter", "Adventure"];
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const validateUrl = (url) => { try { new URL(url); return true; } catch { return false; } };

  // Check creator status
  const checkCreatorStatus = async () => {
    if (!initiaAddress) return;
    setCreatorLoading(true);
    try {
      const status = await getCreatorStatus(initiaAddress);
      if (status) {
        setCreatorStatus(status.status);
        // Time left calculate karo
        if (status.status === "pending" && status.registeredAt) {
          const registeredAt = status.registeredAt.toDate?.() || new Date(status.registeredAt);
          const approveAt = new Date(registeredAt.getTime() + 2 * 60 * 60 * 1000);
          const now = new Date();
          const diff = approveAt - now;
          if (diff > 0) {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            setTimeLeft(`${hours}h ${mins}m`);
          } else {
            setCreatorStatus("approved");
          }
        }
      } else {
        setCreatorStatus(null);
      }
    } catch (err) {
      console.error("Creator status check failed:", err);
    } finally {
      setCreatorLoading(false);
    }
  };

  useEffect(() => {
    if (initiaAddress) checkCreatorStatus();
  }, [initiaAddress]);

  // Auto-refresh every minute for pending creators
  useEffect(() => {
    if (creatorStatus === "pending") {
      const interval = setInterval(checkCreatorStatus, 60000);
      return () => clearInterval(interval);
    }
  }, [creatorStatus]);

  // Register as creator
  const registerAsCreator = async () => {
    if (!initiaAddress || !displayName) return;
    setRegisterLoading(true);
    try {
      // Auto-sign enable
      if (!autoSign?.isEnabledByChain?.[CHAIN_ID]) {
        await autoSign.enable(CHAIN_ID);
      }

      // Blockchain pe init_creator
      await submitTxBlock({
        messages: [{
          typeUrl: "/initia.move.v1.MsgExecute",
          value: {
            sender: initiaAddress,
            moduleAddress: CONTRACT,
            moduleName: "platform",
            functionName: "init_creator",
            typeArgs: [],
            args: [],
          },
        }],
        fee: {
          amount: [{ denom: "uinit", amount: "6000" }],
          gas: "400000",
        },
      });

      // Firebase mein save karo
      await registerCreator({
        address: initiaAddress,
        displayName: displayName || "",
      });

      setCreatorStatus("pending");
    } catch (err) {
      console.error("Register failed:", err);
    } finally {
      setRegisterLoading(false);
    }
  };

  // Fetch games
  const fetchMyGames = async () => {
    if (!initiaAddress) return;
    setGamesLoading(true);
    try {
      const games = await getGamesByCreator(initiaAddress);
      setMyGames(games);
    } catch (err) {
      console.error("Firebase fetch failed:", err);
    } finally {
      setGamesLoading(false);
    }
  };

  useEffect(() => {
    if (initiaAddress && creatorStatus === "approved") fetchMyGames();
  }, [initiaAddress, creatorStatus]);

  // Fetch ARCADE balance
  const fetchAndInitArcade = async () => {
    if (!initiaAddress) return;
    setArcadeLoading(true);
    try {
      const hexAddr = bech32ToHex(initiaAddress);
      const res = await fetch(
        `${REST}/initia/move/v1/accounts/${hexAddr}/resources`
      );
      const data = await res.json();
      const arcadeResource = data?.resources?.find(
        r => r.struct_tag === `${CONTRACT}::arcade_token::ArcadeBalance`
      );
      if (arcadeResource) {
        const parsed = JSON.parse(arcadeResource.move_resource);
        setArcadeBalance(parsed?.data?.amount || "0");
      } else {
        if (!autoSign?.isEnabledByChain?.[CHAIN_ID]) {
          await autoSign.enable(CHAIN_ID);
        }
        await submitTxBlock({
          messages: [{
            typeUrl: "/initia.move.v1.MsgExecute",
            value: {
              sender: initiaAddress,
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
        setArcadeBalance("0");
      }
    } catch (err) {
      console.error("Fetch failed:", err);
    } finally {
      setArcadeLoading(false);
    }
  };

  const submitGame = async () => {
    if (!form.name || !form.iframeUrl || !form.description) {
      setError("Please fill in all required fields."); return;
    }
    if (!validateUrl(form.iframeUrl)) {
      setError("Please enter a valid game URL starting with https://"); return;
    }
    if (form.thumbnailUrl && !validateUrl(form.thumbnailUrl)) {
      setError("Thumbnail URL invalid — leave empty or enter a valid URL."); return;
    }
    setError("");
    setLoading(true);
    try {
      const sender = initiaAddress;
      const { getTotalGamesCount } = await import("../lib/gameService");
      const beforeTotal = await getTotalGamesCount();
      const assignedGameId = beforeTotal + 1;

      const result = await requestTxBlock({
        messages: [{
          typeUrl: "/initia.move.v1.MsgExecute",
          value: {
            sender,
            moduleAddress: CONTRACT,
            moduleName: "platform",
            functionName: "register_game",
            typeArgs: [],
            args: [
              encodeAddress(CONTRACT),
              encodeString(form.name),
              encodeString(form.iframeUrl),
              encodeU64(parseInt(form.rewardRate) || 50),
            ],
          },
        }],
      });

      await saveGame({
        gameId: assignedGameId,
        name: form.name,
        description: form.description,
        iframeUrl: form.iframeUrl,
        thumbnailUrl: form.thumbnailUrl || "",
        category: form.category,
        rewardRate: form.rewardRate,
        creator: sender,
        txHash: result.transactionHash,
      });

      await saveCreator({
        address: sender,
        displayName: displayName || "",
      });

      setNewGameId(assignedGameId);
      setTxHash(result.transactionHash);
      await fetchMyGames();
      setStep(3);
    } catch (err) {
      console.error("FULL ERROR:", err);
      setError("Transaction failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalEarned = myGames.reduce((sum, g) => sum + (g.earned || 0), 0);

  // ── STATES ──────────────────────────────────────

  // State 1: Not connected
  if (!isConnected) return (
    <div style={{ padding: 52, textAlign: "center", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ fontSize: 64, marginBottom: 24 }}>🎮</div>
      <h2 style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.5px", marginBottom: 12 }}>Creator Dashboard</h2>
      <p style={{ color: "#444", fontSize: 14, marginBottom: 32, lineHeight: 1.7 }}>
        Connect your Initia wallet to publish games and earn ARCADE tokens.
      </p>
      <div style={{ padding: 16, background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 10, fontSize: 13, color: "#555" }}>
        Use the "Connect Wallet" button in the navbar
      </div>
    </div>
  );

  // State 2: No .init username
  if (!usernameLoading && !displayName) return (
    <div style={{ padding: 52, textAlign: "center", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ fontSize: 64, marginBottom: 24 }}>👤</div>
      <h2 style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.5px", marginBottom: 12 }}>
        Set Your <span style={{ color: "#00FF88" }}>Username First</span>
      </h2>
      <p style={{ color: "#444", fontSize: 14, marginBottom: 32, lineHeight: 1.7 }}>
        You need an <strong style={{ color: "#fff" }}>.init username</strong> to become a creator on InitiaArcade.
        This is your on-chain identity!
      </p>
      <a href="https://app.testnet.initia.xyz/usernames" target="_blank" rel="noreferrer"
        style={{ display: "inline-block", padding: "14px 32px", background: "#00FF88", border: "none", borderRadius: 10, color: "#0C0C0C", fontSize: 14, fontWeight: 500, textDecoration: "none", marginBottom: 16 }}>
        Get .init Username →
      </a>
      <div style={{ fontSize: 12, color: "#444" }}>
        After setting your username, come back and refresh this page
      </div>
    </div>
  );

  // State 3: Has username but not registered
  if (creatorStatus === null && !creatorLoading) return (
    <div style={{ padding: 52, textAlign: "center", maxWidth: 520, margin: "0 auto" }}>
      <div style={{ fontSize: 64, marginBottom: 24 }}>🚀</div>
      <h2 style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.5px", marginBottom: 12 }}>
        Become a <span style={{ color: "#00FF88" }}>Creator</span>
      </h2>
      <p style={{ color: "#444", fontSize: 14, marginBottom: 32, lineHeight: 1.7 }}>
        Register as a game creator on <strong style={{ color: "#fff" }}>InitiaArcade</strong>.
        Publish your games and earn <strong style={{ color: "#00FF88" }}>20% revenue</strong> from every play!
      </p>

      {/* Benefits */}
      <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 12, padding: 24, marginBottom: 28, textAlign: "left" }}>
        <div style={{ fontSize: 12, color: "#444", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>Creator Benefits</div>
        {[
          { icon: "💰", title: "Earn 20% Revenue", desc: "Every time someone plays your game" },
          { icon: "🎮", title: "Publish Games", desc: "Deploy Unity WebGL games to our platform" },
          { icon: "📊", title: "Track Analytics", desc: "See plays, earnings, and player stats" },
          { icon: "⛓️", title: "On-Chain Identity", desc: "Your creator profile lives on Initia blockchain" },
        ].map(b => (
          <div key={b.title} style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            <span style={{ fontSize: 20 }}>{b.icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{b.title}</div>
              <div style={{ fontSize: 12, color: "#444" }}>{b.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: "#0d1020", border: "0.5px solid #1a2540", borderRadius: 10, padding: 16, marginBottom: 24, fontSize: 13, color: "#4499ff", lineHeight: 1.6 }}>
        ⏱ Registration takes 1 transaction. Approval takes <strong>1-2 hours</strong> after which your full dashboard unlocks!
      </div>

      <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 10, padding: 16, marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#0d1f12", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>👤</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#00FF88" }}>{displayName}</div>
          <div style={{ fontSize: 11, color: "#333", fontFamily: "monospace" }}>{initiaAddress?.slice(0, 20)}...</div>
        </div>
      </div>

      <button
        onClick={registerAsCreator}
        disabled={registerLoading}
        style={{
          width: "100%", padding: "16px",
          background: registerLoading ? "#1a1a1a" : "#00FF88",
          border: "none", borderRadius: 12,
          color: registerLoading ? "#333" : "#0C0C0C",
          fontSize: 15, fontWeight: 500,
          cursor: registerLoading ? "not-allowed" : "pointer",
        }}>
        {registerLoading ? "Registering on blockchain..." : "🚀 Register as Creator"}
      </button>
    </div>
  );

  // State 4: Pending approval
  if (creatorStatus === "pending") return (
    <div style={{ padding: 52, textAlign: "center", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ fontSize: 64, marginBottom: 24 }}>⏳</div>
      <h2 style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.5px", marginBottom: 12 }}>
        Approval <span style={{ color: "#FFB800" }}>Pending</span>
      </h2>
      <p style={{ color: "#444", fontSize: 14, marginBottom: 32, lineHeight: 1.7 }}>
        Your creator account is being reviewed. This typically takes <strong style={{ color: "#fff" }}>1-2 hours</strong>.
        Your dashboard will unlock automatically once approved!
      </p>

      <div style={{ background: "#1f1a0d", border: "0.5px solid #3a2a1a", borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: "#FFB800", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Time remaining</div>
        <div style={{ fontSize: 36, fontWeight: 500, color: "#FFB800", fontFamily: "monospace" }}>
          {timeLeft || "Calculating..."}
        </div>
      </div>

      <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 10, padding: 16, marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: "#444", marginBottom: 12 }}>While you wait:</div>
        {[
          "Build your Unity WebGL game",
          "Set up your game's thumbnail",
          "Prepare your game description",
        ].map((t, i) => (
          <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: "#555", marginBottom: 8 }}>
            <span style={{ color: "#00FF88" }}>→</span>
            <span>{t}</span>
          </div>
        ))}
      </div>

      <button
        onClick={checkCreatorStatus}
        disabled={creatorLoading}
        style={{
          padding: "12px 28px",
          background: "transparent",
          border: "0.5px solid #2a2a2a",
          borderRadius: 10, color: "#555",
          fontSize: 13, cursor: "pointer",
        }}>
        {creatorLoading ? "Checking..." : "↻ Check Status"}
      </button>
    </div>
  );

  // Loading state
  if (creatorLoading) return (
    <div style={{ padding: 52, textAlign: "center", fontSize: 13, color: "#444" }}>
      Checking creator status...
    </div>
  );

  // State 5: APPROVED — Full Dashboard
  return (
    <div style={{ padding: "52px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 42, fontWeight: 500, letterSpacing: "-1px", marginBottom: 8 }}>
            Creator <span style={{ color: "#00FF88" }}>Dashboard</span>
          </h1>
          <p style={{ color: "#444", fontSize: 14, lineHeight: 1.7 }}>
            Manage your published games, track earnings, and publish new games.
          </p>
        </div>

        {/* Creator Profile */}
        <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#0d1f12", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🎮</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: "#00FF88" }}>{displayName}</div>
                <span style={{ fontSize: 10, color: "#555", background: "#0d1f12", padding: "2px 8px", borderRadius: 4 }}>verified ✓</span>
              </div>
              <div style={{ fontSize: 11, color: "#333", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {initiaAddress}
              </div>
            </div>
            <div style={{ display: "flex", flexShrink: 0 }}>
              {[
                { label: "Games", value: myGames.length, color: "#00FF88" },
                { label: "Earned", value: totalEarned.toLocaleString() + " ARCADE", color: "#7B2FFF" },
              ].map((s, i) => (
                <div key={s.label} style={{ textAlign: "center", padding: "10px 20px", borderLeft: i > 0 ? "0.5px solid #1a1a1a" : "none" }}>
                  <div style={{ fontSize: 20, fontWeight: 500, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, marginBottom: 28, borderBottom: "0.5px solid #1e1e1e" }}>
          {[
            { id: "my-games", label: `My Games (${myGames.length})` },
            { id: "earnings", label: "Earnings & Revenue" },
            { id: "submit", label: "+ Submit New Game" },
          ].map(t => (
            <button key={t.id} onClick={() => { setActiveTab(t.id); setStep(1); setError(""); }}
              style={{
                padding: "12px 24px", background: "transparent", border: "none",
                borderBottom: activeTab === t.id ? "2px solid #00FF88" : "2px solid transparent",
                color: activeTab === t.id ? "#fff" : "#555",
                fontSize: 13, cursor: "pointer", marginBottom: "-0.5px",
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* MY GAMES TAB */}
        {activeTab === "my-games" && (
          <div>
            {gamesLoading ? (
              <div style={{ padding: 48, textAlign: "center", fontSize: 13, color: "#444" }}>Loading from database...</div>
            ) : myGames.length === 0 ? (
              <div style={{ padding: 48, textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🎮</div>
                <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>No games yet</div>
                <div style={{ fontSize: 13, color: "#444", marginBottom: 24 }}>Submit your first game to get started</div>
                <button onClick={() => setActiveTab("submit")}
                  style={{ padding: "12px 28px", background: "#00FF88", border: "none", borderRadius: 10, color: "#0C0C0C", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                  Submit Your First Game →
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                  {myGames.map(game => {
                    const statusStyle = {
                      approved: { bg: "#0d1f12", color: "#00FF88", border: "#1a3a1a", label: "Live" },
                      pending:  { bg: "#1f1a0d", color: "#FFB800", border: "#3a2a1a", label: "Pending" },
                      rejected: { bg: "#1f0d0d", color: "#ff4444", border: "#3a1a1a", label: "Rejected" },
                    }[game.status] || { bg: "#1f1a0d", color: "#FFB800", border: "#3a2a1a", label: "Pending" };
                    return (
                      <div key={game.id} onClick={() => setSelectedGame(game)}
                        style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 10, overflow: "hidden", cursor: "pointer", transition: "all 0.2s" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#00FF88"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e1e1e"; e.currentTarget.style.transform = "translateY(0)"; }}>
                        <div style={{ height: 100, background: "#0a0a0a", position: "relative", overflow: "hidden" }}>
                          {game.thumbnailUrl ? (
                            <img src={game.thumbnailUrl} alt={game.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.style.display = "none"} />
                          ) : (
                            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>🎮</div>
                          )}
                          <span style={{ position: "absolute", top: 8, right: 8, padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 500, background: statusStyle.bg, color: statusStyle.color, border: `0.5px solid ${statusStyle.border}` }}>
                            {statusStyle.label}
                          </span>
                        </div>
                        <div style={{ padding: 14 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{game.name}</div>
                          <div style={{ fontSize: 11, color: "#444", marginBottom: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {game.description || "No description"}
                          </div>
                          <div style={{ fontSize: 10, color: "#333", fontFamily: "monospace", marginBottom: 10 }}>
                            Game ID #{game.gameId} · {game.category}
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                            <div style={{ background: "#0a0a0a", borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: "#00FF88" }}>{game.plays || 0}</div>
                              <div style={{ fontSize: 9, color: "#444" }}>Plays</div>
                            </div>
                            <div style={{ background: "#0a0a0a", borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: "#7B2FFF" }}>{game.earned || 0}</div>
                              <div style={{ fontSize: 9, color: "#444" }}>ARCADE</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div onClick={() => setActiveTab("submit")}
                    style={{ background: "transparent", border: "0.5px dashed #2a2a2a", borderRadius: 10, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 200 }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "#00FF88"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "#2a2a2a"}>
                    <div style={{ fontSize: 28, color: "#2a2a2a" }}>+</div>
                    <div style={{ fontSize: 12, color: "#444" }}>Submit New Game</div>
                  </div>
                </div>
                <div style={{ marginTop: 12, padding: 12, background: "#0d1020", border: "0.5px solid #1a2540", borderRadius: 8, fontSize: 12, color: "#4499ff" }}>
                  Approval typically takes 24–48 hours. Click any game card to view details.
                </div>
              </div>
            )}
          </div>
        )}

        {/* EARNINGS TAB */}
        {activeTab === "earnings" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
              {[
                { label: "Total Earned", value: totalEarned.toLocaleString() + " ARCADE", color: "#7B2FFF", icon: "💰" },
                { label: "Claimable Now", value: totalEarned.toLocaleString() + " ARCADE", color: "#00FF88", icon: "✨" },
                { label: "Games Published", value: myGames.length, color: "#4499ff", icon: "🎮" },
              ].map(s => (
                <div key={s.label} style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 20, marginBottom: 10 }}>{s.icon}</div>
                  <div style={{ fontSize: 22, fontWeight: 500, color: s.color, marginBottom: 4 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "#444" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* ARCADE Balance */}
            <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>ARCADE Token Balance</div>
              <div style={{ fontSize: 13, color: "#444", marginBottom: 20 }}>Your real-time on-chain ARCADE balance.</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "#0a0a0a", borderRadius: 10, border: "0.5px solid #1a1a1a" }}>
                <div>
                  <div style={{ fontSize: 11, color: "#444", marginBottom: 4 }}>On-chain balance</div>
                  <div style={{ fontSize: 28, fontWeight: 500, color: "#00FF88" }}>
                    {arcadeBalance !== null ? `${Number(arcadeBalance).toLocaleString()} ARCADE` : "—"}
                  </div>
                </div>
                <button onClick={fetchAndInitArcade} disabled={arcadeLoading}
                  style={{ padding: "12px 24px", background: arcadeLoading ? "#1a1a1a" : "#00FF88", border: "none", borderRadius: 10, color: arcadeLoading ? "#333" : "#0C0C0C", fontSize: 13, fontWeight: 500, cursor: arcadeLoading ? "not-allowed" : "pointer" }}>
                  {arcadeLoading ? "Fetching..." : arcadeBalance !== null ? "↻ Refresh" : "Fetch Balance"}
                </button>
              </div>
            </div>

            <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>Revenue Split</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
                {[
                  { label: "Player", pct: "80%", color: "#00FF88", desc: "Goes to player wallet" },
                  { label: "Creator (You)", pct: "20%", color: "#7B2FFF", desc: "Your earnings per play" },
                  { label: "Platform", pct: "0%", color: "#FFB800", desc: "Protocol maintenance" },
                ].map(r => (
                  <div key={r.label} style={{ background: "#0a0a0a", borderRadius: 8, padding: 16, textAlign: "center" }}>
                    <div style={{ fontSize: 28, fontWeight: 500, color: r.color, marginBottom: 4 }}>{r.pct}</div>
                    <div style={{ fontSize: 12, color: "#fff", marginBottom: 4 }}>{r.label}</div>
                    <div style={{ fontSize: 11, color: "#444" }}>{r.desc}</div>
                  </div>
                ))}
              </div>
              {myGames.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: "#444", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>Per Game Breakdown</div>
                  {myGames.map(game => (
                    <div key={game.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "0.5px solid #1a1a1a" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{game.name}</div>
                        <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>Game #{game.gameId} · {game.plays || 0} plays · {game.category}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 14, color: "#7B2FFF" }}>{game.earned || 0} ARCADE</div>
                        <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>earned</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Claim Revenue</div>
              <div style={{ fontSize: 13, color: "#444", marginBottom: 20, lineHeight: 1.6 }}>
                Withdraw your earned ARCADE tokens to your wallet.
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "#0a0a0a", borderRadius: 10, border: "0.5px solid #1a1a1a", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#444", marginBottom: 4 }}>Claimable balance</div>
                  <div style={{ fontSize: 28, fontWeight: 500, color: "#00FF88" }}>{totalEarned.toLocaleString()} ARCADE</div>
                </div>
                <button onClick={() => { setClaimLoading(true); setTimeout(() => { setClaimLoading(false); setClaimMsg("Contract update pending — coming soon!"); }, 1000); }}
                  disabled={claimLoading || totalEarned === 0}
                  style={{ padding: "12px 28px", background: totalEarned > 0 ? "#00FF88" : "#1a1a1a", border: "none", borderRadius: 10, color: totalEarned > 0 ? "#0C0C0C" : "#333", fontSize: 13, fontWeight: 500, cursor: totalEarned > 0 ? "pointer" : "not-allowed" }}>
                  {claimLoading ? "Processing..." : "Claim Tokens"}
                </button>
              </div>
              {claimMsg && <div style={{ padding: 12, background: "#0d1020", border: "0.5px solid #1a2540", borderRadius: 8, fontSize: 12, color: "#4499ff", marginBottom: 12 }}>{claimMsg}</div>}
              <div style={{ padding: 12, background: "#1f1a0d", border: "0.5px solid #3a2a1a", borderRadius: 8, fontSize: 12, color: "#FFB800" }}>
                ⚠ Claim functionality requires a contract update — coming soon!
              </div>
            </div>
          </div>
        )}

        {/* SUBMIT TAB */}
        {activeTab === "submit" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
              {[{ n: 1, label: "Game Details" }, { n: 2, label: "Review & Submit" }, { n: 3, label: "Published!" }].map(s => (
                <div key={s.n} style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "0.5px solid", borderColor: step === s.n ? "#00FF88" : step > s.n ? "#1a3a1a" : "#1e1e1e", background: step === s.n ? "#0d1f12" : "transparent", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 20, height: 20, borderRadius: "50%", background: step >= s.n ? "#00FF88" : "#1e1e1e", color: step >= s.n ? "#0C0C0C" : "#444", fontSize: 11, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {step > s.n ? "✓" : s.n}
                  </span>
                  <span style={{ fontSize: 12, color: step === s.n ? "#00FF88" : "#444" }}>{s.label}</span>
                </div>
              ))}
            </div>

            {step === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {[
                  { name: "name", label: "Game Name", required: true, placeholder: "e.g. Pixel Runner" },
                  { name: "description", label: "Description", required: true, placeholder: "Describe your game...", textarea: true },
                ].map(f => (
                  <div key={f.name}>
                    <label style={{ fontSize: 12, color: "#555", display: "block", marginBottom: 8 }}>
                      {f.label} {f.required && <span style={{ color: "#ff4444" }}>*</span>}
                    </label>
                    {f.textarea ? (
                      <textarea name={f.name} value={form[f.name]} onChange={handleChange} placeholder={f.placeholder} rows={3}
                        style={{ width: "100%", padding: "12px 16px", background: "#111", border: "0.5px solid #2a2a2a", borderRadius: 8, color: "#fff", fontSize: 14, outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
                    ) : (
                      <input name={f.name} value={form[f.name]} onChange={handleChange} placeholder={f.placeholder}
                        style={{ width: "100%", padding: "12px 16px", background: "#111", border: "0.5px solid #2a2a2a", borderRadius: 8, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                    )}
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 12, color: "#555", display: "block", marginBottom: 8 }}>
                    Game URL <span style={{ color: "#ff4444" }}>*</span>
                  </label>
                  <input name="iframeUrl" value={form.iframeUrl} onChange={handleChange} placeholder="https://username.github.io/my-game"
                    style={{ width: "100%", padding: "12px 16px", background: "#111", border: `0.5px solid ${form.iframeUrl ? (validateUrl(form.iframeUrl) ? "#1a3a1a" : "#3a1a1a") : "#2a2a2a"}`, borderRadius: 8, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#555", display: "block", marginBottom: 8 }}>Thumbnail URL <span style={{ color: "#333" }}>Optional</span></label>
                  <input name="thumbnailUrl" value={form.thumbnailUrl} onChange={handleChange} placeholder="https://i.imgur.com/abc123.jpg"
                    style={{ width: "100%", padding: "12px 16px", background: "#111", border: `0.5px solid ${form.thumbnailUrl ? (validateUrl(form.thumbnailUrl) ? "#1a3a1a" : "#3a1a1a") : "#2a2a2a"}`, borderRadius: 8, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 12, color: "#555", display: "block", marginBottom: 8 }}>Category</label>
                    <select name="category" value={form.category} onChange={handleChange}
                      style={{ width: "100%", padding: "12px 16px", background: "#111", border: "0.5px solid #2a2a2a", borderRadius: 8, color: "#fff", fontSize: 14, outline: "none" }}>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#555", display: "block", marginBottom: 8 }}>Reward Rate</label>
                    <input name="rewardRate" value={form.rewardRate} onChange={handleChange} type="number" min="10" max="500"
                      style={{ width: "100%", padding: "12px 16px", background: "#111", border: "0.5px solid #2a2a2a", borderRadius: 8, color: "#fff", fontSize: 14, outline: "none" }} />
                  </div>
                </div>
                {error && <div style={{ padding: 12, background: "#1f0d0d", border: "0.5px solid #3a1a1a", borderRadius: 8, color: "#ff4444", fontSize: 12 }}>{error}</div>}
                <button onClick={() => {
                  if (!form.name || !form.iframeUrl || !form.description) { setError("Please fill in all required fields."); return; }
                  if (!validateUrl(form.iframeUrl)) { setError("Please enter a valid game URL."); return; }
                  setError(""); setStep(2);
                }} style={{ padding: "14px", background: "#00FF88", border: "none", borderRadius: 10, color: "#0C0C0C", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
                  Continue to Review →
                </button>
              </div>
            )}

            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 12, padding: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 20 }}>Review your submission</div>
                  {[
                    ["Game Name", form.name],
                    ["Description", form.description],
                    ["Game URL", form.iframeUrl],
                    ["Category", form.category],
                    ["Reward Rate", `${form.rewardRate} ARCADE per play`],
                    ["Creator", displayName || initiaAddress],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 12, paddingBottom: 12, borderBottom: "0.5px solid #1a1a1a" }}>
                      <span style={{ color: "#444", minWidth: 140 }}>{k}</span>
                      <span style={{ color: "#888", textAlign: "right", wordBreak: "break-all" }}>{v}</span>
                    </div>
                  ))}
                </div>
                {error && <div style={{ padding: 12, background: "#1f0d0d", border: "0.5px solid #3a1a1a", borderRadius: 8, color: "#ff4444", fontSize: 12 }}>{error}</div>}
                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={() => setStep(1)} style={{ flex: 1, padding: "14px", background: "transparent", border: "0.5px solid #2a2a2a", borderRadius: 10, color: "#fff", fontSize: 14, cursor: "pointer" }}>← Back</button>
                  <button onClick={submitGame} disabled={loading}
                    style={{ flex: 2, padding: "14px", background: loading ? "#1a1a1a" : "#00FF88", border: "none", borderRadius: 10, color: loading ? "#555" : "#0C0C0C", fontSize: 14, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer" }}>
                    {loading ? "Submitting to blockchain..." : "Submit Game 🚀"}
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <div style={{ fontSize: 64, marginBottom: 24 }}>🎉</div>
                <h2 style={{ fontSize: 32, fontWeight: 500, letterSpacing: "-0.5px", marginBottom: 12 }}>
                  Game <span style={{ color: "#00FF88" }}>Submitted!</span>
                </h2>
                <p style={{ color: "#444", fontSize: 14, maxWidth: 440, margin: "0 auto 32px", lineHeight: 1.7 }}>
                  Your game is now in the review queue. Once approved, it will go live.
                </p>
                {newGameId && (
                  <div style={{ background: "#0d1020", border: "0.5px solid #1a2540", borderRadius: 12, padding: 20, maxWidth: 480, margin: "0 auto 16px" }}>
                    <div style={{ fontSize: 11, color: "#4499ff", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Your Game ID</div>
                    <div style={{ fontSize: 36, fontWeight: 500, color: "#fff", fontFamily: "monospace", marginBottom: 8 }}>#{newGameId}</div>
                    <div style={{ fontSize: 11, color: "#444", fontFamily: "monospace", background: "#0a0a0a", padding: "8px 12px", borderRadius: 6 }}>
                      Application.ExternalCall("arcade_init", "{newGameId}");
                    </div>
                  </div>
                )}
                {txHash && (
                  <div style={{ background: "#0d1f12", border: "0.5px solid #1a3a1a", borderRadius: 10, padding: 16, maxWidth: 480, margin: "0 auto 24px" }}>
                    <div style={{ fontSize: 11, color: "#00FF88", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Transaction confirmed ✓</div>
                    <div style={{ fontSize: 10, color: "#444", wordBreak: "break-all", fontFamily: "monospace" }}>{txHash}</div>
                  </div>
                )}
                <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
                  <button onClick={() => { setActiveTab("my-games"); setStep(1); setForm({ name: "", description: "", iframeUrl: "", thumbnailUrl: "", category: "Action", rewardRate: "50" }); setTxHash(""); setNewGameId(null); }}
                    style={{ padding: "12px 24px", background: "#0d1f12", border: "0.5px solid #1a3a1a", borderRadius: 10, color: "#00FF88", fontSize: 13, cursor: "pointer" }}>
                    View My Games →
                  </button>
                  <button onClick={() => { setStep(1); setForm({ name: "", description: "", iframeUrl: "", thumbnailUrl: "", category: "Action", rewardRate: "50" }); setTxHash(""); setNewGameId(null); }}
                    style={{ padding: "12px 24px", background: "#111", border: "0.5px solid #2a2a2a", borderRadius: 10, color: "#888", fontSize: 13, cursor: "pointer" }}>
                    Submit Another
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {selectedGame && <GameModal game={selectedGame} onClose={() => setSelectedGame(null)} />}
    </div>
  );
}