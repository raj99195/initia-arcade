import { useState, useEffect } from "react";
import { useInterwovenKit } from "@initia/interwovenkit-react";
import { useAccount } from "wagmi";
import { getAllGames, approveGameInFirebase, rejectGameInFirebase } from "../lib/gameService";

const CONTRACT = "0xd1aa08d2de31ca1af55682f4185547f92332bee";
const ADMIN = "init1amxedetgfud5nsnht7kmuh0xajcp9uktclq7sh";

function encodeU64(value) {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setBigUint64(0, BigInt(value), true);
  return new Uint8Array(buf);
}

// Game Preview Modal
function GamePreviewModal({ game, onClose, onApprove, onReject, loading }) {
  if (!game) return null;

  const statusStyle = {
    approved: { bg: "#0d1f12", color: "#00FF88", border: "#1a3a1a", label: "✓ Approved" },
    pending:  { bg: "#1f1a0d", color: "#FFB800", border: "#3a2a1a", label: "⏳ Pending" },
    rejected: { bg: "#1f0d0d", color: "#ff4444", border: "#3a1a1a", label: "✗ Rejected" },
  }[game.status] || { bg: "#1f1a0d", color: "#FFB800", border: "#3a2a1a", label: "⏳ Pending" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}>
      <div style={{ background: "#111", border: "0.5px solid #2a2a2a", borderRadius: 16, width: "100%", maxWidth: 600, position: "relative", overflow: "hidden" }}
        onClick={e => e.stopPropagation()}>

        {/* Game iframe preview */}
        <div style={{ height: 300, background: "#0a0a0a", position: "relative" }}>
          {game.thumbnailUrl ? (
            <img src={game.thumbnailUrl} alt={game.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : game.iframeUrl ? (
            <iframe src={game.iframeUrl} style={{ width: "100%", height: "100%", border: "none" }} title={game.name} />
          ) : (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>🎮</div>
          )}
          {/* Status badge */}
          <span style={{ position: "absolute", top: 12, left: 12, padding: "4px 12px", borderRadius: 4, fontSize: 11, fontWeight: 500, background: statusStyle.bg, color: statusStyle.color, border: `0.5px solid ${statusStyle.border}` }}>
            {statusStyle.label}
          </span>
          {/* Close button */}
          <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.8)", border: "0.5px solid #2a2a2a", borderRadius: 6, color: "#fff", fontSize: 13, padding: "4px 10px", cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>{game.name}</div>
          <div style={{ fontSize: 13, color: "#555", marginBottom: 20, lineHeight: 1.6 }}>{game.description || "No description"}</div>

          {[
            ["Game ID", `#${game.gameId}`],
            ["Category", game.category],
            ["Creator", game.creator],
            ["Game URL", game.iframeUrl],
            ["Reward Rate", `${game.rewardRate} ARCADE per play`],
            ["Submitted", game.createdAt?.toDate?.()?.toLocaleDateString() || "Recently"],
            ["TX Hash", game.txHash?.slice(0, 20) + "..." || "N/A"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "8px 0", borderBottom: "0.5px solid #1a1a1a" }}>
              <span style={{ color: "#444", minWidth: 100 }}>{k}</span>
              <span style={{ color: "#888", textAlign: "right", wordBreak: "break-all", maxWidth: 380, fontSize: k === "Creator" || k === "TX Hash" ? 11 : 12, fontFamily: k === "Creator" || k === "TX Hash" ? "monospace" : "inherit" }}>{v}</span>
            </div>
          ))}

          {/* Action buttons */}
          {game.status === "pending" && (
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button onClick={() => onReject(game)} disabled={loading}
                style={{ flex: 1, padding: "12px", background: "#1f0d0d", border: "0.5px solid #3a1a1a", borderRadius: 10, color: "#ff4444", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                {loading ? "..." : "✗ Reject"}
              </button>
              <button onClick={() => onApprove(game)} disabled={loading}
                style={{ flex: 2, padding: "12px", background: "#00FF88", border: "none", borderRadius: 10, color: "#0C0C0C", fontSize: 13, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer" }}>
                {loading ? "Processing..." : "✓ Approve Game"}
              </button>
            </div>
          )}

          {game.status === "approved" && (
            <div style={{ marginTop: 20, padding: 12, background: "#0d1f12", border: "0.5px solid #1a3a1a", borderRadius: 8, fontSize: 12, color: "#00FF88", textAlign: "center" }}>
              ✓ This game is live — players can find it in the library
            </div>
          )}

          {game.status === "rejected" && (
            <div style={{ marginTop: 20, padding: 12, background: "#1f0d0d", border: "0.5px solid #3a1a1a", borderRadius: 8, fontSize: 12, color: "#ff4444", textAlign: "center" }}>
              ✗ This game was rejected
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  const { initiaAddress, requestTxBlock } = useInterwovenKit();
  const { isConnected } = useAccount();

  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [log, setLog] = useState("");
  const [activeTab, setActiveTab] = useState("pending");

  const isAdmin = initiaAddress === ADMIN;

  const fetchGames = async () => {
    setGamesLoading(true);
    try {
      const allGames = await getAllGames();
      setGames(allGames);
    } catch (err) {
      console.error("Fetch failed:", err);
    } finally {
      setGamesLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchGames();
  }, [isAdmin]);

  const approveGame = async (game) => {
    setLoading(true);
    try {
      // Step 1 — Blockchain approve
      await requestTxBlock({
        messages: [{
          typeUrl: "/initia.move.v1.MsgExecute",
          value: {
            sender: initiaAddress,
            moduleAddress: CONTRACT,
            moduleName: "platform",
            functionName: "approve_game",
            typeArgs: [],
            args: [encodeU64(game.gameId)],
          },
        }],
      });

      // Step 2 — Firebase update
      await approveGameInFirebase(game.gameId);

      setLog(`✓ Game #${game.gameId} "${game.name}" approved!`);
      setSelectedGame(null);
      await fetchGames();
    } catch (err) {
      setLog(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const rejectGame = async (game) => {
    setLoading(true);
    try {
      // Firebase reject
      await rejectGameInFirebase(game.gameId);
      setLog(`✗ Game #${game.gameId} "${game.name}" rejected.`);
      setSelectedGame(null);
      await fetchGames();
    } catch (err) {
      setLog(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) return (
    <div style={{ padding: 52, color: "#555", textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
      <p>Connect wallet to access admin panel</p>
    </div>
  );

  if (!isAdmin) return (
    <div style={{ padding: 52, color: "#555", textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
      <p style={{ color: "#ff4444", fontSize: 16, marginBottom: 8 }}>Access denied — Admin only!</p>
      <p style={{ fontSize: 12, color: "#333", fontFamily: "monospace" }}>{initiaAddress}</p>
    </div>
  );

  const pendingGames  = games.filter(g => g.status === "pending");
  const approvedGames = games.filter(g => g.status === "approved");
  const rejectedGames = games.filter(g => g.status === "rejected");

  const tabGames = { pending: pendingGames, approved: approvedGames, rejected: rejectedGames }[activeTab] || [];

  return (
    <div style={{ padding: "52px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 42, fontWeight: 500, letterSpacing: "-1px", marginBottom: 8 }}>
            Admin <span style={{ color: "#00FF88" }}>Dashboard</span>
          </h1>
          <p style={{ color: "#444", fontSize: 14 }}>Platform management — only you can see this</p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 32 }}>
          {[
            { label: "Total Games", value: games.length, color: "#00FF88" },
            { label: "Pending", value: pendingGames.length, color: "#FFB800" },
            { label: "Approved / Live", value: approvedGames.length, color: "#4499ff" },
            { label: "Rejected", value: rejectedGames.length, color: "#ff4444" },
          ].map(s => (
            <div key={s.label} style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 500, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "0.5px solid #1e1e1e" }}>
          {[
            { id: "pending",  label: `Pending (${pendingGames.length})` },
            { id: "approved", label: `Approved (${approvedGames.length})` },
            { id: "rejected", label: `Rejected (${rejectedGames.length})` },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{
                padding: "12px 24px", background: "transparent", border: "none",
                borderBottom: activeTab === t.id ? "2px solid #00FF88" : "2px solid transparent",
                color: activeTab === t.id ? "#fff" : "#555",
                fontSize: 13, cursor: "pointer", marginBottom: "-0.5px",
              }}>
              {t.label}
            </button>
          ))}
          <button onClick={fetchGames}
            style={{ marginLeft: "auto", padding: "8px 16px", background: "transparent", border: "0.5px solid #1e1e1e", borderRadius: 8, color: "#555", fontSize: 12, cursor: "pointer", marginBottom: 4 }}>
            ↻ Refresh
          </button>
        </div>

        {/* Games List */}
        {gamesLoading ? (
          <div style={{ padding: 48, textAlign: "center", fontSize: 13, color: "#444" }}>Loading from database...</div>
        ) : tabGames.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>
              {activeTab === "pending" ? "📋" : activeTab === "approved" ? "✅" : "❌"}
            </div>
            <div style={{ fontSize: 14, color: "#444" }}>
              No {activeTab} games
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {tabGames.map(game => (
              <div key={game.id}
                style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 10, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#00FF88"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "#1e1e1e"}
                onClick={() => setSelectedGame(game)}>

                {/* Thumbnail */}
                <div style={{ width: 60, height: 44, borderRadius: 6, overflow: "hidden", background: "#0a0a0a", flexShrink: 0 }}>
                  {game.thumbnailUrl ? (
                    <img src={game.thumbnailUrl} alt={game.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🎮</div>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{game.name}</div>
                  <div style={{ fontSize: 11, color: "#444", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    Game #{game.gameId} · {game.category} · {game.creator?.slice(0, 16)}...
                  </div>
                </div>

                {/* Reward */}
                <div style={{ textAlign: "center", flexShrink: 0 }}>
                  <div style={{ fontSize: 13, color: "#00FF88" }}>{game.rewardRate}</div>
                  <div style={{ fontSize: 9, color: "#444" }}>ARCADE/play</div>
                </div>

                {/* Date */}
                <div style={{ textAlign: "center", flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: "#555" }}>
                    {game.createdAt?.toDate?.()?.toLocaleDateString() || "Recent"}
                  </div>
                  <div style={{ fontSize: 9, color: "#333" }}>submitted</div>
                </div>

                {/* Quick actions — pending only */}
                {activeTab === "pending" && (
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => rejectGame(game)} disabled={loading}
                      style={{ padding: "6px 14px", background: "#1f0d0d", border: "0.5px solid #3a1a1a", borderRadius: 6, color: "#ff4444", fontSize: 11, cursor: "pointer" }}>
                      Reject
                    </button>
                    <button onClick={() => approveGame(game)} disabled={loading}
                      style={{ padding: "6px 14px", background: "#0d1f12", border: "0.5px solid #1a3a1a", borderRadius: 6, color: "#00FF88", fontSize: 11, cursor: "pointer" }}>
                      {loading ? "..." : "Approve"}
                    </button>
                  </div>
                )}

                <div style={{ fontSize: 11, color: "#333", flexShrink: 0 }}>View →</div>
              </div>
            ))}
          </div>
        )}

        {/* Platform Settings */}
        <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 12, padding: 22, marginTop: 28 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>Platform Settings</div>
          {[
            ["Platform fee", "10%"],
            ["Creator share", "20%"],
            ["Player share", "70%"],
            ["Chain ID", "initiation-2"],
            ["Contract", CONTRACT],
            ["Admin", ADMIN],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 10, paddingBottom: 10, borderBottom: "0.5px solid #1a1a1a" }}>
              <span style={{ color: "#444" }}>{k}</span>
              <span style={{ color: "#888", fontFamily: k === "Contract" || k === "Admin" ? "monospace" : "inherit", fontSize: k === "Contract" || k === "Admin" ? 10 : 12 }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Emergency */}
        <div style={{ background: "#1f0d0d", border: "0.5px solid #3a1a1a", borderRadius: 12, padding: 22, marginTop: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#ff4444", marginBottom: 8 }}>Emergency Controls</div>
          <div style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>Use only in case of emergency!</div>
          <button style={{ padding: "10px 24px", background: "#ff4444", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
            Pause Platform
          </button>
        </div>

        {/* Log */}
        {log && (
          <div style={{ marginTop: 16, padding: 16, background: log.startsWith("✓") ? "#0d1f12" : "#1f0d0d", border: `0.5px solid ${log.startsWith("✓") ? "#1a3a1a" : "#3a1a1a"}`, borderRadius: 10, fontSize: 12, color: log.startsWith("✓") ? "#00FF88" : "#ff4444", wordBreak: "break-all" }}>
            {log}
          </div>
        )}

      </div>

      {/* Game Preview Modal */}
      {selectedGame && (
        <GamePreviewModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          onApprove={approveGame}
          onReject={rejectGame}
          loading={loading}
        />
      )}
    </div>
  );
}