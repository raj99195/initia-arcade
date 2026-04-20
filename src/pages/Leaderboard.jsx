import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { useInterwovenKit } from "@initia/interwovenkit-react";
import { useGames } from "../hooks/useGames";
import { getScores } from "../lib/gameService";

const CONTRACT = "0xd1aa08d2de31ca1af55682f4185547f92332bee";
const REST = "https://rest.testnet.initia.xyz";

function bech32ToHex(addr) {
  const charset = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
  const stripped = addr.slice(addr.indexOf("1") + 1);
  const data = [];
  for (const c of stripped) { const idx = charset.indexOf(c); if (idx !== -1) data.push(idx); }
  const result = [];
  let acc = 0, bits = 0;
  for (const val of data.slice(0, -6)) {
    acc = ((acc << 5) | val) & 0x1fff; bits += 5;
    if (bits >= 8) { bits -= 8; result.push((acc >> bits) & 0xff); }
  }
  return "0x" + result.map(b => b.toString(16).padStart(2, "0")).join("");
}

const shortAddr = (a) => a ? a.slice(0, 8) + "..." + a.slice(-4) : "—";
const fmtScore = (s) => s >= 1000000 ? (s/1000000).toFixed(1)+"M" : s >= 1000 ? (s/1000).toFixed(1)+"K" : String(s);

export default function Leaderboard() {
  const navigate = useNavigate();
  const { initiaAddress } = useInterwovenKit();
  const { isConnected } = useAccount();
  const { games } = useGames();
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("global");
  const [selectedGame, setSelectedGame] = useState("all");
  const [myStats, setMyStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchScores = async () => {
    setLoading(true);
    try { setScores(await getScores()); } catch {}
    setLoading(false);
  };

  const fetchMyStats = async () => {
    if (!initiaAddress) return;
    try {
      const hex = bech32ToHex(initiaAddress);
      const res = await fetch(`${REST}/initia/move/v1/accounts/${CONTRACT}/resources/view?module_name=leaderboard&function_name=get_player_stats&type_args=[]&args=["address:${hex}"]`);
      const data = await res.json();
      if (data?.data) {
        const arr = JSON.parse(data.data);
        setMyStats({ totalScore: parseInt(arr[0]||"0"), gamesPlayed: parseInt(arr[1]||"0"), bestScore: parseInt(arr[2]||"0") });
      }
    } catch {}
  };

  useEffect(() => { fetchScores(); if (initiaAddress) fetchMyStats(); }, [initiaAddress]);

  const refresh = async () => { setRefreshing(true); await fetchScores(); await fetchMyStats(); setRefreshing(false); };

  const globalLB = Object.values(
    scores.reduce((acc, s) => {
      const p = s.player;
      if (!acc[p]) acc[p] = { player: p, bestScore: 0, totalScore: 0, gamesPlayed: 0, bestGame: "" };
      acc[p].totalScore += s.score; acc[p].gamesPlayed += 1;
      if (s.score > acc[p].bestScore) { acc[p].bestScore = s.score; acc[p].bestGame = s.gameName; }
      return acc;
    }, {})
  ).sort((a, b) => b.bestScore - a.bestScore).map((p, i) => ({ ...p, rank: i + 1 }));

  const gameLB = (selectedGame === "all" ? scores : scores.filter(s => s.gameId === parseInt(selectedGame)))
    .sort((a, b) => b.score - a.score).map((s, i) => ({ ...s, rank: i + 1 }));

  const myHex = initiaAddress ? bech32ToHex(initiaAddress) : null;
  const myRank = globalLB.findIndex(p => p.player === myHex) + 1;
  const displayData = activeTab === "global" ? globalLB : gameLB;
  const top3 = globalLB.slice(0, 3);

  const rankColors = { 1: "#FFD700", 2: "#C0C0C0", 3: "#CD7F32" };

  return (
    <div style={{ minHeight: "calc(100vh - 54px)", background: "#08070f", padding: "28px 36px" }}>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.35;transform:scale(0.75)} }
        @keyframes lbPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        .lb-row:hover { background: rgba(123,47,255,0.05) !important; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "4px 11px", border: "1px solid rgba(123,47,255,0.2)",
          borderRadius: 4, fontSize: 9, color: "rgba(180,150,255,0.55)",
          letterSpacing: "1.5px", textTransform: "uppercase",
          marginBottom: 16, background: "rgba(123,47,255,0.06)",
          fontFamily: "'Rajdhani',sans-serif", fontWeight: 600,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00FF88", animation: "lbPulse 1.5s ease-in-out infinite" }} />
          Live On-Chain Scores
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 42, letterSpacing: "-0.5px", textTransform: "uppercase", lineHeight: 1 }}>
            Global{" "}
            <span style={{ background: "linear-gradient(90deg,#7B2FFF,#00d4ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Leaderboard
            </span>
          </h1>
          <button onClick={refresh} disabled={refreshing} style={{
            padding: "8px 16px", background: "rgba(123,47,255,0.08)",
            border: "1px solid rgba(123,47,255,0.2)", borderRadius: 6,
            color: "#a67fff", fontSize: 11, cursor: "pointer",
            fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, letterSpacing: "0.5px",
            transition: "all 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(123,47,255,0.4)"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(123,47,255,0.2)"}
          >
            {refreshing ? "..." : "↻ Refresh"}
          </button>
        </div>
        <p style={{ color: "#2a1a4a", fontSize: 12, marginTop: 6, fontFamily: "'Rajdhani',sans-serif" }}>
          Tamper-proof scores from Initia blockchain — verified every block.
        </p>
      </div>

      {/* My Stats Banner */}
      {isConnected && myStats && (
        <div style={{
          background: "rgba(123,47,255,0.06)", border: "1px solid rgba(123,47,255,0.15)",
          borderRadius: 10, padding: "14px 22px", marginBottom: 22,
          display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap",
        }}>
          <div style={{ fontSize: 12, color: "#a67fff", fontWeight: 700, marginRight: 24, fontFamily: "'Rajdhani',sans-serif", letterSpacing: "0.5px" }}>
            Your Stats
          </div>
          {[
            { label: "Global Rank", value: myRank > 0 ? `#${myRank}` : "—", color: "#FFD700" },
            { label: "Best Score", value: fmtScore(myStats.bestScore), color: "#a67fff" },
            { label: "Total Score", value: fmtScore(myStats.totalScore), color: "#00d4ff" },
            { label: "Games Played", value: myStats.gamesPlayed, color: "#00FF88" },
          ].map((s, i) => (
            <div key={s.label} style={{ textAlign: "center", padding: "0 20px", borderLeft: "1px solid rgba(123,47,255,0.1)" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: "'Rajdhani',sans-serif" }}>{s.value}</div>
              <div style={{ fontSize: 9, color: "#2a1a4a", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: "'Rajdhani',sans-serif" }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 18 }}>

        {/* MAIN TABLE */}
        <div>
          {/* Tabs + filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 16, borderBottom: "1px solid rgba(123,47,255,0.1)" }}>
            {["global", "by-game"].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: "10px 22px", background: "transparent", border: "none",
                borderBottom: activeTab === tab ? "2px solid #7B2FFF" : "2px solid transparent",
                color: activeTab === tab ? "#a67fff" : "#2a1a4a",
                fontSize: 12, cursor: "pointer", marginBottom: "-1px",
                fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, letterSpacing: "0.5px",
                textTransform: "uppercase", transition: "color 0.2s",
              }}>
                {tab === "global" ? "Global" : "By Game"}
              </button>
            ))}
            {activeTab === "by-game" && (
              <select value={selectedGame} onChange={e => setSelectedGame(e.target.value)} style={{
                marginLeft: "auto", marginBottom: 4,
                background: "rgba(123,47,255,0.08)", border: "1px solid rgba(123,47,255,0.2)",
                borderRadius: 6, color: "#a67fff", fontSize: 11, padding: "5px 10px",
                cursor: "pointer", fontFamily: "'Rajdhani',sans-serif", fontWeight: 600,
              }}>
                <option value="all">All Games</option>
                {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            )}
          </div>

          {/* Table */}
          <div style={{ background: "#0e0c1a", border: "1px solid rgba(123,47,255,0.1)", borderRadius: 10, overflow: "hidden" }}>
            {/* Table header */}
            <div style={{
              padding: "12px 20px", borderBottom: "1px solid rgba(123,47,255,0.08)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "rgba(123,47,255,0.04)",
            }}>
              <span style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 13, color: "#fff", letterSpacing: "0.3px" }}>
                {activeTab === "global" ? "Top Players" : selectedGame === "all" ? "All Scores" : `Game #${selectedGame}`}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#2a1a4a", fontFamily: "'Rajdhani',sans-serif" }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00FF88", animation: "lbPulse 1.5s ease-in-out infinite" }} />
                Live · {displayData.length} entries
              </div>
            </div>

            {/* Col headers */}
            <div style={{
              display: "grid",
              gridTemplateColumns: activeTab === "global" ? "48px 1fr 130px 90px 90px" : "48px 1fr 130px 90px",
              padding: "8px 20px", borderBottom: "1px solid rgba(123,47,255,0.06)",
            }}>
              {(activeTab === "global" ? ["Rank", "Player", "Best Game", "Score", "Total"] : ["Rank", "Player", "Game", "Score"])
                .map((h, i) => (
                  <div key={i} style={{ fontSize: 9, color: "#2a1a4a", textTransform: "uppercase", letterSpacing: "1px", textAlign: i >= 3 ? "right" : "left", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700 }}>{h}</div>
                ))}
            </div>

            {loading ? (
              <div style={{ padding: 48, textAlign: "center", fontSize: 12, color: "#2a1a4a", fontFamily: "'Rajdhani',sans-serif" }}>
                Loading scores...
              </div>
            ) : displayData.length === 0 ? (
              <div style={{ padding: 64, textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 14 }}>🏆</div>
                <div style={{ fontSize: 13, color: "#3a2a5a", fontFamily: "'Rajdhani',sans-serif" }}>No scores yet</div>
                <button onClick={() => navigate("/games")} style={{
                  marginTop: 12, padding: "8px 18px",
                  background: "linear-gradient(135deg,#7B2FFF,#5a1fd4)",
                  border: "none", borderRadius: 6, color: "#fff", fontSize: 11,
                  cursor: "pointer", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700,
                }}>Play a Game →</button>
              </div>
            ) : (
              displayData.map((row, idx) => {
                const isMe = row.player === myHex;
                return (
                  <div key={idx} className="lb-row" style={{
                    display: "grid",
                    gridTemplateColumns: activeTab === "global" ? "48px 1fr 130px 90px 90px" : "48px 1fr 130px 90px",
                    padding: "12px 20px",
                    borderBottom: "1px solid rgba(123,47,255,0.04)",
                    background: isMe ? "rgba(123,47,255,0.08)" : "transparent",
                    transition: "background 0.15s",
                  }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      {row.rank <= 3 ? (
                        <span style={{ fontSize: 16 }}>{["🥇","🥈","🥉"][row.rank-1]}</span>
                      ) : (
                        <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, color: "#2a1a4a" }}>{row.rank}</span>
                      )}
                    </div>
                    <div style={{ alignSelf: "center" }}>
                      <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: isMe ? "#a67fff" : "#5533aa" }}>
                        {shortAddr(row.player)}
                      </div>
                      {isMe && <div style={{ fontSize: 9, color: "#3a2a5a", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700 }}>← You</div>}
                    </div>
                    <div style={{ fontSize: 11, color: "#3a2a5a", alignSelf: "center", fontFamily: "'Rajdhani',sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {activeTab === "global" ? (row.bestGame || "—") : (row.gameName || `Game #${row.gameId}`)}
                    </div>
                    <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 13, color: rankColors[row.rank] || "#a67fff", textAlign: "right", alignSelf: "center" }}>
                      {fmtScore(activeTab === "global" ? row.bestScore : row.score)}
                    </div>
                    {activeTab === "global" && (
                      <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 11, color: "#2a1a4a", textAlign: "right", alignSelf: "center" }}>
                        {fmtScore(row.totalScore)}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* SIDEBAR */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Your Rank */}
          <div style={{ background: "#0e0c1a", border: "1px solid rgba(123,47,255,0.1)", borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 9, color: "#2a1a4a", textTransform: "uppercase", letterSpacing: "1.5px", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, marginBottom: 12 }}>
              Your Rank
            </div>
            {isConnected ? (
              myStats ? (
                <div>
                  <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 38, fontWeight: 700, color: "#a67fff", letterSpacing: "-1px", marginBottom: 4 }}>
                    {myRank > 0 ? `#${myRank}` : "—"}
                  </div>
                  <div style={{ fontSize: 10, color: "#2a1a4a", marginBottom: 16, fontFamily: "'Rajdhani',sans-serif" }}>Global ranking</div>
                  {[["Best Score", fmtScore(myStats.bestScore)], ["Total Score", fmtScore(myStats.totalScore)], ["Games Played", myStats.gamesPlayed]].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid rgba(123,47,255,0.06)" }}>
                      <span style={{ color: "#2a1a4a", fontFamily: "'Rajdhani',sans-serif" }}>{k}</span>
                      <span style={{ color: "#7755bb", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700 }}>{v}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "#2a1a4a", fontFamily: "'Rajdhani',sans-serif" }}>No scores yet — play!</div>
              )
            ) : (
              <div style={{ fontSize: 11, color: "#2a1a4a", fontFamily: "'Rajdhani',sans-serif" }}>Connect wallet to see your rank</div>
            )}
          </div>

          {/* Top Games */}
          <div style={{ background: "#0e0c1a", border: "1px solid rgba(123,47,255,0.1)", borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 9, color: "#2a1a4a", textTransform: "uppercase", letterSpacing: "1.5px", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, marginBottom: 14 }}>
              Top Games
            </div>
            {games.slice(0, 5).map((g, i) => {
              const cnt = scores.filter(s => s.gameId === g.id).length;
              return (
                <div key={g.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid rgba(123,47,255,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: "#2a1a4a", minWidth: 14 }}>{i + 1}</span>
                    <span style={{ color: "#3a2a5a", fontFamily: "'Rajdhani',sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 110 }}>{g.name}</span>
                  </div>
                  <span style={{ fontSize: 9, color: "#2a1a4a", fontFamily: "'Orbitron',sans-serif" }}>{cnt}</span>
                </div>
              );
            })}
          </div>

          {/* How scores work */}
          <div style={{ background: "rgba(123,47,255,0.05)", border: "1px solid rgba(123,47,255,0.1)", borderRadius: 10, padding: 18 }}>
            <div style={{ fontSize: 10, color: "#7755bb", fontWeight: 700, marginBottom: 12, fontFamily: "'Rajdhani',sans-serif", letterSpacing: "0.5px" }}>
              How scores work
            </div>
            {[
              "Play any game on InitiaArcade",
              "Score submits on Initia blockchain",
              "Tamper-proof — verified on-chain",
              "Leaderboard updates instantly",
            ].map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 8, fontSize: 11, color: "#2a1a4a", marginBottom: 7, lineHeight: 1.5 }}>
                <span style={{ color: "#5533aa", flexShrink: 0, fontWeight: 700, fontFamily: "'Orbitron',sans-serif", fontSize: 8 }}>0{i+1}</span>
                <span style={{ fontFamily: "'Rajdhani',sans-serif" }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}