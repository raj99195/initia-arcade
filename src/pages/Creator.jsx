import { useState, useEffect } from "react";
import { useInterwovenKit, useUsernameQuery } from "@initia/interwovenkit-react";
import { useAccount } from "wagmi";
import { saveGame, saveCreator, getGamesByCreator, bech32ToHex, registerCreator, getCreatorStatus } from "../lib/gameService";

const CONTRACT = "0xd1aa08d2de31ca1af55682f4185547f92332bee";
const REST = "https://rest.testnet.initia.xyz";
const CHAIN_ID = "initiation-2";

const P = {
  p: "#7B2FFF", p2: "rgba(123,47,255,0.15)", p3: "rgba(123,47,255,0.07)",
  pb: "rgba(123,47,255,0.22)", bg: "#08070f", s1: "#0e0c1a", s2: "#12101f",
  b: "rgba(123,47,255,0.12)", b2: "rgba(123,47,255,0.25)",
  raj: "'Rajdhani',sans-serif", orb: "'Orbitron',sans-serif",
};

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
  combined.set(lenPrefix); combined.set(bytes, lenPrefix.length);
  return combined;
}
function encodeAddress(hexAddr) {
  const hex = hexAddr.replace("0x", "").padStart(64, "0");
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

const statusMap = {
  approved: { bg: "rgba(0,255,136,0.08)", color: "#00FF88", border: "rgba(0,255,136,0.2)", label: "✓ Live" },
  pending:  { bg: "rgba(255,184,0,0.08)", color: "#FFB800", border: "rgba(255,184,0,0.2)", label: "⏳ Pending" },
  rejected: { bg: "rgba(255,68,68,0.08)", color: "#ff4444", border: "rgba(255,68,68,0.2)", label: "✗ Rejected" },
};

function Btn({ children, onClick, disabled, variant = "primary", style = {} }) {
  const base = {
    padding: "10px 20px", border: "none", borderRadius: 7, cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: P.raj, fontWeight: 700, fontSize: 12, letterSpacing: "0.5px",
    textTransform: "uppercase", transition: "all 0.18s", ...style,
  };
  const styles = {
    primary: { background: disabled ? "rgba(123,47,255,0.2)" : "linear-gradient(135deg,#7B2FFF,#5a1fd4)", color: disabled ? "#5533aa" : "#fff" },
    ghost:   { background: "rgba(123,47,255,0.06)", border: "1px solid rgba(123,47,255,0.22)", color: "rgba(200,170,255,0.8)" },
    danger:  { background: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.2)", color: "#ff4444" },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...styles[variant] }}>{children}</button>;
}

function GameModal({ game, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = (text) => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  if (!game) return null;
  const s = statusMap[game.status] || statusMap.pending;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}>
      <div style={{ background: P.s1, border: `1px solid ${P.b2}`, borderRadius: 14, padding: 28, width: "100%", maxWidth: 500, position: "relative", boxShadow: "0 24px 60px rgba(0,0,0,0.8)" }}
        onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "rgba(123,47,255,0.08)", border: "1px solid rgba(123,47,255,0.2)", borderRadius: 6, color: "#a67fff", fontSize: 12, padding: "4px 10px", cursor: "pointer", fontFamily: P.raj, fontWeight: 700 }}>✕ Close</button>

        {game.thumbnailUrl && (
          <div style={{ marginBottom: 18, borderRadius: 8, overflow: "hidden", height: 130 }}>
            <img src={game.thumbnailUrl} alt={game.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ fontFamily: P.raj, fontWeight: 700, fontSize: 18, color: "#fff" }}>{game.name}</div>
          <span style={{ padding: "3px 9px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontFamily: P.raj, letterSpacing: "0.5px" }}>{s.label}</span>
        </div>

        {game.description && <div style={{ fontSize: 12, color: "#5533aa", lineHeight: 1.6, marginBottom: 16, fontFamily: P.raj }}>{game.description}</div>}

        <div style={{ marginBottom: 18 }}>
          {[["Game ID", `#${game.gameId}`], ["Category", game.category], ["Reward Rate", `${game.rewardRate} ARCADE / play`], ["Total Plays", (game.plays||0).toLocaleString()], ["Creator Revenue", "20% of all rewards"]].map(([k,v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "8px 0", borderBottom: `1px solid ${P.b}` }}>
              <span style={{ color: "#5533aa", fontFamily: P.raj }}>{k}</span>
              <span style={{ color: "#c4a0ff", fontFamily: P.raj, fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>

        <div style={{ background: P.bg, border: `1px solid ${P.b}`, borderRadius: 8, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: "#5533aa", marginBottom: 8, textTransform: "uppercase", letterSpacing: "1px", fontFamily: P.raj, fontWeight: 700 }}>Unity Integration</div>
          <div style={{ fontFamily: "monospace", fontSize: 11, color: "#9977cc", marginBottom: 8 }}>
            Application.ExternalCall("arcade_init", "{game.gameId}");
          </div>
          <button onClick={() => copy(`Application.ExternalCall("arcade_init", "${game.gameId}");`)}
            style={{ padding: "4px 12px", background: copied ? "rgba(0,255,136,0.08)" : "rgba(123,47,255,0.08)", border: `1px solid ${copied ? "rgba(0,255,136,0.2)" : P.b2}`, borderRadius: 5, color: copied ? "#00FF88" : "#a67fff", fontSize: 10, cursor: "pointer", fontFamily: P.raj, fontWeight: 700 }}>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        {game.txHash && (
          <a href={`https://scan.testnet.initia.xyz/initiation-2/txs/${game.txHash}`} target="_blank" rel="noreferrer"
            style={{ display: "block", textAlign: "center", padding: "10px", background: "rgba(123,47,255,0.08)", border: `1px solid ${P.b2}`, borderRadius: 8, color: "#a67fff", fontSize: 11, textDecoration: "none", fontFamily: P.raj, fontWeight: 700 }}>
            View on Initia Explorer →
          </a>
        )}
      </div>
    </div>
  );
}

// ─── GATE SCREENS ────────────────────────────────────────
function GateScreen({ icon, title, accent, sub, children }) {
  return (
    <div style={{ minHeight: "calc(100vh - 54px)", background: P.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 480, width: "100%" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: P.p2, border: `1px solid ${P.pb}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, margin: "0 auto 24px", boxShadow: "0 0 30px rgba(123,47,255,0.2)" }}>
          {icon}
        </div>
        <h2 style={{ fontFamily: P.raj, fontWeight: 700, fontSize: 32, textTransform: "uppercase", letterSpacing: "-0.3px", marginBottom: 10, color: "#fff" }}>
          {title} {accent && <span style={{ background: "linear-gradient(90deg,#7B2FFF,#00d4ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{accent}</span>}
        </h2>
        <p style={{ color: "#5533aa", fontSize: 13, marginBottom: 28, lineHeight: 1.75, fontFamily: P.raj }}>{sub}</p>
        {children}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────
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
  const [creatorStatus, setCreatorStatus] = useState(null);
  const [creatorLoading, setCreatorLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [form, setForm] = useState({ name: "", description: "", iframeUrl: "", thumbnailUrl: "", category: "Action", rewardRate: "50" });

  const categories = ["Action", "Runner", "Strategy", "Puzzle", "Casual", "Shooter", "Adventure","Simulation / Idle Tycoon","Music / Rhythm"];
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const validateUrl = (url) => { try { new URL(url); return true; } catch { return false; } };

  const checkCreatorStatus = async () => {
    if (!initiaAddress) return;
    setCreatorLoading(true);
    try {
      const status = await getCreatorStatus(initiaAddress);
      if (status) {
        setCreatorStatus(status.status);
        if (status.status === "pending" && status.registeredAt) {
          const registeredAt = status.registeredAt.toDate?.() || new Date(status.registeredAt);
          const approveAt = new Date(registeredAt.getTime() + 2 * 60 * 60 * 1000);
          const diff = approveAt - new Date();
          if (diff > 0) {
            const hours = Math.floor(diff / (1000*60*60));
            const mins = Math.floor((diff % (1000*60*60)) / (1000*60));
            setTimeLeft(`${hours}h ${mins}m`);
          } else setCreatorStatus("approved");
        }
      } else setCreatorStatus(null);
    } catch(err) { console.error(err); }
    finally { setCreatorLoading(false); }
  };

  useEffect(() => { if (initiaAddress) checkCreatorStatus(); }, [initiaAddress]);
  useEffect(() => {
    if (creatorStatus === "pending") {
      const i = setInterval(checkCreatorStatus, 60000);
      return () => clearInterval(i);
    }
  }, [creatorStatus]);

  const registerAsCreator = async () => {
    if (!initiaAddress || !displayName) return;
    setRegisterLoading(true);
    try {
      if (!autoSign?.isEnabledByChain?.[CHAIN_ID]) await autoSign.enable(CHAIN_ID);
      await submitTxBlock({ messages: [{ typeUrl: "/initia.move.v1.MsgExecute", value: { sender: initiaAddress, moduleAddress: CONTRACT, moduleName: "platform", functionName: "init_creator", typeArgs: [], args: [] } }], fee: { amount: [{ denom: "uinit", amount: "6000" }], gas: "400000" } });
      await registerCreator({ address: initiaAddress, displayName: displayName || "" });
      setCreatorStatus("pending");
    } catch(err) { console.error(err); }
    finally { setRegisterLoading(false); }
  };

  const fetchMyGames = async () => {
    if (!initiaAddress) return;
    setGamesLoading(true);
    try { setMyGames(await getGamesByCreator(initiaAddress)); } catch(err) { console.error(err); }
    finally { setGamesLoading(false); }
  };
 // 👇 NEW (ye add karna hai)
useEffect(() => {
  if (initiaAddress) {
    fetchMyGames();
  }
}, [initiaAddress]);
  useEffect(() => { if (initiaAddress && (creatorStatus === "approved" || creatorStatus === "pending")) fetchMyGames(); }, [initiaAddress, creatorStatus]);

  const fetchAndInitArcade = async () => {
    if (!initiaAddress) return;
    setArcadeLoading(true);
    try {
      const hexAddr = bech32ToHex(initiaAddress);
      const res = await fetch(`${REST}/initia/move/v1/accounts/${hexAddr}/resources`);
      const data = await res.json();
      const r = data?.resources?.find(r => r.struct_tag === `${CONTRACT}::arcade_token::ArcadeBalance`);
      if (r) { const p = JSON.parse(r.move_resource); setArcadeBalance(p?.data?.amount || "0"); }
      else {
        if (!autoSign?.isEnabledByChain?.[CHAIN_ID]) await autoSign.enable(CHAIN_ID);
        await submitTxBlock({ messages: [{ typeUrl: "/initia.move.v1.MsgExecute", value: { sender: initiaAddress, moduleAddress: CONTRACT, moduleName: "arcade_token", functionName: "init_player", typeArgs: [], args: [] } }], fee: { amount: [{ denom: "uinit", amount: "6000" }], gas: "400000" } });
        setArcadeBalance("0");
      }
    } catch(err) { console.error(err); }
    finally { setArcadeLoading(false); }
  };

  const submitGame = async () => {
    if (!form.name || !form.iframeUrl || !form.description) { setError("Fill in all required fields."); return; }
    if (!validateUrl(form.iframeUrl)) { setError("Enter a valid game URL."); return; }
    if (form.thumbnailUrl && !validateUrl(form.thumbnailUrl)) { setError("Thumbnail URL is invalid."); return; }
    setError(""); setLoading(true);
    try {
      const { getTotalGamesCount } = await import("../lib/gameService");
      const assignedGameId = (await getTotalGamesCount()) + 1;
      const result = await requestTxBlock({ messages: [{ typeUrl: "/initia.move.v1.MsgExecute", value: { sender: initiaAddress, moduleAddress: CONTRACT, moduleName: "platform", functionName: "register_game", typeArgs: [], args: [encodeAddress(CONTRACT), encodeString(form.name), encodeString(form.iframeUrl), encodeU64(parseInt(form.rewardRate)||50)] } }] });
      await saveGame({ gameId: assignedGameId, name: form.name, description: form.description, iframeUrl: form.iframeUrl, thumbnailUrl: form.thumbnailUrl||"", category: form.category, rewardRate: form.rewardRate, creator: initiaAddress, txHash: result.transactionHash });
      await saveCreator({ address: initiaAddress, displayName: displayName||"" });
      setNewGameId(assignedGameId); setTxHash(result.transactionHash);
      await fetchMyGames(); setStep(3);
    } catch(err) { setError("Transaction failed: " + err.message); }
    finally { setLoading(false); }
  };

  const totalEarned = myGames.reduce((sum, g) => sum + (g.earned || 0), 0);

  const inputStyle = {
    width: "100%", padding: "11px 14px",
    background: "rgba(123,47,255,0.06)",
    border: `1px solid ${P.b}`,
    borderRadius: 7, color: "#d4b8ff", fontSize: 13,
    outline: "none", boxSizing: "border-box",
    fontFamily: P.raj, transition: "border-color 0.18s",
  };
  const labelStyle = { fontSize: 10, color: "#7755aa", display: "block", marginBottom: 6, fontFamily: P.raj, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" };

  // ── STATE 1: Not connected
  if (!isConnected) return (
    <GateScreen icon="🎮" title="Creator" accent="Dashboard" sub="Connect your Initia wallet to publish games and earn ARCADE tokens.">
      <div style={{ background: P.s1, border: `1px solid ${P.b}`, borderRadius: 10, padding: 16, fontSize: 12, color: "#5533aa", fontFamily: P.raj }}>
        Use the "Connect Wallet" button in the navbar to get started.
      </div>
    </GateScreen>
  );

  // ── STATE 2: No .init username
  if (!usernameLoading && !displayName) return (
    <GateScreen icon="👤" title="Set Your" accent="Username First" sub="You need an .init username to become a creator on Initia Arcade. This is your on-chain identity!">
      <a href="https://app.testnet.initia.xyz/usernames" target="_blank" rel="noreferrer"
        style={{ display: "inline-block", padding: "12px 28px", background: "linear-gradient(135deg,#7B2FFF,#5a1fd4)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none", fontFamily: P.raj, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 14 }}>
        Get .init Username →
      </a>
      <div style={{ fontSize: 11, color: "#3a2a5a", fontFamily: P.raj }}>After setting your username, come back and refresh.</div>
    </GateScreen>
  );

  // ── STATE 3: Not registered
  if (creatorStatus === null && !creatorLoading) return (
    <GateScreen icon="🚀" title="Become a" accent="Creator" sub="Register as a game creator on InitiaArcade. Publish your games and earn 20% revenue from every play!">
      <div style={{ background: P.s1, border: `1px solid ${P.b}`, borderRadius: 10, padding: 20, marginBottom: 20, textAlign: "left" }}>
        <div style={{ fontSize: 9, color: "#5533aa", textTransform: "uppercase", letterSpacing: "1.5px", fontFamily: P.raj, fontWeight: 700, marginBottom: 14 }}>Creator Benefits</div>
        {[
          ["💰", "Earn 20% Revenue", "Every time someone plays your game"],
          ["🎮", "Publish Games", "Deploy Unity WebGL games to our platform"],
          ["📊", "Track Analytics", "See plays, earnings, and player stats"],
          ["⛓️", "On-Chain Identity", "Your creator profile lives on Initia blockchain"],
        ].map(([icon, title, desc]) => (
          <div key={title} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#c4a0ff", fontFamily: P.raj, marginBottom: 2 }}>{title}</div>
              <div style={{ fontSize: 11, color: "#5533aa", fontFamily: P.raj }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: "rgba(123,47,255,0.06)", border: `1px solid ${P.b}`, borderRadius: 8, padding: 12, marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: P.p2, border: `1px solid ${P.pb}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👤</div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#c4a0ff", fontFamily: P.raj }}>{displayName}</div>
          <div style={{ fontSize: 10, color: "#5533aa", fontFamily: "monospace" }}>{initiaAddress?.slice(0,20)}...</div>
        </div>
      </div>
      <button onClick={registerAsCreator} disabled={registerLoading} style={{
        width: "100%", padding: "13px",
        background: registerLoading ? "rgba(123,47,255,0.2)" : "linear-gradient(135deg,#7B2FFF,#5a1fd4)",
        border: "none", borderRadius: 8, color: registerLoading ? "#5533aa" : "#fff",
        fontSize: 13, fontWeight: 700, cursor: registerLoading ? "not-allowed" : "pointer",
        fontFamily: P.raj, letterSpacing: "1px", textTransform: "uppercase", transition: "all 0.18s",
      }}>
        {registerLoading ? "Registering on blockchain..." : "🚀 Register as Creator"}
      </button>
    </GateScreen>
  );

  // ── STATE 4: Pending
  if (creatorStatus === "pending") return (
    <GateScreen icon="⏳" title="Approval" accent="Pending" sub="Your creator account is being reviewed. This typically takes 1-2 hours. Your dashboard unlocks automatically!">
      <div style={{ background: "rgba(255,184,0,0.07)", border: "1px solid rgba(255,184,0,0.18)", borderRadius: 10, padding: 20, marginBottom: 18 }}>
        <div style={{ fontSize: 9, color: "#FFB800", textTransform: "uppercase", letterSpacing: "1.5px", fontFamily: P.raj, fontWeight: 700, marginBottom: 6 }}>Time Remaining</div>
        <div style={{ fontSize: 36, fontWeight: 700, color: "#FFB800", fontFamily: P.orb, letterSpacing: "-1px" }}>{timeLeft || "Calculating..."}</div>
      </div>
      <div style={{ background: P.s1, border: `1px solid ${P.b}`, borderRadius: 10, padding: 16, marginBottom: 16, textAlign: "left" }}>
        <div style={{ fontSize: 10, color: "#5533aa", marginBottom: 10, textTransform: "uppercase", letterSpacing: "1px", fontFamily: P.raj, fontWeight: 700 }}>While you wait:</div>
        {["Build your Unity WebGL game", "Set up your game thumbnail", "Prepare your game description"].map((t,i) => (
          <div key={i} style={{ display: "flex", gap: 8, fontSize: 12, color: "#7755aa", marginBottom: 7, fontFamily: P.raj }}>
            <span style={{ color: "#a67fff" }}>→</span><span>{t}</span>
          </div>
        ))}
      </div>
      <Btn onClick={checkCreatorStatus} disabled={creatorLoading} variant="ghost">
        {creatorLoading ? "Checking..." : "↻ Check Status"}
      </Btn>
    </GateScreen>
  );

  // ── Loading
  if (creatorLoading) return (
    <div style={{ minHeight: "calc(100vh - 54px)", background: P.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 11, color: "#5533aa", fontFamily: P.raj, textTransform: "uppercase", letterSpacing: "2px" }}>Checking creator status...</div>
    </div>
  );

  // ── STATE 5: APPROVED — Full Dashboard
  return (
    <div style={{ minHeight: "calc(100vh - 54px)", background: P.bg, padding: "28px 36px" }}>

      <style>{`
        @keyframes lbPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        .cr-input:focus { border-color: rgba(123,47,255,0.45) !important; }
        .cr-input::placeholder { color: #3a2a5a; }
        .cr-select option { background: #0e0c1a; color: #d4b8ff; }
        .cr-tab:hover { color: #c4a0ff !important; }
        .game-card-cr:hover { border-color: rgba(123,47,255,0.35) !important; transform: translateY(-2px); }
      `}</style>

      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 11px", border: `1px solid ${P.pb}`, borderRadius: 4, fontSize: 9, color: "rgba(200,170,255,0.6)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 14, background: P.p3, fontFamily: P.raj, fontWeight: 600 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00FF88", animation: "lbPulse 1.5s ease-in-out infinite" }} />
            Creator Hub · Initia-Arcade
          </div>
          <h1 style={{ fontFamily: P.raj, fontWeight: 700, fontSize: 36, textTransform: "uppercase", letterSpacing: "-0.3px", color: "#fff", marginBottom: 6 }}>
            Creator{" "}
            <span style={{ background: "linear-gradient(90deg,#7B2FFF,#00d4ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Dashboard</span>
          </h1>
          <p style={{ color: "#5533aa", fontSize: 12, fontFamily: P.raj }}>Manage your published games, track earnings, and publish new games.</p>
        </div>

        {/* Profile card */}
        <div style={{ background: P.s1, border: `1px solid ${P.b2}`, borderRadius: 12, padding: "16px 22px", marginBottom: 22, display: "flex", alignItems: "center", gap: 16, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 150, height: 150, background: "radial-gradient(circle, rgba(123,47,255,0.12) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(135deg,#7B2FFF,#00d4ff)", border: `2px solid ${P.pb}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0, boxShadow: "0 0 16px rgba(123,47,255,0.35)" }}>🎮</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <div style={{ fontFamily: P.raj, fontWeight: 700, fontSize: 15, color: "#c4a0ff" }}>{displayName}</div>
              <span style={{ fontSize: 9, color: "#00FF88", background: "rgba(0,255,136,0.08)", padding: "2px 7px", borderRadius: 3, border: "1px solid rgba(0,255,136,0.15)", fontFamily: P.raj, fontWeight: 700 }}>verified ✓</span>
            </div>
            <div style={{ fontSize: 10, color: "#3a2a5a", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{initiaAddress}</div>
          </div>
          <div style={{ display: "flex", flexShrink: 0, gap: 0 }}>
            {[
              { label: "Games", value: myGames.length, color: "#a67fff" },
              { label: "Earned", value: totalEarned.toLocaleString() + " ARCADE", color: "#7B2FFF" },
            ].map((s, i) => (
              <div key={s.label} style={{ textAlign: "center", padding: "8px 20px", borderLeft: i > 0 ? `1px solid ${P.b}` : "none" }}>
                <div style={{ fontFamily: P.raj, fontWeight: 700, fontSize: 20, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 9, color: "#5533aa", marginTop: 2, fontFamily: P.raj, textTransform: "uppercase", letterSpacing: "0.8px" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: `1px solid ${P.b}` }}>
          {[
            { id: "my-games", label: `My Games (${myGames.length})` },
            { id: "earnings", label: "Earnings & Revenue" },
            { id: "submit", label: "+ Submit New Game" },
          ].map(t => (
            <button key={t.id} className="cr-tab" onClick={() => { setActiveTab(t.id); setStep(1); setError(""); }} style={{
              padding: "10px 22px", background: "transparent", border: "none",
              borderBottom: activeTab === t.id ? "2px solid #7B2FFF" : "2px solid transparent",
              color: activeTab === t.id ? "#c4a0ff" : "#3a2a5a",
              fontSize: 12, cursor: "pointer", marginBottom: "-1px",
              fontFamily: P.raj, fontWeight: 700, letterSpacing: "0.5px",
              textTransform: "uppercase", transition: "color 0.18s",
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── MY GAMES TAB ── */}
        {activeTab === "my-games" && (
          <div>
            {gamesLoading ? (
              <div style={{ padding: 48, textAlign: "center", fontSize: 11, color: "#5533aa", fontFamily: P.raj, textTransform: "uppercase", letterSpacing: "2px" }}>Loading from database...</div>
            ) : myGames.length === 0 ? (
              <div style={{ padding: 56, textAlign: "center" }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: P.p2, border: `1px solid ${P.pb}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 16px" }}>🎮</div>
                <div style={{ fontFamily: P.raj, fontWeight: 700, fontSize: 16, color: "#c4a0ff", marginBottom: 6 }}>No games yet</div>
                <div style={{ fontSize: 12, color: "#5533aa", marginBottom: 20, fontFamily: P.raj }}>Submit your first game to get started</div>
                <Btn onClick={() => setActiveTab("submit")}>Submit Your First Game →</Btn>
              </div>
            ) : (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                  {myGames.map(game => {
                    const s = statusMap[game.status] || statusMap.pending;
                    return (
                      <div key={game.id} className="game-card-cr" onClick={() => setSelectedGame(game)} style={{
                        background: P.s1, border: `1px solid ${P.b}`, borderRadius: 10,
                        overflow: "hidden", cursor: "pointer", transition: "all 0.2s",
                      }}>
                        <div style={{ height: 110, background: "#0a0818", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, position: "relative", overflow: "hidden" }}>
                          {game.thumbnailUrl
                            ? <img src={game.thumbnailUrl} alt={game.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display="none"; }} />
                            : <span style={{ filter: "drop-shadow(0 0 10px rgba(123,47,255,0.4))" }}>🎮</span>
                          }
                          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "50%", background: "linear-gradient(to top, rgba(14,12,26,0.9), transparent)", pointerEvents: "none" }} />
                          <span style={{ position: "absolute", top: 8, left: 8, padding: "3px 8px", borderRadius: 4, fontSize: 8, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontFamily: P.raj, letterSpacing: "0.5px" }}>{s.label}</span>
                        </div>
                        <div style={{ padding: "10px 12px" }}>
                          <div style={{ fontFamily: P.raj, fontWeight: 700, fontSize: 13, color: "#d4b8ff", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.name}</div>
                          <div style={{ fontSize: 9, color: "#5533aa", marginBottom: 8, fontFamily: P.raj }}>Game #{game.gameId} · {game.category}</div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 9, color: "#5533aa", fontFamily: P.raj }}>{(game.plays||0).toLocaleString()} plays</span>
                            <span style={{ fontSize: 9, color: "#a67fff", fontFamily: P.orb, fontWeight: 600 }}>{game.earned||0} ARCADE</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {/* Add new tile */}
                  <div onClick={() => setActiveTab("submit")} style={{
                    background: "transparent", border: `1px dashed rgba(123,47,255,0.18)`, borderRadius: 10,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    minHeight: 180, gap: 8, cursor: "pointer", transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = P.p3; e.currentTarget.style.borderColor = "rgba(123,47,255,0.35)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(123,47,255,0.18)"; }}
                  >
                    <div style={{ fontSize: 24, color: "rgba(123,47,255,0.3)", fontFamily: P.raj, fontWeight: 700 }}>+</div>
                    <div style={{ fontSize: 10, color: "#5533aa", fontFamily: P.raj, textTransform: "uppercase", letterSpacing: "1px" }}>Submit New Game</div>
                  </div>
                </div>
                <div style={{ marginTop: 10, padding: 12, background: "rgba(123,47,255,0.05)", border: `1px solid ${P.b}`, borderRadius: 8, fontSize: 11, color: "#5533aa", fontFamily: P.raj }}>
                  Approval typically takes 24–48 hours. Click any game card to view details.
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── EARNINGS TAB ── */}
        {activeTab === "earnings" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              {[
                { label: "Total Earned", value: totalEarned.toLocaleString() + " ARCADE", color: "#7B2FFF" },
                { label: "Claimable Now", value: totalEarned.toLocaleString() + " ARCADE", color: "#00FF88" },
                { label: "Games Published", value: myGames.length, color: "#00d4ff" },
              ].map(s => (
                <div key={s.label} style={{ background: P.s1, border: `1px solid ${P.b}`, borderRadius: 10, padding: "16px 18px", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, background: `radial-gradient(circle, ${s.color}18 0%, transparent 70%)`, borderRadius: "50%", pointerEvents: "none" }} />
                  <div style={{ fontFamily: P.raj, fontWeight: 700, fontSize: 22, color: s.color, marginBottom: 4 }}>{s.value}</div>
                  <div style={{ fontSize: 9, color: "#5533aa", fontFamily: P.raj, textTransform: "uppercase", letterSpacing: "1px" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* ARCADE Balance */}
            <div style={{ background: P.s1, border: `1px solid ${P.b}`, borderRadius: 10, padding: 20 }}>
              <div style={{ fontFamily: P.raj, fontWeight: 700, fontSize: 14, color: "#c4a0ff", marginBottom: 4 }}>ARCADE Token Balance</div>
              <div style={{ fontSize: 11, color: "#5533aa", marginBottom: 16, fontFamily: P.raj }}>Your real-time on-chain ARCADE balance.</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: P.bg, borderRadius: 8, border: `1px solid ${P.b}` }}>
                <div>
                  <div style={{ fontSize: 9, color: "#5533aa", marginBottom: 4, fontFamily: P.raj, textTransform: "uppercase", letterSpacing: "1px" }}>On-chain balance</div>
                  <div style={{ fontFamily: P.raj, fontWeight: 700, fontSize: 26, color: "#a67fff" }}>
                    {arcadeBalance !== null ? `${Number(arcadeBalance).toLocaleString()} ARCADE` : "—"}
                  </div>
                </div>
                <Btn onClick={fetchAndInitArcade} disabled={arcadeLoading}>
                  {arcadeLoading ? "Fetching..." : arcadeBalance !== null ? "↻ Refresh" : "Fetch Balance"}
                </Btn>
              </div>
            </div>

            {/* Revenue Split */}
            <div style={{ background: P.s1, border: `1px solid ${P.b}`, borderRadius: 10, padding: 20 }}>
              <div style={{ fontFamily: P.raj, fontWeight: 700, fontSize: 14, color: "#c4a0ff", marginBottom: 14 }}>Revenue Split</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 18 }}>
                {[
                  { label: "Player", pct: "80%", color: "#00FF88", desc: "Goes to player wallet" },
                  { label: "Creator (You)", pct: "20%", color: "#7B2FFF", desc: "Your earnings per play" },
                  { label: "Platform", pct: "0%", color: "#00d4ff", desc: "Protocol maintenance" },
                ].map(r => (
                  <div key={r.label} style={{ background: P.bg, borderRadius: 8, padding: 14, textAlign: "center" }}>
                    <div style={{ fontFamily: P.raj, fontWeight: 700, fontSize: 26, color: r.color, marginBottom: 4 }}>{r.pct}</div>
                    <div style={{ fontSize: 11, color: "#c4a0ff", marginBottom: 3, fontFamily: P.raj, fontWeight: 700 }}>{r.label}</div>
                    <div style={{ fontSize: 10, color: "#5533aa", fontFamily: P.raj }}>{r.desc}</div>
                  </div>
                ))}
              </div>
              {myGames.length > 0 && (
                <div>
                  <div style={{ fontSize: 9, color: "#5533aa", marginBottom: 10, textTransform: "uppercase", letterSpacing: "1px", fontFamily: P.raj, fontWeight: 700 }}>Per Game Breakdown</div>
                  {myGames.map(game => (
                    <div key={game.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${P.b}` }}>
                      <div>
                        <div style={{ fontFamily: P.raj, fontWeight: 700, fontSize: 13, color: "#c4a0ff" }}>{game.name}</div>
                        <div style={{ fontSize: 10, color: "#5533aa", marginTop: 2, fontFamily: P.raj }}>Game #{game.gameId} · {game.plays||0} plays · {game.category}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: P.raj, fontWeight: 700, fontSize: 14, color: "#a67fff" }}>{game.earned||0} ARCADE</div>
                        <div style={{ fontSize: 9, color: "#5533aa", marginTop: 2, fontFamily: P.raj }}>earned</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Claim Revenue */}
            <div style={{ background: P.s1, border: `1px solid ${P.b}`, borderRadius: 10, padding: 20 }}>
              <div style={{ fontFamily: P.raj, fontWeight: 700, fontSize: 14, color: "#c4a0ff", marginBottom: 4 }}>Claim Revenue</div>
              <div style={{ fontSize: 11, color: "#5533aa", marginBottom: 16, fontFamily: P.raj }}>Withdraw your earned ARCADE tokens to your wallet.</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: P.bg, borderRadius: 8, border: `1px solid ${P.b}`, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 9, color: "#5533aa", marginBottom: 4, fontFamily: P.raj, textTransform: "uppercase", letterSpacing: "1px" }}>Claimable balance</div>
                  <div style={{ fontFamily: P.raj, fontWeight: 700, fontSize: 24, color: "#a67fff" }}>{totalEarned.toLocaleString()} ARCADE</div>
                </div>
                <Btn onClick={() => { setClaimLoading(true); setTimeout(() => { setClaimLoading(false); setClaimMsg("Contract update pending — coming soon!"); }, 1000); }} disabled={claimLoading || totalEarned === 0}>
                  {claimLoading ? "Processing..." : "Claim Tokens"}
                </Btn>
              </div>
              {claimMsg && <div style={{ padding: 10, background: "rgba(123,47,255,0.06)", border: `1px solid ${P.b}`, borderRadius: 7, fontSize: 11, color: "#a67fff", marginBottom: 10, fontFamily: P.raj }}>{claimMsg}</div>}
              <div style={{ padding: 10, background: "rgba(255,184,0,0.06)", border: "1px solid rgba(255,184,0,0.15)", borderRadius: 7, fontSize: 11, color: "#FFB800", fontFamily: P.raj }}>
                ⚠ Claim functionality requires a contract update — coming soon!
              </div>
            </div>
          </div>
        )}

        {/* ── SUBMIT TAB ── */}
        {activeTab === "submit" && (
          <div>
            {/* Stepper */}
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              {[{ n: 1, label: "Game Details" }, { n: 2, label: "Review & Submit" }, { n: 3, label: "Published!" }].map(s => (
                <div key={s.n} style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: `1px solid ${step === s.n ? "rgba(123,47,255,0.4)" : step > s.n ? "rgba(0,255,136,0.15)" : P.b}`, background: step === s.n ? P.p3 : "transparent", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 20, height: 20, borderRadius: "50%", background: step >= s.n ? (step > s.n ? "rgba(0,255,136,0.2)" : "#7B2FFF") : "rgba(123,47,255,0.1)", border: `1px solid ${step >= s.n ? (step > s.n ? "rgba(0,255,136,0.3)" : "#7B2FFF") : P.b}`, color: step >= s.n ? (step > s.n ? "#00FF88" : "#fff") : "#5533aa", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: P.raj }}>
                    {step > s.n ? "✓" : s.n}
                  </span>
                  <span style={{ fontSize: 11, color: step === s.n ? "#c4a0ff" : "#5533aa", fontFamily: P.raj, fontWeight: 700, letterSpacing: "0.3px" }}>{s.label}</span>
                </div>
              ))}
            </div>

            {step === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 600 }}>
                {[
                  { name: "name", label: "Game Name", required: true, placeholder: "e.g. Pixel Runner" },
                  { name: "description", label: "Description", required: true, placeholder: "Describe your game...", textarea: true },
                ].map(f => (
                  <div key={f.name}>
                    <label style={labelStyle}>{f.label} {f.required && <span style={{ color: "#ff4444" }}>*</span>}</label>
                    {f.textarea
                      ? <textarea name={f.name} value={form[f.name]} onChange={handleChange} placeholder={f.placeholder} rows={3} className="cr-input" style={{ ...inputStyle, resize: "vertical" }} />
                      : <input name={f.name} value={form[f.name]} onChange={handleChange} placeholder={f.placeholder} className="cr-input" style={inputStyle} />
                    }
                  </div>
                ))}
                <div>
                  <label style={labelStyle}>Game URL <span style={{ color: "#ff4444" }}>*</span></label>
                  <input name="iframeUrl" value={form.iframeUrl} onChange={handleChange} placeholder="https://username.github.io/my-game" className="cr-input"
                    style={{ ...inputStyle, borderColor: form.iframeUrl ? (validateUrl(form.iframeUrl) ? "rgba(0,255,136,0.25)" : "rgba(255,68,68,0.25)") : P.b }} />
                </div>
                <div>
                  <label style={labelStyle}>Thumbnail URL <span style={{ color: "#3a2a5a" }}>Optional</span></label>
                  <input name="thumbnailUrl" value={form.thumbnailUrl} onChange={handleChange} placeholder="https://i.imgur.com/abc123.jpg" className="cr-input"
                    style={{ ...inputStyle, borderColor: form.thumbnailUrl ? (validateUrl(form.thumbnailUrl) ? "rgba(0,255,136,0.25)" : "rgba(255,68,68,0.25)") : P.b }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Category</label>
                    <select name="category" value={form.category} onChange={handleChange} className="cr-input cr-select" style={inputStyle}>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Reward Rate (ARCADE)</label>
                    <input name="rewardRate" value={form.rewardRate} onChange={handleChange} type="number" min="10" max="500" className="cr-input" style={inputStyle} />
                  </div>
                </div>
                {error && <div style={{ padding: 10, background: "rgba(255,68,68,0.07)", border: "1px solid rgba(255,68,68,0.2)", borderRadius: 7, color: "#ff4444", fontSize: 11, fontFamily: P.raj }}>{error}</div>}
                <Btn onClick={() => {
                  if (!form.name || !form.iframeUrl || !form.description) { setError("Please fill in all required fields."); return; }
                  if (!validateUrl(form.iframeUrl)) { setError("Please enter a valid game URL."); return; }
                  setError(""); setStep(2);
                }} style={{ alignSelf: "flex-start", padding: "12px 28px" }}>
                  Continue to Review →
                </Btn>
              </div>
            )}

            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 600 }}>
                <div style={{ background: P.s1, border: `1px solid ${P.b}`, borderRadius: 10, padding: 20 }}>
                  <div style={{ fontFamily: P.raj, fontWeight: 700, fontSize: 14, color: "#c4a0ff", marginBottom: 16 }}>Review your submission</div>
                  {[["Game Name", form.name], ["Description", form.description], ["Game URL", form.iframeUrl], ["Category", form.category], ["Reward Rate", `${form.rewardRate} ARCADE per play`], ["Creator", displayName || initiaAddress]].map(([k,v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "8px 0", borderBottom: `1px solid ${P.b}` }}>
                      <span style={{ color: "#5533aa", minWidth: 130, fontFamily: P.raj }}>{k}</span>
                      <span style={{ color: "#c4a0ff", textAlign: "right", wordBreak: "break-all", fontFamily: P.raj, fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>
                {error && <div style={{ padding: 10, background: "rgba(255,68,68,0.07)", border: "1px solid rgba(255,68,68,0.2)", borderRadius: 7, color: "#ff4444", fontSize: 11, fontFamily: P.raj }}>{error}</div>}
                <div style={{ display: "flex", gap: 10 }}>
                  <Btn onClick={() => setStep(1)} variant="ghost" style={{ flex: 1 }}>← Back</Btn>
                  <Btn onClick={submitGame} disabled={loading} style={{ flex: 2 }}>
                    {loading ? "Submitting to blockchain..." : "Submit Game 🚀"}
                  </Btn>
                </div>
              </div>
            )}

            {step === 3 && (
              <div style={{ textAlign: "center", padding: "40px 0", maxWidth: 500, margin: "0 auto" }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, margin: "0 auto 20px" }}>🎉</div>
                <h2 style={{ fontFamily: P.raj, fontWeight: 700, fontSize: 28, textTransform: "uppercase", marginBottom: 10, color: "#fff" }}>
                  Game{" "}
                  <span style={{ background: "linear-gradient(90deg,#7B2FFF,#00d4ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Submitted!</span>
                </h2>
                <p style={{ color: "#5533aa", fontSize: 12, maxWidth: 380, margin: "0 auto 24px", lineHeight: 1.75, fontFamily: P.raj }}>
                  Your game is now in the review queue. Once approved, it will go live on InitiaArcade.
                </p>
                {newGameId && (
                  <div style={{ background: P.s1, border: `1px solid ${P.b2}`, borderRadius: 10, padding: 18, marginBottom: 12 }}>
                    <div style={{ fontSize: 9, color: "#5533aa", textTransform: "uppercase", letterSpacing: "1.5px", fontFamily: P.raj, fontWeight: 700, marginBottom: 6 }}>Your Game ID</div>
                    <div style={{ fontFamily: P.orb, fontWeight: 700, fontSize: 32, color: "#a67fff", marginBottom: 10, letterSpacing: "-1px" }}>#{newGameId}</div>
                    <div style={{ fontFamily: "monospace", fontSize: 11, color: "#9977cc", background: P.bg, padding: "8px 12px", borderRadius: 6, border: `1px solid ${P.b}` }}>
                      Application.ExternalCall("arcade_init", "{newGameId}");
                    </div>
                  </div>
                )}
                {txHash && (
                  <div style={{ background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.15)", borderRadius: 8, padding: 14, marginBottom: 20 }}>
                    <div style={{ fontSize: 9, color: "#00FF88", marginBottom: 5, textTransform: "uppercase", letterSpacing: "1px", fontFamily: P.raj, fontWeight: 700 }}>Transaction confirmed ✓</div>
                    <div style={{ fontSize: 9, color: "#5533aa", wordBreak: "break-all", fontFamily: "monospace" }}>{txHash}</div>
                  </div>
                )}
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  <Btn onClick={() => { setActiveTab("my-games"); setStep(1); setForm({ name:"", description:"", iframeUrl:"", thumbnailUrl:"", category:"Action", rewardRate:"50" }); setTxHash(""); setNewGameId(null); }}>
                    View My Games →
                  </Btn>
                  <Btn onClick={() => { setStep(1); setForm({ name:"", description:"", iframeUrl:"", thumbnailUrl:"", category:"Action", rewardRate:"50" }); setTxHash(""); setNewGameId(null); }} variant="ghost">
                    Submit Another
                  </Btn>
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
