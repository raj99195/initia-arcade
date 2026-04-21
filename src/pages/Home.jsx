import { useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { useInterwovenKit } from "@initia/interwovenkit-react";
import EnableAutoSign from "../components/EnableAutoSign";
import { useGames } from "../hooks/useGames";
import GameCard from "../components/GameCard";
import { useEffect, useState } from "react";
import { getScores } from "../lib/gameService";
import { useArcadeBalance } from "../hooks/useArcadeBalance";

export default function Home() {
  const navigate = useNavigate();
  const { isConnected } = useAccount();
  const { openConnect, autoSign } = useInterwovenKit();
  const { balance } = useArcadeBalance();
  const { games } = useGames();
  const [scores, setScores] = useState([]);
  const [page, setPage] = useState(0);
  const [visible, setVisible] = useState(true);

  const CARDS_PER_PAGE = 3;
  const featured = games;
  const totalPages = Math.max(1, Math.ceil(featured.length / CARDS_PER_PAGE));
  const currentCards = featured.slice(page * CARDS_PER_PAGE, page * CARDS_PER_PAGE + CARDS_PER_PAGE);

  const goTo = (newPage) => {
    const clamped = Math.max(0, Math.min(newPage, totalPages - 1));
    if (clamped === page) return;
    setVisible(false);
    setTimeout(() => {
      setPage(clamped);
      setVisible(true);
    }, 280);
  };

  useEffect(() => { getScores().then(setScores).catch(() => {}); }, []);

  const leaderboard = Object.values(
    scores.reduce((acc, s) => {
      const p = s.player;
      if (!acc[p]) acc[p] = { player: p, bestScore: 0, bestGame: "", totalScore: 0 };
      acc[p].totalScore += s.score;
      if (s.score > acc[p].bestScore) { acc[p].bestScore = s.score; acc[p].bestGame = s.gameName; }
      return acc;
    }, {})
  ).sort((a, b) => b.bestScore - a.bestScore).slice(0, 8);

  const top3 = leaderboard.slice(0, 3);
  const rest  = leaderboard.slice(3);
  const shortAddr = (a) => a ? a.slice(0, 7) + "..." + a.slice(-4) : "—";
  const fmtScore  = (s) => s >= 1000000 ? (s/1000000).toFixed(1)+"M" : s >= 1000 ? (s/1000).toFixed(1)+"K" : (s ? String(s) : "—");

  return (
    <div style={{ height: "calc(100vh - 54px)", overflow: "hidden", display: "grid", gridTemplateColumns: "1fr 280px", background: "#08070f" }}>

      <style>{`
        @keyframes bgBreath { 0%,100%{opacity:0.88;transform:scale(1)} 50%{opacity:1;transform:scale(1.025)} }
        @keyframes tagFloat  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
        @keyframes lbPulse   { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes medalGlow { 0%,100%{filter:drop-shadow(0 0 4px rgba(255,215,0,0.4))} 50%{filter:drop-shadow(0 0 8px rgba(255,215,0,0.8))} }
      `}</style>

      {/* ══════ LEFT ══════ */}
      <div style={{ position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", borderRight: "1px solid rgba(123,47,255,0.1)", height: "100%" }}>

        {/* Portal BG */}
        <img src="/Bg-website.png" alt="" aria-hidden="true" style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover", objectPosition: "60% center",
          animation: "bgBreath 5s ease-in-out infinite",
          pointerEvents: "none", zIndex: 0,
        }} />

        {/* Left-side dark so text readable, fades right */}
        <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
          background: "linear-gradient(105deg, rgba(8,7,15,0.97) 0%, rgba(8,7,15,0.92) 28%, rgba(8,7,15,0.2) 58%, transparent 100%)" }} />

        {/* Hero: text | portal tags */}
        <div style={{ position: "relative", zIndex: 2, flex: 1, display: "grid", gridTemplateColumns: "420px 1fr", minHeight: 0 }}>

          {/* TEXT SIDE */}
          <div style={{ padding: "16px 36px", display: "flex", flexDirection: "column", justifyContent: "center" }}>

            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "4px 11px", border: "1px solid rgba(180,150,255,0.25)",
              borderRadius: 4, fontSize: 9, color: "rgba(210,190,255,0.75)",
              letterSpacing: "1.5px", textTransform: "uppercase",
              marginBottom: 14, width: "fit-content",
              background: "rgba(123,47,255,0.1)",
              fontFamily: "'Rajdhani',sans-serif", fontWeight: 600,
            }}>
              Built on Initia · Owned by Players
            </div>

            <h1 style={{
              fontSize: 48, fontWeight: 700, lineHeight: 0.93,
              letterSpacing: "-0.5px", marginBottom: 12,
              fontFamily: "'Rajdhani',sans-serif", textTransform: "uppercase", color: "#fff",
            }}>
              Play. Earn.<br />Dominate<br />
              <span style={{ background: "linear-gradient(90deg,#7B2FFF,#00d4ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                The Chain.
              </span>
            </h1>

            <p style={{ fontSize: 13, color: "rgba(220,200,255,0.6)", lineHeight: 1.65, maxWidth: 340, marginBottom: 16 }}>
              Discover, play and publish fully on-chain games.<br />
              True ownership. Real rewards. Infinite possibilities.
            </p>

            <div style={{ display: "flex", gap: 9, marginBottom: 10 }}>
              <button onClick={() => navigate("/games")} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "11px 22px",
                background: "linear-gradient(135deg,#7B2FFF,#5a1fd4)", border: "none", borderRadius: 7,
                fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer",
                fontFamily: "'Rajdhani',sans-serif", letterSpacing: "1px", textTransform: "uppercase", transition: "all 0.18s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background="linear-gradient(135deg,#8f44ff,#6b2fe8)"; e.currentTarget.style.transform="translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background="linear-gradient(135deg,#7B2FFF,#5a1fd4)"; e.currentTarget.style.transform="translateY(0)"; }}
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <rect x="1" y="1" width="5" height="5" rx="1" fill="white" opacity="0.9"/>
                  <rect x="7" y="1" width="5" height="5" rx="1" fill="white" opacity="0.55"/>
                  <rect x="1" y="7" width="5" height="5" rx="1" fill="white" opacity="0.55"/>
                  <rect x="7" y="7" width="5" height="5" rx="1" fill="white" opacity="0.25"/>
                </svg>
                Play Games
              </button>
              <button onClick={() => navigate("/publish")} style={{
                padding: "11px 20px", background: "rgba(123,47,255,0.09)",
                border: "1px solid rgba(180,150,255,0.28)", borderRadius: 7,
                fontSize: 12, fontWeight: 700, color: "rgba(210,185,255,0.85)", cursor: "pointer",
                fontFamily: "'Rajdhani',sans-serif", letterSpacing: "1px", textTransform: "uppercase", transition: "all 0.18s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(180,150,255,0.5)"; e.currentTarget.style.color="#d4b8ff"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(180,150,255,0.28)"; e.currentTarget.style.color="rgba(210,185,255,0.85)"; }}
              >
                Publish Game +
              </button>
            </div>

            <button onClick={() => navigate("/games")} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "0", background: "transparent", border: "none",
              fontSize: 11, color: "rgba(180,150,255,0.55)", cursor: "pointer",
              fontFamily: "'Rajdhani',sans-serif", fontWeight: 700,
              letterSpacing: "1px", textTransform: "uppercase",
              transition: "color 0.18s", marginBottom: 10, width: "fit-content",
            }}
            onMouseEnter={e => e.currentTarget.style.color = "#c4a0ff"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(180,150,255,0.55)"}
            >
              Explore All Games
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <div style={{ fontSize: 9, color: "rgba(180,155,220,0.35)", letterSpacing: "0.3px", marginBottom: 10 }}>
              Powered by Initia · Fast · Secure · Interoperable
            </div>

            {isConnected ? <EnableAutoSign /> : (
              <button onClick={openConnect} style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "8px 13px", background: "rgba(0,255,136,0.05)",
                border: "1px solid rgba(0,255,136,0.15)", borderRadius: 7,
                color: "rgba(0,255,136,0.55)", fontSize: 10, cursor: "pointer",
                width: "fit-content", fontFamily: "inherit", transition: "all 0.18s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(0,255,136,0.3)"; e.currentTarget.style.color="rgba(0,255,136,0.8)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(0,255,136,0.15)"; e.currentTarget.style.color="rgba(0,255,136,0.55)"; }}
              >
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(0,255,136,0.35)" }} />
                Connect wallet to enable auto-sign
              </button>
            )}
          </div>

          {/* PORTAL FLOATING TAGS */}
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: "5%", top: "30%", background: "rgba(8,7,15,0.82)", border: "1px solid rgba(123,47,255,0.45)", borderRadius: 8, padding: "9px 13px", backdropFilter: "blur(14px)", animation: "tagFloat 3.2s ease-in-out infinite", zIndex: 3 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                <span style={{ fontSize: 9, color: "rgba(180,150,255,0.7)" }}>◈</span>
                <span style={{ fontSize: 8, color: "rgba(200,170,255,0.6)", textTransform: "uppercase", letterSpacing: "1px", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700 }}>Own</span>
              </div>
              <div style={{ fontSize: 12, color: "#d4b8ff", fontWeight: 700, fontFamily: "'Rajdhani',sans-serif" }}>Your Assets</div>
            </div>
            <div style={{ position: "absolute", right: "4%", top: "18%", background: "rgba(8,7,15,0.82)", border: "1px solid rgba(0,212,255,0.4)", borderRadius: 8, padding: "9px 13px", backdropFilter: "blur(14px)", animation: "tagFloat 3.5s ease-in-out infinite", animationDelay: "0.7s", zIndex: 3 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                <span style={{ fontSize: 9, color: "rgba(0,212,255,0.7)" }}>◎</span>
                <span style={{ fontSize: 8, color: "rgba(0,212,255,0.6)", textTransform: "uppercase", letterSpacing: "1px", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700 }}>Earn</span>
              </div>
              <div style={{ fontSize: 12, color: "#00d4ff", fontWeight: 700, fontFamily: "'Rajdhani',sans-serif" }}>Real Rewards</div>
            </div>
            <div style={{ position: "absolute", right: "4%", bottom: "28%", background: "rgba(8,7,15,0.82)", border: "1px solid rgba(0,255,136,0.35)", borderRadius: 8, padding: "9px 13px", backdropFilter: "blur(14px)", animation: "tagFloat 2.9s ease-in-out infinite", animationDelay: "1.4s", zIndex: 3 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                <span style={{ fontSize: 9, color: "rgba(0,255,136,0.65)" }}>▶</span>
                <span style={{ fontSize: 8, color: "rgba(0,255,136,0.55)", textTransform: "uppercase", letterSpacing: "1px", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700 }}>Play</span>
              </div>
              <div style={{ fontSize: 12, color: "#00FF88", fontWeight: 700, fontFamily: "'Rajdhani',sans-serif" }}>No Limits</div>
            </div>
          </div>
        </div>

        {/* FEATURED GAMES */}
        {featured.length > 0 && (
          <div
            style={{ position: "relative", zIndex: 2, flexShrink: 0, padding: "8px 36px 10px", borderTop: "1px solid rgba(123,47,255,0.1)", background: "transparent" }}
            onWheel={e => { e.preventDefault(); if (e.deltaY > 0) goTo(page + 1); else goTo(page - 1); }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: "rgba(210,185,255,0.8)", textTransform: "uppercase", letterSpacing: "2px", fontWeight: 700, fontFamily: "'Rajdhani',sans-serif" }}>
                Featured Games
              </span>
              {totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 9, color: "rgba(180,150,255,0.45)", fontFamily: "'Orbitron',sans-serif" }}>{page + 1} / {totalPages}</span>
                  <div style={{ display: "flex", gap: 5 }}>
                    {[["prev", page === 0], ["next", page >= totalPages - 1]].map(([dir, disabled]) => (
                      <button key={dir} onClick={() => goTo(dir === "prev" ? page - 1 : page + 1)} disabled={disabled} style={{
                        width: 22, height: 22, borderRadius: "50%",
                        cursor: disabled ? "not-allowed" : "pointer",
                        background: disabled ? "rgba(123,47,255,0.04)" : "rgba(123,47,255,0.16)",
                        border: `1px solid ${disabled ? "rgba(123,47,255,0.08)" : "rgba(123,47,255,0.38)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.18s",
                      }}
                      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = "rgba(123,47,255,0.3)"; }}
                      onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = "rgba(123,47,255,0.16)"; }}
                      >
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          {dir === "prev"
                            ? <path d="M5 1.5L2 4l3 2.5" stroke={disabled ? "rgba(123,47,255,0.25)" : "#c4a0ff"} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                            : <path d="M3 1.5l3 2.5-3 2.5" stroke={disabled ? "rgba(123,47,255,0.25)" : "#c4a0ff"} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                          }
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{
              display: "grid", gridTemplateColumns: "repeat(3, 250px)", gap: 6,
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0px)" : "translateY(12px)",
              transition: "opacity 0.28s ease, transform 0.28s ease",
            }}>
              {currentCards.map(game => <GameCard key={game.id} game={game} />)}
            </div>

            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 6 }}>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button key={i} onClick={() => goTo(i)} style={{
                    width: i === page ? 16 : 5, height: 4, borderRadius: 3,
                    background: i === page ? "#7B2FFF" : "rgba(123,47,255,0.22)",
                    border: "none", cursor: "pointer", padding: 0, transition: "all 0.25s ease",
                  }} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════ RIGHT: Leaderboard ══════ */}
      <div style={{
        display: "flex", flexDirection: "column", overflow: "hidden",
        background: "linear-gradient(180deg, #0f0820 0%, #0a0618 40%, #0d0a20 100%)",
        borderLeft: "1px solid rgba(123,47,255,0.15)",
        position: "relative",
      }}>
        <div style={{ position: "absolute", top: -40, left: "50%", transform: "translateX(-50%)", width: 200, height: 200, background: "radial-gradient(circle, rgba(123,47,255,0.18) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

        {/* Header */}
        <div style={{ position:"relative", zIndex:1, padding:"10px 14px 10px", borderBottom:"1px solid rgba(123,47,255,0.15)", flexShrink:0 }}>
          {/* Top row: title + live + view all */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
            <span style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:11, textTransform:"uppercase", letterSpacing:"1.5px", color:"#e0d0ff" }}>
              Live Leaderboard
            </span>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                <span style={{ width:5, height:5, borderRadius:"50%", background:"#00FF88", animation:"lbPulse 1.5s ease-in-out infinite" }} />
                <span style={{ fontSize:9, color:"#4aaa6a", fontFamily:"'Rajdhani',sans-serif", fontWeight:700 }}>Live</span>
              </div>
              <button onClick={()=>navigate("/leaderboard")} style={{ fontSize:9, color:"#8866cc", background:"transparent", border:"none", cursor:"pointer", fontFamily:"'Rajdhani',sans-serif", fontWeight:700, letterSpacing:"0.5px", textTransform:"uppercase", transition:"color 0.15s" }}
              onMouseEnter={e=>e.currentTarget.style.color="#c4a0ff"}
              onMouseLeave={e=>e.currentTarget.style.color="#8866cc"}
              >View All</button>
            </div>
          </div>
          {/* ARCADE balance row */}
          {isConnected && balance !== null && (
            <div style={{ display:"flex", alignItems:"center", gap:7, padding:"7px 10px", background:"rgba(123,47,255,0.08)", border:"1px solid rgba(123,47,255,0.18)", borderRadius:7 }}>
              {/* ARCADE coin icon */}
              <div style={{
                width:22, height:22, borderRadius:"50%",
                background:"linear-gradient(135deg,#7B2FFF,#00d4ff)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:10, fontWeight:900, color:"#fff",
                fontFamily:"'Orbitron',sans-serif", flexShrink:0,
                boxShadow:"0 0 6px rgba(123,47,255,0.5)",
              }}>A</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:"'Orbitron',sans-serif", fontWeight:700, fontSize:11, color:"#a67fff", lineHeight:1 }}>
                  {Number(balance).toLocaleString()}
                </div>
                <div style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:8, color:"#5533aa", textTransform:"uppercase", letterSpacing:"0.5px" }}>ARCADE Balance</div>
              </div>
            </div>
          )}
        </div>

        {/* ── Top 3 Podium ── */}
        <div style={{ position:"relative", zIndex:1, padding:"14px 8px 12px", borderBottom:"1px solid rgba(123,47,255,0.1)", display:"flex", justifyContent:"center", alignItems:"flex-end", gap:10, flexShrink:0 }}>

          {/* 2nd place */}
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
            <div style={{ width:38, height:38, borderRadius:"50%", background:"rgba(123,47,255,0.2)", border:"2px solid rgba(192,192,192,0.5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
              🥈
            </div>
            <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:6, color:"#7755aa", textAlign:"center", maxWidth:58, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {top3[1] ? shortAddr(top3[1].player) : "—"}
            </div>
            <div style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:12, color:"#C0C0C0" }}>
              {top3[1] ? fmtScore(top3[1].bestScore) : "—"}
            </div>
          </div>

          {/* 1st place */}
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, marginBottom:10 }}>
            <div style={{ width:46, height:46, borderRadius:"50%", background:"rgba(123,47,255,0.15)", border:"2px solid rgba(255,215,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, boxShadow:"0 0 20px rgba(255,215,0,0.25)" }}>
              🥇
            </div>
            <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:6, color:"#9977dd", textAlign:"center", maxWidth:68, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {top3[0] ? shortAddr(top3[0].player) : "—"}
            </div>
            <div style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:15, color:"#d4b8ff" }}>
              {top3[0] ? fmtScore(top3[0].bestScore) : "0.0K"}
            </div>
          </div>

          {/* 3rd place */}
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
            <div style={{ width:38, height:38, borderRadius:"50%", background:"rgba(123,47,255,0.15)", border:"2px solid rgba(205,127,50,0.5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
              🥉
            </div>
            <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:6, color:"#6644aa", textAlign:"center", maxWidth:58, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {top3[2] ? shortAddr(top3[2].player) : "—"}
            </div>
            <div style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:12, color:"#CD7F32" }}>
              {top3[2] ? fmtScore(top3[2].bestScore) : "—"}
            </div>
          </div>
        </div>

        {/* Rows 4-8 + Initia Panel — dono hamesha dikhenge */}
        <div style={{ flex:1, overflowY:"auto", position:"relative", zIndex:1 }}>

          {/* Score rows 4-8 */}
          {rest.map((row, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 14px", borderBottom:"1px solid rgba(123,47,255,0.07)", cursor:"pointer", transition:"background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(123,47,255,0.08)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ fontFamily:"'Orbitron',sans-serif", fontSize:8, color:"#7755aa", width:14, textAlign:"center", flexShrink:0 }}>{i+4}</span>
              <div style={{ width:24, height:24, borderRadius:"50%", background:"rgba(123,47,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:"#b899ff", fontFamily:"'Orbitron',sans-serif", flexShrink:0 }}>
                {row.player.slice(2,4).toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:7, color:"#9977cc", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{shortAddr(row.player)}</div>
                <div style={{ fontSize:9, color:"#7755aa", fontFamily:"'Rajdhani',sans-serif" }}>{row.bestGame||"—"}</div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:11, color:"#c4a0ff" }}>{fmtScore(row.bestScore)}</div>
              </div>
            </div>
          ))}

          {/* ── Initia Info Panel — hamesha visible ── */}
          <div style={{ padding:"10px" }}>
            <div style={{ background:"linear-gradient(180deg,rgba(20,8,40,0.95),rgba(10,4,25,0.98))", borderRadius:10, overflow:"hidden", border:"1px solid rgba(123,47,255,0.2)" }}>

              {/* Header */}
              <div style={{ padding:"14px 12px 12px", textAlign:"center", borderBottom:"1px solid rgba(123,47,255,0.1)", background:"rgba(123,47,255,0.05)" }}>
                <div style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:12, color:"#fff", textTransform:"uppercase", letterSpacing:"0.8px", lineHeight:1.5, marginBottom:7 }}>
                  Built on Initia.<br/>
                  <span style={{ background:"linear-gradient(90deg,#7B2FFF,#00d4ff)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
                    Powered by the Future.
                  </span>
                </div>
                <div style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:9, color:"#7755aa", lineHeight:1.7 }}>
                  Initia Arcade is built on Initia — the interwoven rollup network for scalable, secure on-chain gaming.
                </div>
              </div>

              {/* 4 features */}
              {[
                { title:"Built on Initia",       desc:"Leveraging Initia's L1 and interwoven rollups for unmatched scalability.",
                  svg:<svg width="26" height="26" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="13" r="12" fill="rgba(123,47,255,0.18)" stroke="rgba(123,47,255,0.55)" strokeWidth="1.2"/><text x="13" y="18" textAnchor="middle" fill="white" fontSize="13" fontWeight="900" fontFamily="Arial Black,Arial">I</text></svg> },
                { title:"True Ownership",         desc:"Every asset you earn or create is on-chain. You own it. Always.",
                  svg:<svg width="26" height="26" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="13" r="12" fill="rgba(123,47,255,0.18)" stroke="rgba(123,47,255,0.55)" strokeWidth="1.2"/><path d="M13 7l1.8 3.6 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4L7.2 11.2l4-.6z" stroke="#c4a0ff" strokeWidth="1.1" fill="none" strokeLinejoin="round"/></svg> },
                { title:"Play. Earn. Repeat.",    desc:"Engage in gameplay. Earn real rewards. Grow your journey.",
                  svg:<svg width="26" height="26" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="13" r="12" fill="rgba(123,47,255,0.18)" stroke="rgba(123,47,255,0.55)" strokeWidth="1.2"/><rect x="7" y="11" width="12" height="7" rx="2" stroke="#c4a0ff" strokeWidth="1.1" fill="none"/><path d="M10 14.5v-2M9 13.5h2" stroke="#c4a0ff" strokeWidth="1" strokeLinecap="round"/><circle cx="16" cy="14.5" r="0.8" fill="#c4a0ff"/><path d="M10 11V8.5M16 11V8.5" stroke="#c4a0ff" strokeWidth="1" strokeLinecap="round"/></svg> },
                { title:"Interoperable Future",   desc:"Seamlessly connect, trade, and build across the Initia ecosystem.",
                  svg:<svg width="26" height="26" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="13" r="12" fill="rgba(123,47,255,0.18)" stroke="rgba(123,47,255,0.55)" strokeWidth="1.2"/><circle cx="13" cy="13" r="2.5" fill="#c4a0ff" opacity="0.9"/><circle cx="7" cy="9.5" r="1.8" stroke="#c4a0ff" strokeWidth="1" fill="none"/><circle cx="19" cy="9.5" r="1.8" stroke="#c4a0ff" strokeWidth="1" fill="none"/><circle cx="7" cy="16.5" r="1.8" stroke="#c4a0ff" strokeWidth="1" fill="none"/><circle cx="19" cy="16.5" r="1.8" stroke="#c4a0ff" strokeWidth="1" fill="none"/><path d="M8.7 10.7l2.8 1.5M17.3 10.7l-2.8 1.5M8.7 15.3l2.8-1.5M17.3 15.3l-2.8-1.5" stroke="#c4a0ff" strokeWidth="0.9" strokeLinecap="round" opacity="0.7"/></svg> },
              ].map((item, i) => (
                <div key={i} style={{ display:"flex", gap:9, padding:"11px 12px", borderBottom:i<3?"1px solid rgba(123,47,255,0.07)":"none", alignItems:"flex-start" }}>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0 }}>
                    {item.svg}
                    {i<3 && <div style={{ width:1, height:14, background:"rgba(123,47,255,0.3)", marginTop:2 }} />}
                  </div>
                  <div style={{ paddingTop:2 }}>
                    <div style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:10, color:"#c4a0ff", marginBottom:3 }}>{item.title}</div>
                    <div style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:8.5, color:"#7755aa", lineHeight:1.6 }}>{item.desc}</div>
                  </div>
                </div>
              ))}

              {/* Footer */}
              <div style={{ padding:"11px 12px", borderTop:"1px solid rgba(123,47,255,0.1)", display:"flex", alignItems:"center", gap:8, background:"rgba(123,47,255,0.04)" }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" fill="#1a0a2e" stroke="rgba(123,47,255,0.5)" strokeWidth="1"/><text x="10" y="14.5" textAnchor="middle" fill="white" fontSize="11" fontWeight="900" fontFamily="Arial Black,Arial">I</text></svg>
                <div>
                  <div style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:10, color:"#c4a0ff" }}>Initia</div>
                  <div style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:8, color:"#5533aa" }}>One Network. Infinite Games.</div>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Footer */}
        <div style={{ padding: "8px 14px", borderTop: "1px solid rgba(123,47,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, flexShrink: 0, position: "relative", zIndex: 1 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00FF88", animation: "lbPulse 1.5s ease-in-out infinite" }} />
          <span style={{ fontSize: 9, color: "#4aaa6a", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700 }}>Live Updates</span>
        </div>
      </div>
    </div>
  );
}
