import { useState, useEffect } from "react";
import { useInterwovenKit } from "@initia/interwovenkit-react";
import { useAccount } from "wagmi";
import { getAllGames, approveGameInFirebase, rejectGameInFirebase } from "../lib/gameService";

const CONTRACT = "0xd1aa08d2de31ca1af55682f4185547f92332bee";
const ADMIN    = "init1amxedetgfud5nsnht7kmuh0xajcp9uktclq7sh";

const P = {
  p:"#7B2FFF", p2:"rgba(123,47,255,0.14)", p3:"rgba(123,47,255,0.06)",
  pb:"rgba(123,47,255,0.25)", bg:"#08070f", s1:"#0e0c1a", s2:"#12101f",
  b:"rgba(123,47,255,0.12)", b2:"rgba(123,47,255,0.22)",
  raj:"'Rajdhani',sans-serif", orb:"'Orbitron',sans-serif",
};

function encodeU64(value) {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setBigUint64(0, BigInt(value), true);
  return new Uint8Array(buf);
}

const statusMap = {
  approved:{ bg:"rgba(0,255,136,0.08)",  color:"#00FF88", border:"rgba(0,255,136,0.2)",  label:"✓ Live" },
  pending: { bg:"rgba(255,184,0,0.08)",  color:"#FFB800", border:"rgba(255,184,0,0.2)",  label:"⏳ Pending" },
  rejected:{ bg:"rgba(255,68,68,0.08)",  color:"#ff4444", border:"rgba(255,68,68,0.2)",  label:"✗ Rejected" },
};

function GamePreviewModal({ game, onClose, onApprove, onReject, loading }) {
  if (!game) return null;
  const s = statusMap[game.status] || statusMap.pending;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,0.92)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}
      onClick={onClose}>
      <div style={{ background:P.s1, border:`1px solid ${P.b2}`, borderRadius:14, width:"100%", maxWidth:580, position:"relative", overflow:"hidden", boxShadow:"0 24px 60px rgba(0,0,0,0.8)" }}
        onClick={e=>e.stopPropagation()}>

        <div style={{ height:240, background:"#060510", position:"relative" }}>
          {game.thumbnailUrl ? (
            <img src={game.thumbnailUrl} alt={game.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          ) : game.iframeUrl ? (
            <iframe src={game.iframeUrl} style={{ width:"100%", height:"100%", border:"none" }} title={game.name} />
          ) : (
            <div style={{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:52, filter:"drop-shadow(0 0 20px rgba(123,47,255,0.4))" }}>🎮</div>
          )}
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(14,12,26,0.8), transparent)", pointerEvents:"none" }} />
          <span style={{ position:"absolute", top:12, left:12, padding:"3px 9px", borderRadius:4, fontSize:9, fontWeight:700, background:s.bg, color:s.color, border:`1px solid ${s.border}`, fontFamily:P.raj, letterSpacing:"0.5px" }}>{s.label}</span>
          <button onClick={onClose} style={{ position:"absolute", top:10, right:10, background:"rgba(8,7,15,0.85)", border:`1px solid ${P.b2}`, borderRadius:6, color:"#a67fff", fontSize:11, padding:"5px 11px", cursor:"pointer", fontFamily:P.raj, fontWeight:700 }}>✕ Close</button>
        </div>

        <div style={{ padding:22 }}>
          <div style={{ fontFamily:P.raj, fontWeight:700, fontSize:18, color:"#fff", marginBottom:4 }}>{game.name}</div>
          <div style={{ fontSize:12, color:"#5533aa", marginBottom:18, lineHeight:1.6, fontFamily:P.raj }}>{game.description||"No description"}</div>

          {[
            ["Game ID",`#${game.gameId}`],["Category",game.category],
            ["Creator",game.creator],["Game URL",game.iframeUrl],
            ["Reward Rate",`${game.rewardRate} ARCADE per play`],
            ["Submitted",game.createdAt?.toDate?.()?.toLocaleDateString()||"Recently"],
            ["TX Hash",game.txHash?.slice(0,20)+"..."||"N/A"],
          ].map(([k,v])=>(
            <div key={k} style={{ display:"flex", justifyContent:"space-between", fontSize:11, padding:"7px 0", borderBottom:`1px solid ${P.b}` }}>
              <span style={{ color:"#5533aa", minWidth:100, fontFamily:P.raj }}>{k}</span>
              <span style={{ color:"#c4a0ff", textAlign:"right", wordBreak:"break-all", maxWidth:360, fontFamily:k==="Creator"||k==="TX Hash"?"monospace":P.raj, fontWeight:600 }}>{v}</span>
            </div>
          ))}

          {game.status==="pending" && (
            <div style={{ display:"flex", gap:10, marginTop:18 }}>
              <button onClick={()=>onReject(game)} disabled={loading}
                style={{ flex:1, padding:"11px", background:"rgba(255,68,68,0.08)", border:"1px solid rgba(255,68,68,0.22)", borderRadius:8, color:"#ff4444", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:P.raj, letterSpacing:"0.5px" }}>
                {loading?"...":"✗ Reject"}
              </button>
              <button onClick={()=>onApprove(game)} disabled={loading}
                style={{ flex:2, padding:"11px", background:loading?"rgba(123,47,255,0.2)":"linear-gradient(135deg,#7B2FFF,#5a1fd4)", border:"none", borderRadius:8, color:loading?"#5533aa":"#fff", fontSize:12, fontWeight:700, cursor:loading?"not-allowed":"pointer", fontFamily:P.raj, letterSpacing:"0.5px" }}>
                {loading?"Processing...":"✓ Approve Game"}
              </button>
            </div>
          )}
          {game.status==="approved" && (
            <div style={{ marginTop:16, padding:11, background:"rgba(0,255,136,0.06)", border:"1px solid rgba(0,255,136,0.15)", borderRadius:7, fontSize:11, color:"#00FF88", textAlign:"center", fontFamily:P.raj, fontWeight:700 }}>
              ✓ This game is live — players can find it in the library
            </div>
          )}
          {game.status==="rejected" && (
            <div style={{ marginTop:16, padding:11, background:"rgba(255,68,68,0.06)", border:"1px solid rgba(255,68,68,0.15)", borderRadius:7, fontSize:11, color:"#ff4444", textAlign:"center", fontFamily:P.raj, fontWeight:700 }}>
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
  const [games, setGames]               = useState([]);
  const [loading, setLoading]           = useState(false);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [log, setLog]                   = useState("");
  const [activeTab, setActiveTab]       = useState("pending");

  const isAdmin = initiaAddress === ADMIN;

  const fetchGames = async () => {
    setGamesLoading(true);
    try { setGames(await getAllGames()); } catch(e){ console.error(e); }
    finally { setGamesLoading(false); }
  };

  useEffect(()=>{ if(isAdmin) fetchGames(); },[isAdmin]);

  const approveGame = async(game)=>{
    setLoading(true);
    try {
      await requestTxBlock({ messages:[{ typeUrl:"/initia.move.v1.MsgExecute", value:{ sender:initiaAddress, moduleAddress:CONTRACT, moduleName:"platform", functionName:"approve_game", typeArgs:[], args:[encodeU64(game.gameId)] } }] });
      await approveGameInFirebase(game.gameId);
      setLog(`✓ Game #${game.gameId} "${game.name}" approved!`);
      setSelectedGame(null); await fetchGames();
    } catch(e){ setLog(`Error: ${e.message}`); }
    finally { setLoading(false); }
  };

  const rejectGame = async(game)=>{
    setLoading(true);
    try {
      await rejectGameInFirebase(game.gameId);
      setLog(`✗ Game #${game.gameId} "${game.name}" rejected.`);
      setSelectedGame(null); await fetchGames();
    } catch(e){ setLog(`Error: ${e.message}`); }
    finally { setLoading(false); }
  };

  // ── Gate screens
  if (!isConnected) return (
    <div style={{ minHeight:"calc(100vh - 54px)", background:P.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:64, height:64, borderRadius:"50%", background:P.p2, border:`1px solid ${P.pb}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, margin:"0 auto 16px" }}>🔐</div>
        <div style={{ fontFamily:P.raj, fontWeight:700, fontSize:16, color:"#c4a0ff" }}>Connect wallet to access admin panel</div>
      </div>
    </div>
  );

  if (!isAdmin) return (
    <div style={{ minHeight:"calc(100vh - 54px)", background:P.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:64, height:64, borderRadius:"50%", background:"rgba(255,68,68,0.1)", border:"1px solid rgba(255,68,68,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, margin:"0 auto 16px" }}>🚫</div>
        <div style={{ fontFamily:P.raj, fontWeight:700, fontSize:16, color:"#ff4444", marginBottom:8 }}>Access Denied — Admin Only</div>
        <div style={{ fontFamily:"monospace", fontSize:10, color:"#3a2a5a" }}>{initiaAddress}</div>
      </div>
    </div>
  );

  const pendingGames  = games.filter(g=>g.status==="pending");
  const approvedGames = games.filter(g=>g.status==="approved");
  const rejectedGames = games.filter(g=>g.status==="rejected");
  const tabGames = {pending:pendingGames,approved:approvedGames,rejected:rejectedGames}[activeTab]||[];

  const tabColor = { pending:"#FFB800", approved:"#00FF88", rejected:"#ff4444" };

  return (
    <div style={{ minHeight:"calc(100vh - 54px)", background:P.bg, padding:"28px 36px" }}>
      <style>{`
        @keyframes lbPulse{0%,100%{opacity:1}50%{opacity:0.3}}
        .adm-row:hover { background: rgba(123,47,255,0.06) !important; border-color: rgba(123,47,255,0.3) !important; }
        .adm-tab:hover { color: #c4a0ff !important; }
      `}</style>

      <div style={{ maxWidth:980, margin:"0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom:24 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 11px", border:`1px solid ${P.pb}`, borderRadius:4, fontSize:9, color:"rgba(200,170,255,0.6)", letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:14, background:P.p3, fontFamily:P.raj, fontWeight:600 }}>
            <span style={{ width:5, height:5, borderRadius:"50%", background:"#ff4444", animation:"lbPulse 1.5s ease-in-out infinite" }} />
            Admin Access · InitiaArcade
          </div>
          <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
            <div>
              <h1 style={{ fontFamily:P.raj, fontWeight:700, fontSize:36, textTransform:"uppercase", letterSpacing:"-0.3px", color:"#fff", marginBottom:4 }}>
                Admin{" "}
                <span style={{ background:"linear-gradient(90deg,#7B2FFF,#ff4444)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>Dashboard</span>
              </h1>
              <p style={{ color:"#5533aa", fontSize:12, fontFamily:P.raj }}>Platform management — only you can see this.</p>
            </div>
            <button onClick={fetchGames} style={{
              padding:"8px 18px", background:P.p3, border:`1px solid ${P.b2}`,
              borderRadius:7, color:"#a67fff", fontSize:11, cursor:"pointer",
              fontFamily:P.raj, fontWeight:700, letterSpacing:"0.5px", textTransform:"uppercase", transition:"all 0.18s",
            }}
            onMouseEnter={e=>{e.currentTarget.style.background=P.p2}}
            onMouseLeave={e=>{e.currentTarget.style.background=P.p3}}
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:24 }}>
          {[
            { label:"Total Games",   value:games.length,         color:"#a67fff" },
            { label:"Pending",       value:pendingGames.length,  color:"#FFB800" },
            { label:"Live",          value:approvedGames.length, color:"#00FF88" },
            { label:"Rejected",      value:rejectedGames.length, color:"#ff4444" },
          ].map(s=>(
            <div key={s.label} style={{ background:P.s1, border:`1px solid ${P.b}`, borderRadius:10, padding:"16px 18px", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:-16, right:-16, width:70, height:70, background:`radial-gradient(circle,${s.color}15 0%,transparent 70%)`, borderRadius:"50%", pointerEvents:"none" }} />
              <div style={{ fontSize:9, color:"#5533aa", textTransform:"uppercase", letterSpacing:"1.2px", fontFamily:P.raj, fontWeight:700, marginBottom:6 }}>{s.label}</div>
              <div style={{ fontFamily:P.orb, fontWeight:700, fontSize:28, color:s.color, letterSpacing:"-1px", lineHeight:1 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:0, marginBottom:20, borderBottom:`1px solid ${P.b}` }}>
          {[
            { id:"pending",  label:`Pending (${pendingGames.length})`,  color:"#FFB800" },
            { id:"approved", label:`Approved (${approvedGames.length})`, color:"#00FF88" },
            { id:"rejected", label:`Rejected (${rejectedGames.length})`, color:"#ff4444" },
          ].map(t=>(
            <button key={t.id} className="adm-tab" onClick={()=>setActiveTab(t.id)} style={{
              padding:"9px 20px", background:"transparent", border:"none",
              borderBottom: activeTab===t.id ? `2px solid ${t.color}` : "2px solid transparent",
              color: activeTab===t.id ? t.color : "#3a2a5a",
              fontSize:11, cursor:"pointer", marginBottom:"-1px",
              fontFamily:P.raj, fontWeight:700, letterSpacing:"0.5px",
              textTransform:"uppercase", transition:"color 0.18s",
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Games list */}
        {gamesLoading ? (
          <div style={{ padding:48, textAlign:"center", fontSize:11, color:"#5533aa", fontFamily:P.raj, textTransform:"uppercase", letterSpacing:"2px" }}>Loading from database...</div>
        ) : tabGames.length===0 ? (
          <div style={{ padding:56, textAlign:"center" }}>
            <div style={{ width:52, height:52, borderRadius:"50%", background:P.p2, border:`1px solid ${P.pb}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, margin:"0 auto 14px" }}>
              {activeTab==="pending"?"📋":activeTab==="approved"?"✅":"❌"}
            </div>
            <div style={{ fontFamily:P.raj, fontWeight:700, fontSize:14, color:"#7755aa" }}>No {activeTab} games</div>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {tabGames.map(game=>{
              const s = statusMap[game.status]||statusMap.pending;
              return (
                <div key={game.id} className="adm-row"
                  style={{ background:P.s1, border:`1px solid ${P.b}`, borderRadius:9, padding:"13px 18px", display:"flex", alignItems:"center", gap:14, cursor:"pointer", transition:"all 0.2s" }}
                  onClick={()=>setSelectedGame(game)}>

                  {/* Thumbnail */}
                  <div style={{ width:56, height:40, borderRadius:6, overflow:"hidden", background:"#060510", flexShrink:0 }}>
                    {game.thumbnailUrl
                      ? <img src={game.thumbnailUrl} alt={game.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                      : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🎮</div>
                    }
                  </div>

                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:P.raj, fontWeight:700, fontSize:13, color:"#d4b8ff", marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{game.name}</div>
                    <div style={{ fontSize:9, color:"#5533aa", fontFamily:P.raj }}>Game #{game.gameId} · {game.category} · {game.creator?.slice(0,16)}...</div>
                  </div>

                  {/* Reward */}
                  <div style={{ textAlign:"center", flexShrink:0 }}>
                    <div style={{ fontFamily:P.orb, fontSize:12, color:"#a67fff", fontWeight:700 }}>{game.rewardRate}</div>
                    <div style={{ fontSize:8, color:"#5533aa", fontFamily:P.raj }}>ARCADE/play</div>
                  </div>

                  {/* Date */}
                  <div style={{ textAlign:"center", flexShrink:0 }}>
                    <div style={{ fontSize:10, color:"#7755aa", fontFamily:P.raj }}>{game.createdAt?.toDate?.()?.toLocaleDateString()||"Recent"}</div>
                    <div style={{ fontSize:8, color:"#3a2a5a", fontFamily:P.raj }}>submitted</div>
                  </div>

                  {/* Quick actions */}
                  {activeTab==="pending" && (
                    <div style={{ display:"flex", gap:7, flexShrink:0 }} onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>rejectGame(game)} disabled={loading} style={{
                        padding:"5px 13px", background:"rgba(255,68,68,0.08)", border:"1px solid rgba(255,68,68,0.2)",
                        borderRadius:6, color:"#ff4444", fontSize:10, cursor:"pointer",
                        fontFamily:P.raj, fontWeight:700, letterSpacing:"0.3px", transition:"all 0.15s",
                      }}>Reject</button>
                      <button onClick={()=>approveGame(game)} disabled={loading} style={{
                        padding:"5px 13px", background:"rgba(0,255,136,0.08)", border:"1px solid rgba(0,255,136,0.2)",
                        borderRadius:6, color:"#00FF88", fontSize:10, cursor:"pointer",
                        fontFamily:P.raj, fontWeight:700, letterSpacing:"0.3px", transition:"all 0.15s",
                      }}>{loading?"...":"Approve"}</button>
                    </div>
                  )}

                  <div style={{ fontSize:10, color:"#5533aa", flexShrink:0, fontFamily:P.raj }}>View →</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Platform Settings */}
        <div style={{ background:P.s1, border:`1px solid ${P.b}`, borderRadius:10, padding:20, marginTop:24 }}>
          <div style={{ fontFamily:P.raj, fontWeight:700, fontSize:14, color:"#c4a0ff", marginBottom:14 }}>Platform Settings</div>
          {[
            ["Platform fee","10%"],["Creator share","20%"],["Player share","70%"],
            ["Chain ID","initiation-2"],["Contract",CONTRACT],["Admin",ADMIN],
          ].map(([k,v])=>(
            <div key={k} style={{ display:"flex", justifyContent:"space-between", fontSize:11, padding:"8px 0", borderBottom:`1px solid ${P.b}` }}>
              <span style={{ color:"#5533aa", fontFamily:P.raj }}>{k}</span>
              <span style={{ color:"#9977cc", fontFamily:k==="Contract"||k==="Admin"?"monospace":P.raj, fontWeight:600, fontSize:k==="Contract"||k==="Admin"?10:11 }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Emergency */}
        <div style={{ background:"rgba(255,68,68,0.05)", border:"1px solid rgba(255,68,68,0.15)", borderRadius:10, padding:20, marginTop:10 }}>
          <div style={{ fontFamily:P.raj, fontWeight:700, fontSize:14, color:"#ff4444", marginBottom:6 }}>Emergency Controls</div>
          <div style={{ fontSize:11, color:"#5533aa", marginBottom:14, fontFamily:P.raj }}>Use only in case of emergency!</div>
          <button style={{ padding:"9px 22px", background:"rgba(255,68,68,0.1)", border:"1px solid rgba(255,68,68,0.25)", borderRadius:7, color:"#ff4444", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:P.raj, letterSpacing:"0.5px" }}>
            Pause Platform
          </button>
        </div>

        {/* Log */}
        {log && (
          <div style={{ marginTop:14, padding:14, background:log.startsWith("✓")?"rgba(0,255,136,0.06)":"rgba(255,68,68,0.06)", border:`1px solid ${log.startsWith("✓")?"rgba(0,255,136,0.18)":"rgba(255,68,68,0.18)"}`, borderRadius:9, fontSize:11, color:log.startsWith("✓")?"#00FF88":"#ff4444", wordBreak:"break-all", fontFamily:P.raj }}>
            {log}
          </div>
        )}
      </div>

      {selectedGame && (
        <GamePreviewModal game={selectedGame} onClose={()=>setSelectedGame(null)} onApprove={approveGame} onReject={rejectGame} loading={loading} />
      )}
    </div>
  );
}