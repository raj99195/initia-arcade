import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { useInterwovenKit } from "@initia/interwovenkit-react";
import { useGames } from "../hooks/useGames";
import { getScores } from "../lib/gameService";

const CONTRACT = "0xd1aa08d2de31ca1af55682f4185547f92332bee";
const REST     = "https://rest.testnet.initia.xyz";

function bech32ToHex(addr) {
  const charset = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
  const stripped = addr.slice(addr.indexOf("1") + 1);
  const data = [];
  for (const c of stripped) { const idx = charset.indexOf(c); if (idx !== -1) data.push(idx); }
  const result = []; let acc = 0, bits = 0;
  for (const val of data.slice(0, -6)) {
    acc = ((acc << 5) | val) & 0x1fff; bits += 5;
    if (bits >= 8) { bits -= 8; result.push((acc >> bits) & 0xff); }
  }
  return "0x" + result.map(b => b.toString(16).padStart(2, "0")).join("");
}

const shortAddr = (a) => a ? a.slice(0, 8) + "..." + a.slice(-4) : "—";
const fmtScore  = (s) => s >= 1000000 ? (s/1000000).toFixed(1)+"M" : s >= 1000 ? (s/1000).toFixed(1)+"K" : String(s||"0");

// Robot avatar placeholder
function Avatar({ player, size = 36 }) {
  const initials = player ? player.slice(2, 4).toUpperCase() : "?";
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg,#7B2FFF,#00d4ff)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.3, fontWeight: 700, color: "#fff",
      fontFamily: "'Orbitron',sans-serif", flexShrink: 0,
      border: "2px solid rgba(123,47,255,0.4)",
    }}>{initials}</div>
  );
}

// ARCADE coin
function ArcadeCoin({ size = 20 }) {
  return (
    <img src="/Arcade-token-logo.png" alt="A"
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      onError={e => { e.target.style.display="none"; }}
    />
  );
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const { initiaAddress } = useInterwovenKit();
  const { isConnected } = useAccount();
  const { games } = useGames();
  const [scores,     setScores]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState("global");
  const [selectedGame, setSelectedGame] = useState("all");
  const [myStats,    setMyStats]    = useState(null);
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
      const res  = await fetch(`${REST}/initia/move/v1/accounts/${CONTRACT}/resources/view?module_name=leaderboard&function_name=get_player_stats&type_args=[]&args=["address:${hex}"]`);
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

  const myHex      = initiaAddress ? bech32ToHex(initiaAddress) : null;
  const myRank     = globalLB.findIndex(p => p.player === myHex) + 1;
  const displayData = activeTab === "global" ? globalLB : gameLB;
  const top3       = globalLB.slice(0, 3);
  const rest       = globalLB.slice(3);

  // rank image map
  const rankImg = { 1: "/rank-1.png", 2: "/rank-2.png", 3: "/rank-3.png" };

  return (
    <div style={{ minHeight: "calc(100vh - 54px)", background: "#08070f" }}>
      <style>{`
        @keyframes lbPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes floatUp  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        .lb-row:hover { background: rgba(123,47,255,0.07) !important; }
        .tab-btn:hover { color: #c4a0ff !important; }
      `}</style>

      {/* ── HERO HEADER with BG image ── */}
      <div style={{ position:"relative", overflow:"hidden", padding:"36px 36px 28px", minHeight:220 }}>
        {/* BG image */}
        <img src="/Leaderboard-BG.png" alt="" aria-hidden style={{
          position:"absolute", inset:0, width:"100%", height:"100%",
          objectFit:"cover", objectPosition:"center 30%",
          opacity:0.55, pointerEvents:"none",
        }}/>
        {/* Dark overlay */}
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,rgba(8,7,15,0.95) 0%,rgba(8,7,15,0.7) 55%,rgba(8,7,15,0.2) 100%)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:60, background:"linear-gradient(to top,#08070f,transparent)", pointerEvents:"none" }} />

        {/* Content */}
        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 11px", border:"1px solid rgba(123,47,255,0.2)", borderRadius:4, fontSize:9, color:"rgba(180,150,255,0.6)", letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:14, background:"rgba(123,47,255,0.06)", fontFamily:"'Rajdhani',sans-serif", fontWeight:600 }}>
            <span style={{ width:5, height:5, borderRadius:"50%", background:"#00FF88", animation:"lbPulse 1.5s ease-in-out infinite" }} />
            Live On-Chain Scores
          </div>

          <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
            <h1 style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:48, letterSpacing:"-0.5px", textTransform:"uppercase", lineHeight:1, color:"#fff" }}>
              Global{" "}
              <span style={{ background:"linear-gradient(90deg,#7B2FFF,#00d4ff)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
                Leaderboard
              </span>
            </h1>
            <button onClick={refresh} disabled={refreshing} style={{
              padding:"8px 18px", background:"rgba(123,47,255,0.12)",
              border:"1px solid rgba(123,47,255,0.3)", borderRadius:7,
              color:"#a67fff", fontSize:11, cursor:"pointer",
              fontFamily:"'Rajdhani',sans-serif", fontWeight:700, letterSpacing:"0.5px",
              transition:"all 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor="rgba(123,47,255,0.55)"}
            onMouseLeave={e => e.currentTarget.style.borderColor="rgba(123,47,255,0.3)"}
            >{refreshing ? "..." : "↻ Refresh"}</button>
          </div>
          <p style={{ color:"#7755aa", fontSize:12, marginTop:8, fontFamily:"'Rajdhani',sans-serif" }}>
            Tamper-proof scores from Initia blockchain — verified every block.
          </p>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ padding:"0 36px 36px", display:"grid", gridTemplateColumns:"1fr 300px", gap:20 }}>

        {/* LEFT */}
        <div>
          {/* Tabs */}
          <div style={{ display:"flex", alignItems:"center", gap:0, marginBottom:20, borderBottom:"1px solid rgba(123,47,255,0.1)" }}>
            {["global", "by-game"].map(tab => (
              <button key={tab} className="tab-btn" onClick={() => setActiveTab(tab)} style={{
                padding:"10px 22px", background:"transparent", border:"none",
                borderBottom: activeTab===tab ? "2px solid #7B2FFF" : "2px solid transparent",
                color: activeTab===tab ? "#c4a0ff" : "#5533aa",
                fontSize:12, cursor:"pointer", marginBottom:"-1px",
                fontFamily:"'Rajdhani',sans-serif", fontWeight:700, letterSpacing:"0.5px",
                textTransform:"uppercase", transition:"color 0.18s",
              }}>{tab === "global" ? "Global" : "By Game"}</button>
            ))}
            {activeTab === "by-game" && (
              <select value={selectedGame} onChange={e => setSelectedGame(e.target.value)} style={{
                marginLeft:"auto", marginBottom:4,
                background:"rgba(123,47,255,0.08)", border:"1px solid rgba(123,47,255,0.2)",
                borderRadius:6, color:"#a67fff", fontSize:11, padding:"5px 10px",
                cursor:"pointer", fontFamily:"'Rajdhani',sans-serif", fontWeight:600,
              }}>
                <option value="all">All Games</option>
                {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            )}
          </div>

          {/* ── TOP 3 PODIUM ── */}
          {activeTab === "global" && top3.length > 0 && (
            <div style={{ display:"flex", justifyContent:"center", alignItems:"flex-end", gap:16, marginBottom:28, padding:"0 20px" }}>

              {/* 2nd */}
              <div style={{ flex:1, maxWidth:280, animation:"floatUp 3.5s ease-in-out infinite", animationDelay:"0.5s" }}>
                <div style={{ position:"relative", borderRadius:12, overflow:"hidden", border:"1px solid rgba(192,192,192,0.2)" }}>
                  <img src={rankImg[2]} alt="Rank 2" style={{ width:"100%", display:"block", objectFit:"cover" }} onError={e=>{e.target.style.display="none"}} />
                  <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(8,7,15,0.85) 0%,transparent 50%)", pointerEvents:"none" }} />
                  <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"12px 14px", textAlign:"center" }}>
                    <Avatar player={top3[1]?.player} size={44} />
                    <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:9, color:"#C0C0C0", margin:"8px 0 3px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {top3[1] ? shortAddr(top3[1].player) : "—"}
                    </div>
                    <div style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:10, color:"#9977cc", marginBottom:8 }}>
                      {top3[1]?.bestGame || "—"}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                      <ArcadeCoin size={18} />
                      <span style={{ fontFamily:"'Orbitron',sans-serif", fontWeight:700, fontSize:20, color:"#C0C0C0" }}>
                        {top3[1] ? fmtScore(top3[1].bestScore) : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 1st — center, taller */}
              <div style={{ flex:1, maxWidth:320, marginBottom:20, animation:"floatUp 3s ease-in-out infinite" }}>
                <div style={{ position:"relative", borderRadius:12, overflow:"hidden", border:"2px solid rgba(255,215,0,0.35)", boxShadow:"0 0 30px rgba(255,215,0,0.15)" }}>
                  <img src={rankImg[1]} alt="Rank 1" style={{ width:"100%", display:"block", objectFit:"cover" }} onError={e=>{e.target.style.display="none"}} />
                  <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(8,7,15,0.85) 0%,transparent 50%)", pointerEvents:"none" }} />
                  <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"14px 16px", textAlign:"center" }}>
                    <Avatar player={top3[0]?.player} size={52} />
                    <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:9, color:"#FFD700", margin:"10px 0 3px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {top3[0] ? shortAddr(top3[0].player) : "—"}
                    </div>
                    <div style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:10, color:"#9977cc", marginBottom:10 }}>
                      {top3[0]?.bestGame || "—"}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
                      <ArcadeCoin size={22} />
                      <span style={{ fontFamily:"'Orbitron',sans-serif", fontWeight:700, fontSize:28, color:"#FFD700" }}>
                        {top3[0] ? fmtScore(top3[0].bestScore) : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3rd */}
              <div style={{ flex:1, maxWidth:280, animation:"floatUp 3.8s ease-in-out infinite", animationDelay:"1s" }}>
                <div style={{ position:"relative", borderRadius:12, overflow:"hidden", border:"1px solid rgba(205,127,50,0.2)" }}>
                  <img src={rankImg[3]} alt="Rank 3" style={{ width:"100%", display:"block", objectFit:"cover" }} onError={e=>{e.target.style.display="none"}} />
                  <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(8,7,15,0.85) 0%,transparent 50%)", pointerEvents:"none" }} />
                  <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"12px 14px", textAlign:"center" }}>
                    <Avatar player={top3[2]?.player} size={44} />
                    <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:9, color:"#CD7F32", margin:"8px 0 3px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {top3[2] ? shortAddr(top3[2].player) : "—"}
                    </div>
                    <div style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:10, color:"#9977cc", marginBottom:8 }}>
                      {top3[2]?.bestGame || "—"}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                      <ArcadeCoin size={18} />
                      <span style={{ fontFamily:"'Orbitron',sans-serif", fontWeight:700, fontSize:20, color:"#CD7F32" }}>
                        {top3[2] ? fmtScore(top3[2].bestScore) : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── ROWS TABLE ── */}
          <div style={{ background:"#0e0c1a", border:"1px solid rgba(123,47,255,0.1)", borderRadius:12, overflow:"hidden" }}>

            {/* Table header */}
            <div style={{ padding:"12px 20px", borderBottom:"1px solid rgba(123,47,255,0.08)", display:"flex", justifyContent:"space-between", alignItems:"center", background:"rgba(123,47,255,0.04)" }}>
              <span style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:13, color:"#fff", letterSpacing:"0.3px" }}>
                {activeTab === "global" ? "Top Players" : selectedGame === "all" ? "All Scores" : `Game #${selectedGame}`}
              </span>
              <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, color:"#7755aa", fontFamily:"'Rajdhani',sans-serif" }}>
                <span style={{ width:5, height:5, borderRadius:"50%", background:"#00FF88", animation:"lbPulse 1.5s ease-in-out infinite" }} />
                Live · {displayData.length} entries
              </div>
            </div>

            {/* Col headers */}
            <div style={{ display:"grid", gridTemplateColumns:"80px 1fr 180px 120px", padding:"8px 20px", borderBottom:"1px solid rgba(123,47,255,0.06)" }}>
              {["Rank","Player", activeTab==="global"?"Best Game":"Game","Score"].map((h,i) => (
                <div key={i} style={{ fontSize:9, color:"#7755aa", textTransform:"uppercase", letterSpacing:"1px", textAlign: i>=3?"right":"left", fontFamily:"'Rajdhani',sans-serif", fontWeight:700 }}>{h}</div>
              ))}
            </div>

            {loading ? (
              <div style={{ padding:48, textAlign:"center", fontSize:12, color:"#7755aa", fontFamily:"'Rajdhani',sans-serif" }}>Loading scores...</div>
            ) : displayData.length === 0 ? (
              <div style={{ padding:64, textAlign:"center" }}>
                <div style={{ fontSize:40, marginBottom:14 }}>🏆</div>
                <div style={{ fontSize:13, color:"#9977cc", fontFamily:"'Rajdhani',sans-serif" }}>No scores yet</div>
                <button onClick={() => navigate("/games")} style={{ marginTop:12, padding:"8px 18px", background:"linear-gradient(135deg,#7B2FFF,#5a1fd4)", border:"none", borderRadius:6, color:"#fff", fontSize:11, cursor:"pointer", fontFamily:"'Rajdhani',sans-serif", fontWeight:700 }}>Play a Game →</button>
              </div>
            ) : (
              displayData.map((row, idx) => {
                const isMe = row.player === myHex;
                // show rows 4+ in global tab (1-3 shown in podium)
                const displayRow = activeTab === "by-game" || row.rank > 3;
                if (!displayRow) return null;
                return (
                  <div key={idx} className="lb-row" style={{
                    display:"grid", gridTemplateColumns:"80px 1fr 180px 120px",
                    padding:"12px 20px", borderBottom:"1px solid rgba(123,47,255,0.04)",
                    background: isMe ? "rgba(123,47,255,0.08)" : "transparent",
                    transition:"background 0.15s", alignItems:"center",
                  }}>
                    {/* Rank */}
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontFamily:"'Orbitron',sans-serif", fontSize:10, color:"#7755aa", minWidth:20 }}>{row.rank}</span>
                    </div>
                    {/* Player */}
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <Avatar player={row.player} size={32} />
                      <div>
                        <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:8, color: isMe?"#a67fff":"#7755aa" }}>{shortAddr(row.player)}</div>
                        {isMe && <div style={{ fontSize:9, color:"#9977cc", fontFamily:"'Rajdhani',sans-serif", fontWeight:700 }}>← You</div>}
                      </div>
                    </div>
                    {/* Game */}
                    <div style={{ fontSize:12, color:"#9977cc", fontFamily:"'Rajdhani',sans-serif", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {activeTab==="global" ? (row.bestGame||"—") : (row.gameName||`Game #${row.gameId}`)}
                    </div>
                    {/* Score */}
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:6 }}>
                      <ArcadeCoin size={16} />
                      <span style={{ fontFamily:"'Orbitron',sans-serif", fontWeight:700, fontSize:13, color:"#a67fff" }}>
                        {fmtScore(activeTab==="global" ? row.bestScore : row.score)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

          {/* Your Rank */}
          <div style={{ background:"#0e0c1a", border:"1px solid rgba(123,47,255,0.12)", borderRadius:12, padding:20, position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:-20, right:-20, width:100, height:100, background:"radial-gradient(circle,rgba(123,47,255,0.12) 0%,transparent 70%)", borderRadius:"50%", pointerEvents:"none" }} />
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1l1.5 3 3.5.5-2.5 2.5.6 3.5L7 9 3.9 10.5l.6-3.5L2 4.5l3.5-.5z" fill="#7B2FFF" opacity="0.8"/>
              </svg>
              <span style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:11, color:"#c4a0ff", textTransform:"uppercase", letterSpacing:"1px" }}>Your Rank</span>
            </div>
            {isConnected ? (
              myStats ? (
                <div>
                  <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:44, fontWeight:700, color:"#a67fff", letterSpacing:"-2px", lineHeight:1, marginBottom:4 }}>
                    {myRank > 0 ? `#${myRank}` : "—"}
                  </div>
                  <div style={{ fontSize:10, color:"#5533aa", marginBottom:16, fontFamily:"'Rajdhani',sans-serif" }}>Global ranking</div>
                  {[["Best Score", fmtScore(myStats.bestScore)],["Total Score", fmtScore(myStats.totalScore)],["Games Played", myStats.gamesPlayed]].map(([k,v]) => (
                    <div key={k} style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:8, paddingBottom:8, borderBottom:"1px solid rgba(123,47,255,0.06)" }}>
                      <span style={{ color:"#7755aa", fontFamily:"'Rajdhani',sans-serif" }}>{k}</span>
                      <span style={{ color:"#a67fff", fontFamily:"'Rajdhani',sans-serif", fontWeight:700 }}>{v}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize:12, color:"#7755aa", fontFamily:"'Rajdhani',sans-serif", lineHeight:1.6 }}>No scores yet — play and claim your spot!</div>
              )
            ) : (
              <div style={{ fontSize:11, color:"#7755aa", fontFamily:"'Rajdhani',sans-serif" }}>Connect wallet to see your rank</div>
            )}
          </div>

          {/* Top Games */}
          <div style={{ background:"#0e0c1a", border:"1px solid rgba(123,47,255,0.12)", borderRadius:12, padding:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="2" y="7" width="10" height="5" rx="2" stroke="#7B2FFF" strokeWidth="1.2" fill="none"/>
                <path d="M4 7V4.5M10 7V4.5" stroke="#7B2FFF" strokeWidth="1.2" strokeLinecap="round"/>
                <path d="M5 6v-2M7 6v-2M9 6v-2" stroke="#7B2FFF" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
              </svg>
              <span style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:11, color:"#c4a0ff", textTransform:"uppercase", letterSpacing:"1px" }}>Top Games</span>
            </div>
            {games.slice(0,5).map((g, i) => {
              const cnt = scores.filter(s => s.gameId === g.id).length;
              return (
                <div key={g.id} onClick={() => navigate(`/play/${g.id}`)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:12, marginBottom:10, paddingBottom:10, borderBottom:"1px solid rgba(123,47,255,0.05)", cursor:"pointer", transition:"all 0.15s" }}
                onMouseEnter={e=>e.currentTarget.style.opacity="0.8"}
                onMouseLeave={e=>e.currentTarget.style.opacity="1"}
                >
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontFamily:"'Orbitron',sans-serif", fontSize:8, color:"#5533aa", minWidth:14 }}>{i+1}</span>
                    <span style={{ color:"#c4a0ff", fontFamily:"'Rajdhani',sans-serif", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:130 }}>{g.name}</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                    <ArcadeCoin size={13} />
                    <span style={{ fontSize:9, color:"#7755aa", fontFamily:"'Orbitron',sans-serif" }}>{cnt}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* How scores work */}
          <div style={{ background:"rgba(123,47,255,0.05)", border:"1px solid rgba(123,47,255,0.12)", borderRadius:12, padding:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="#7B2FFF" strokeWidth="1.2" fill="none"/>
                <path d="M7 4v4M7 9.5v.5" stroke="#7B2FFF" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <span style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:11, color:"#c4a0ff", textTransform:"uppercase", letterSpacing:"1px" }}>How Scores Work</span>
            </div>
            {["Play any game on InitiaArcade","Score submits on Initia blockchain","Tamper-proof — verified on-chain","Leaderboard updates instantly"].map((t,i) => (
              <div key={i} style={{ display:"flex", gap:10, fontSize:11, color:"#7755aa", marginBottom:10, lineHeight:1.55 }}>
                <span style={{ background:"rgba(123,47,255,0.15)", color:"#a67fff", flexShrink:0, fontWeight:700, fontFamily:"'Orbitron',sans-serif", fontSize:8, width:18, height:18, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center" }}>0{i+1}</span>
                <span style={{ fontFamily:"'Rajdhani',sans-serif" }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
