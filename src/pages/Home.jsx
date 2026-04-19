import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { useInterwovenKit } from "@initia/interwovenkit-react";
import GameCard from "../components/GameCard";
import EnableAutoSign from "../components/EnableAutoSign";
import { useGames } from "../hooks/useGames";
const CONTRACT = "0xd1aa08d2de31ca1af55682f4185547f92332bee";
const CHAIN_ID = "initiation-2";
export default function Home() {
  const navigate = useNavigate();
  const { isConnected } = useAccount();
  const { submitTxBlock, estimateGas, autoSign, initiaAddress } = useInterwovenKit();
  const { games } = useGames();
  const featured = games.slice(0, 4);
  const [txLoading, setTxLoading] = useState(false);
  const [txResult, setTxResult] = useState("");
  const testTransaction = async () => {
  if (!initiaAddress) { setTxResult("Connect wallet first!"); return; }
  setTxLoading(true);
  setTxResult("");
  try {
    // Step 1 — Auto-sign enable karo pehle (agar nahi hai)
    if (!autoSign?.isEnabledByChain?.[CHAIN_ID]) {
      await autoSign.enable(CHAIN_ID);
    }
    // Step 2 — Transaction karo
    const messages = [{
      typeUrl: "/initia.move.v1.MsgExecute",
      value: {
        sender: initiaAddress,
        moduleAddress: CONTRACT,
        moduleName: "leaderboard",
        functionName: "init_player_stats",
        typeArgs: [],
        args: [],
      },
    }];
    const result = await submitTxBlock({
      messages,
      fee: {
        amount: [{ denom: "uinit", amount: "6000" }],
        gas: "400000",
      },
    });
    setTxResult("✓ TX: " + result.transactionHash.slice(0, 20) + "...");
  } catch (err) {
    setTxResult("✗ " + (err.message || "Transaction failed").slice(0, 80));
  } finally {
    setTxLoading(false);
  }
};
  return (
    <div style={{ position: "relative" }}>
      {/* ── TEST TRANSACTION BUTTON ── */}
      <div style={{
        position: "fixed", bottom: 24, right: 24,
        zIndex: 999, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8,
      }}>
        {txResult && (
          <div style={{
            padding: "8px 14px", borderRadius: 8, fontSize: 11, fontFamily: "monospace",
            background: txResult.startsWith("✓") ? "#0d1f12" : "#1f0d0d",
            border: `0.5px solid ${txResult.startsWith("✓") ? "#1a3a1a" : "#3a1a1a"}`,
            color: txResult.startsWith("✓") ? "#00FF88" : "#ff4444",
            maxWidth: 300, wordBreak: "break-all",
          }}>
            {txResult}
          </div>
        )}
        <button onClick={testTransaction} disabled={txLoading}
          style={{
            padding: "10px 20px",
            background: txLoading ? "#1a1a1a" : "#7B2FFF",
            border: "none", borderRadius: 10,
            color: txLoading ? "#555" : "#fff",
            fontSize: 13, fontWeight: 500,
            cursor: txLoading ? "not-allowed" : "pointer",
            boxShadow: "0 4px 20px rgba(123,47,255,0.3)",
          }}>
          {txLoading ? "Sending..." : "⚡ Test Transaction"}
        </button>
      </div>
      {/* Float animation */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-14px); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.08; transform: scale(1); }
          50% { opacity: 0.15; transform: scale(1.08); }
        }
      `}</style>
      {/* Hero */}
      <div style={{
        padding: "80px 52px 60px",
        display: "grid",
        gridTemplateColumns: "1fr 380px 340px",
        gap: 40,
        alignItems: "center",
        minHeight: 560,
      }}>
        {/* LEFT */}
        <div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "5px 12px", border: "0.5px solid #252525",
            borderRadius: 20, fontSize: 11, color: "#555",
            marginBottom: 28, letterSpacing: "0.5px", textTransform: "uppercase",
          }}>
            <span style={{
              width: 5, height: 5, background: "#00FF88", borderRadius: "50%",
              animation: "glowPulse 2s ease-in-out infinite",
            }} />
            Initia Gaming — Season 1
          </div>
          <h1 style={{
            fontSize: 64, fontWeight: 500, lineHeight: 1.0,
            letterSpacing: "-2px", marginBottom: 24,
          }}>
            Play Games.<br />
            <span style={{ color: "#00FF88" }}>Earn On-Chain.</span><br />
            Own It All.
          </h1>
          <p style={{
            fontSize: 15, color: "#555", lineHeight: 1.7,
            maxWidth: 420, marginBottom: 36,
          }}>
            10 web3 mini games with zero wallet popups. Auto-sign via Ghost Wallet
            means every action happens silently in the background.
          </p>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20 }}>
            <button onClick={() => navigate("/games")}
              style={{ padding: "13px 28px", background: "#00FF88", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 500, color: "#0C0C0C", cursor: "pointer" }}>
              Browse Games
            </button>
            <button onClick={() => navigate("/publish")}
              style={{ padding: "13px 28px", background: "transparent", border: "0.5px solid #2a2a2a", borderRadius: 10, fontSize: 14, color: "#fff", cursor: "pointer" }}>
              Publish Your Game
            </button>
          </div>
          {isConnected && <EnableAutoSign />}
          {!isConnected && (
            <button onClick={openConnect} style={{
              padding: "10px 20px", background: "transparent",
              border: "0.5px solid #2a2a2a", borderRadius: 8,
              color: "#555", fontSize: 13, cursor: "pointer",
            }}>
              Connect wallet to enable auto-sign
            </button>
          )}
        </div>
        {/* CENTER — Robot */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative", height: 480,
        }}>
          <div style={{
            position: "absolute", width: 320, height: 320,
            background: "radial-gradient(circle, rgba(0,255,136,0.12) 0%, transparent 70%)",
            borderRadius: "50%", animation: "glowPulse 3s ease-in-out infinite", pointerEvents: "none",
          }} />
          <img src="/robot_transparent (1).png" alt="Initia Robot"
            style={{ width: "100%", maxWidth: 360, height: "auto", position: "relative", zIndex: 1, filter: "drop-shadow(0 0 32px rgba(0,255,136,0.18))", animation: "float 3.5s ease-in-out infinite" }} />
        </div>
        {/* RIGHT — Stats */}
        <div style={{ border: "0.5px solid #1a1a1a", borderRadius: 14, overflow: "hidden" }}>
          {[
            { label: "Live games", value: games.length || "0", sub: "On Initia testnet", green: true },
            { label: "Total plays today", value: "8,241", sub: "Updating live" },
            { label: "ARCADE tokens earned", value: "2.4M", sub: "Across all players", purple: true },
            { label: "Wallet popups shown", value: "0", sub: "Auto-sign handles everything", green: true },
          ].map((s, i) => (
            <div key={i} style={{ padding: "20px 22px", borderBottom: i < 3 ? "0.5px solid #1a1a1a" : "none" }}>
              <div style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 500, color: s.green ? "#00FF88" : s.purple ? "#7B2FFF" : "#fff" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#444", marginTop: 3 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Featured Games */}
      <div style={{ padding: "0 52px 80px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <h2 style={{ fontSize: 32, fontWeight: 500, letterSpacing: "-0.8px" }}>
            Featured <span style={{ color: "#333" }}>games</span>
          </h2>
          <button onClick={() => navigate("/games")} style={{ fontSize: 12, color: "#444", border: "0.5px solid #1e1e1e", padding: "8px 14px", borderRadius: 8, background: "transparent", cursor: "pointer" }}>
            View all games →
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {featured.map(game => <GameCard key={game.id} game={game} />)}
        </div>
      </div>
      {/* Features */}
      <div style={{ padding: "0 52px 80px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[
          { num: "01", title: "Zero popup gaming", desc: "Ghost Wallet auto-signs every in-game transaction. No interruptions ever.", tag: "Auto-sign via InterwovenKit", tagColor: "#0d1f12", tagText: "#00FF88" },
          { num: "02", title: "Earn while you play", desc: "Every session earns ARCADE tokens on-chain. High scores unlock bonus multipliers.", tag: "Move VM · On-chain rewards", tagColor: "#1a0d2e", tagText: "#7B2FFF" },
          { num: "03", title: "Publish your game", desc: "Built a Unity game? Deploy it here. Earn revenue share from every play session.", tag: "Creator economy", tagColor: "#0d1525", tagText: "#4499ff" },
        ].map(f => (
          <div key={f.num} style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 12, padding: "28px 26px" }}>
            <div style={{ fontSize: 48, fontWeight: 500, letterSpacing: "-2px", color: "#1e1e1e", marginBottom: 14 }}>{f.num}</div>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>{f.title}</div>
            <div style={{ fontSize: 13, color: "#444", lineHeight: 1.65, marginBottom: 14 }}>{f.desc}</div>
            <span style={{ padding: "4px 10px", background: f.tagColor, color: f.tagText, borderRadius: 6, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>{f.tag}</span>
          </div>
        ))}
      </div>
      {/* CTA */}
      <div style={{ margin: "0 52px 80px" }}>
        <div style={{
          background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 16,
          padding: "72px", display: "grid", gridTemplateColumns: "1fr auto",
          gap: 40, alignItems: "center", position: "relative", overflow: "hidden",
        }}>
          <img src="/robot_transparent (1).png" alt="" style={{ position: "absolute", right: 220, top: "100%", transform: "translateY(-50%)", width: 200, opacity: 0.04, pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <h2 style={{ fontSize: 44, fontWeight: 500, letterSpacing: "-1px", lineHeight: 1.1, marginBottom: 14 }}>
              Start playing.<br /><span style={{ color: "#00FF88" }}>Start earning.</span>
            </h2>
            <p style={{ fontSize: 14, color: "#444", maxWidth: 400, lineHeight: 1.7 }}>
              Connect your Initia wallet once. Enable auto-sign. Then just play — no popups, no friction.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 180, position: "relative", zIndex: 1 }}>
            <button onClick={isConnected ? () => navigate("/games") : openConnect}
              style={{ padding: "14px 30px", background: "#00FF88", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 500, color: "#0C0C0C", cursor: "pointer" }}>
              {isConnected ? "Browse Games" : "Connect & Play"}
            </button>
            <button onClick={() => navigate("/publish")}
              style={{ padding: "14px 30px", background: "transparent", border: "0.5px solid #2a2a2a", borderRadius: 10, fontSize: 14, color: "#fff", cursor: "pointer" }}>
              Publish a Game
            </button>
          </div>
        </div>
      </div>
      {/* Footer */}
      <footer style={{ padding: "24px 52px", borderTop: "0.5px solid #151515", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>InitiaArcade</span>
          <span style={{ fontSize: 12, color: "#333" }}>INITIATE Hackathon · Season 1</span>a
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["Initia Rollup", "InterwovenKit", "Move VM", "Auto-Sign"].map(b => (
            <span key={b} style={{ padding: "4px 10px", border: "0.5px solid #1e1e1e", borderRadius: 6, fontSize: 10, color: "#333" }}>{b}</span>
          ))}
        </div>
      </footer>
    </div>
  );
}