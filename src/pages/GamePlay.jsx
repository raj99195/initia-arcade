import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useInterwovenKit } from "@initia/interwovenkit-react";
import { useAccount } from "wagmi";
import { useGames } from "../hooks/useGames";
import { saveScore } from "../lib/gameService";
import { db } from "../lib/firebase";
import { doc, updateDoc, increment, collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "firebase/firestore";

const CONTRACT = "0xd1aa08d2de31ca1af55682f4185547f92332bee";
const P = {
  bg:"#08070f", s1:"#0e0c1a",
  b:"rgba(123,47,255,0.12)", b2:"rgba(123,47,255,0.22)",
  raj:"'Rajdhani',sans-serif", orb:"'Orbitron',sans-serif",
};

function encodeU64(value) {
  const buf = new ArrayBuffer(8); const view = new DataView(buf);
  view.setBigUint64(0, BigInt(value), true); return new Uint8Array(buf);
}
function encodeAddress(hexAddr) {
  const hex = hexAddr.replace("0x","").padStart(64,"0");
  const bytes = new Uint8Array(32);
  for (let i=0;i<32;i++) bytes[i]=parseInt(hex.slice(i*2,i*2+2),16);
  return bytes;
}
function bech32ToHex(addr) {
  const charset="qpzry9x8gf2tvdw0s3jn54khce6mua7l";
  const stripped=addr.slice(addr.indexOf("1")+1); const data=[];
  for (const c of stripped){const idx=charset.indexOf(c);if(idx!==-1)data.push(idx);}
  const result=[];let acc=0,bits=0;
  for (const val of data.slice(0,-6)){acc=((acc<<5)|val)&0x1fff;bits+=5;if(bits>=8){bits-=8;result.push((acc>>bits)&0xff);}}
  return "0x"+result.map(b=>b.toString(16).padStart(2,"0")).join("");
}
function timeAgo(date) {
  if (!date) return "";
  const d = date?.toDate ? date.toDate() : new Date(date);
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

export default function GamePlay() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { games } = useGames();
  const game = games.find(g => g.id === Number(gameId));
  const { requestTxBlock, initiaAddress } = useInterwovenKit();
  const { isConnected } = useAccount();

  const [score, setScore]             = useState(0);
  const [submitting, setSubmitting]   = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [txHash, setTxHash]           = useState("");
  const [submitError, setSubmitError] = useState("");
  const [gameLoading, setGameLoading] = useState(true);
  const [tokensEarned, setTokensEarned] = useState(0);

  // Like — localStorage se persist
  const likeKey = `liked_game_${gameId}_${initiaAddress}`;
  const [liked, setLiked]         = useState(() => !!localStorage.getItem(`liked_game_${gameId}_${initiaAddress || 'anon'}`));
  const [likeCount, setLikeCount] = useState(0);

  // Comments
  const [comments, setComments]         = useState([]);
  const [commentText, setCommentText]   = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const commentsEndRef = useRef(null);

  const iframeRef     = useRef(null);
  const submittingRef = useRef(false);

  useEffect(() => { if (games.length > 0) setGameLoading(false); }, [games]);
  useEffect(() => { if (game) setLikeCount(game.likes || 0); }, [game]);
  useEffect(() => {
    const key = `liked_game_${gameId}_${initiaAddress || 'anon'}`;
    setLiked(!!localStorage.getItem(key));
  }, [gameId, initiaAddress]);

  // Load comments
  useEffect(() => {
    if (!gameId) return;
    setCommentsLoading(true);
    getDocs(query(collection(db, "games", String(gameId), "comments"), orderBy("createdAt", "desc")))
      .then(snap => setComments(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => {})
      .finally(() => setCommentsLoading(false));
  }, [gameId]);

  const handleLike = async () => {
    if (!initiaAddress) return;
    const key = `liked_game_${gameId}_${initiaAddress}`;
    if (localStorage.getItem(key)) return; // Already liked
    localStorage.setItem(key, "1");
    setLiked(true);
    setLikeCount(c => c + 1);
    try { await updateDoc(doc(db, "games", String(gameId)), { likes: increment(1) }); }
    catch(e) { console.warn("Like failed:", e); }
  };

  const handleComment = async () => {
    if (!commentText.trim() || !initiaAddress || postingComment) return;
    setPostingComment(true);
    const text = commentText.trim();
    setCommentText("");
    try {
      await addDoc(collection(db, "games", String(gameId), "comments"), {
        text, player: initiaAddress, createdAt: serverTimestamp(),
      });
      setComments(prev => [{ id: Date.now(), text, player: initiaAddress, createdAt: null }, ...prev]);
    } catch(e) { console.warn("Comment failed:", e); setCommentText(text); }
    finally { setPostingComment(false); }
  };

  useEffect(() => {
    const handleMessage = (event) => {
      if (!event.data?._sdk && !event.data?.type) return;
      if (event.data?.type === "SCORE_UPDATE") setScore(event.data.score);
      if (event.data?.type === "GAME_OVER") { setScore(event.data.score); submitScore(event.data.score); }
      if (event.data?.type === "GET_PLAYER_INFO") {
        iframeRef.current?.contentWindow?.postMessage({ type:"PLAYER_INFO", _platform:true, player:{ address:initiaAddress||"", username:null, balance:"0" } }, "*");
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [initiaAddress]);

  const submitScore = async (finalScore) => {
    if (submittingRef.current || !initiaAddress) return;
    submittingRef.current = true; setSubmitting(true); setSubmitError("");
    try {
      const sender = initiaAddress;
      const rewardRate = game.rewardRate || 50;
      const playerReward = Math.floor(rewardRate * 80 / 100);
      const creatorReward = Math.floor(rewardRate * 20 / 100);
      const result = await requestTxBlock({ messages:[{ typeUrl:"/initia.move.v1.MsgExecute", value:{ sender, moduleAddress:CONTRACT, moduleName:"leaderboard", functionName:"submit_score", typeArgs:[], args:[encodeAddress(CONTRACT),encodeU64(game.id),encodeU64(finalScore)] } }] });
      try { await requestTxBlock({ messages:[{ typeUrl:"/initia.move.v1.MsgExecute", value:{ sender, moduleAddress:CONTRACT, moduleName:"arcade_token", functionName:"auto_mint_reward", typeArgs:[], args:[encodeAddress(CONTRACT),encodeU64(finalScore),encodeU64(playerReward)] } }] }); setTokensEarned(playerReward); } catch(e){}
      try { const ch=bech32ToHex(game.creator); await requestTxBlock({ messages:[{ typeUrl:"/initia.move.v1.MsgExecute", value:{ sender, moduleAddress:CONTRACT, moduleName:"arcade_token", functionName:"mint_to", typeArgs:[], args:[encodeAddress(ch),encodeU64(creatorReward),encodeAddress(CONTRACT)] } }] }); } catch(e){}
      try { await requestTxBlock({ messages:[{ typeUrl:"/initia.move.v1.MsgExecute", value:{ sender, moduleAddress:CONTRACT, moduleName:"platform", functionName:"record_play_and_earn", typeArgs:[], args:[encodeAddress(CONTRACT),encodeU64(game.id),encodeU64(rewardRate)] } }] }); } catch(e){}
      await saveScore({ player:sender, score:finalScore, gameId:game.id, gameName:game.name, txHash:result.transactionHash });
      setTxHash(result.transactionHash); setSubmitted(true);
      iframeRef.current?.contentWindow?.postMessage({ type:"TRANSACTION_SUCCESS", _platform:true, txHash:result.transactionHash }, "*");
    } catch(err) {
      setSubmitError(err.message||"Transaction failed");
      iframeRef.current?.contentWindow?.postMessage({ type:"TRANSACTION_FAILED", _platform:true, error:err.message }, "*");
    } finally { setSubmitting(false); submittingRef.current=false; }
  };

  if (gameLoading) return <div style={{ minHeight:"calc(100vh - 54px)", background:P.bg, display:"flex", alignItems:"center", justifyContent:"center" }}><div style={{ fontFamily:P.raj, fontSize:11, color:"#5533aa", textTransform:"uppercase", letterSpacing:"2px" }}>Loading game...</div></div>;
  if (!game) return <div style={{ minHeight:"calc(100vh - 54px)", background:P.bg, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12 }}><div style={{ fontSize:48 }}>🎮</div><div style={{ fontFamily:P.raj, fontWeight:700, fontSize:16, color:"#c4a0ff" }}>Game not found</div><button onClick={() => navigate("/games")} style={{ padding:"8px 20px", background:"rgba(123,47,255,0.1)", border:`1px solid ${P.b2}`, borderRadius:8, color:"#a67fff", fontSize:12, cursor:"pointer", fontFamily:P.raj, fontWeight:700 }}>Browse Games</button></div>;

  const rewardRate    = game.rewardRate || 50;
  const playerReward  = Math.floor(rewardRate * 80 / 100);
  const creatorReward = Math.floor(rewardRate * 20 / 100);
  const shortAddr = (a) => a ? a.slice(0,6)+"..."+a.slice(-4) : "?";
  const avatarColor = (a) => { const colors = ["#7B2FFF","#00d4ff","#00FF88","#FFB800","#ff4444","#ff6b9d"]; return colors[parseInt(a?.slice(2,4)||"0",16)%colors.length]; };

  return (
    <div style={{ minHeight:"calc(100vh - 54px)", background:P.bg, padding:"16px 36px" }}>
      <style>{`
        @keyframes lbPulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes poweredGlow{0%,100%{opacity:0.7}50%{opacity:1}}
        @keyframes heartBeat{0%,100%{transform:scale(1)}50%{transform:scale(1.3)}}
        @keyframes slideIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        .like-btn:active{transform:scale(0.95);}
        .comment-input:focus{outline:none;border-color:rgba(123,47,255,0.5)!important;box-shadow:0 0 0 2px rgba(123,47,255,0.1)!important;}
        .comment-input::placeholder{color:#3a2a5a;}
        .comment-row:hover{background:rgba(123,47,255,0.06)!important;}
        .send-btn:hover{background:linear-gradient(135deg,#8f44ff,#6b2fe8)!important;}
        .send-btn:disabled{opacity:0.35;cursor:not-allowed;}
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:14 }}>
        <button onClick={() => navigate(-1)} style={{ padding:"7px 16px", background:"rgba(123,47,255,0.08)", border:`1px solid ${P.b}`, borderRadius:7, color:"#a67fff", fontSize:12, cursor:"pointer", fontFamily:P.raj, fontWeight:700, transition:"all 0.15s" }}>← Back</button>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:38, height:38, borderRadius:9, background:"linear-gradient(135deg,rgba(123,47,255,0.3),rgba(0,212,255,0.15))", border:`1px solid ${P.b2}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🎮</div>
          <div>
            <div style={{ fontFamily:P.raj, fontWeight:700, fontSize:17, color:"#d4b8ff", textTransform:"uppercase", letterSpacing:"0.5px" }}>{game.name}</div>
            <div style={{ fontSize:11, color:"#5533aa", fontFamily:P.raj }}>{game.description}</div>
          </div>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 290px", gap:16 }}>

        {/* Iframe */}
        <div style={{ background:P.s1, border:`1px solid ${P.b2}`, borderRadius:12, overflow:"hidden" }}>
          {game.iframeUrl && !game.iframeUrl.includes("your-unity-game") ? (
            <iframe ref={iframeRef} src={game.iframeUrl} style={{ width:"100%", height:"calc(100vh - 54px - 130px)", minHeight:480, border:"none", display:"block" }} allow="fullscreen" title={game.name} />
          ) : (
            <div style={{ height:"calc(100vh - 54px - 130px)", minHeight:480, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14 }}>
              <div style={{ fontSize:56, filter:"drop-shadow(0 0 20px rgba(123,47,255,0.5))" }}>🎮</div>
              <div style={{ fontFamily:P.raj, fontWeight:700, fontSize:14, color:"#7755aa" }}>Game coming soon</div>
              <button onClick={() => { const s=Math.floor(Math.random()*10000); setScore(s); submitScore(s); }} style={{ marginTop:8, padding:"11px 28px", background:"linear-gradient(135deg,#7B2FFF,#5a1fd4)", border:"none", borderRadius:8, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:P.raj }}>
                Simulate Game Over (Test)
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>

          {/* Score card */}
          <div style={{ background:P.s1, border:`1px solid ${P.b}`, borderRadius:10, padding:"16px 18px", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:-20, right:-20, width:90, height:90, background:"radial-gradient(circle,rgba(123,47,255,0.18) 0%,transparent 70%)", borderRadius:"50%", pointerEvents:"none" }} />
            <div style={{ fontSize:9, color:"#5533aa", textTransform:"uppercase", letterSpacing:"1.5px", fontFamily:P.raj, fontWeight:700, marginBottom:8 }}>Current Score</div>
            <div style={{ fontFamily:P.orb, fontWeight:700, fontSize:40, color:"#a67fff", letterSpacing:"-1px", lineHeight:1 }}>{score.toLocaleString()}</div>
            <div style={{ fontSize:10, color:"#5533aa", marginTop:8, fontFamily:P.raj }}>
              You: <span style={{ color:"#a67fff", fontWeight:700 }}>+{playerReward} ARCADE</span>
              {" · "}Creator: <span style={{ color:"#7755aa" }}>+{creatorReward} ARCADE</span>
            </div>
          </div>

          {/* Game Info */}
          <div style={{ background:P.s1, border:`1px solid ${P.b}`, borderRadius:10, padding:"13px 16px" }}>
            <div style={{ fontSize:9, color:"#5533aa", textTransform:"uppercase", letterSpacing:"1.5px", fontFamily:P.raj, fontWeight:700, marginBottom:10 }}>Game Info</div>
            {[["Category", game.category], ["Player Reward", `+${playerReward} ARCADE`], ["Creator Reward", `+${creatorReward} ARCADE`]].map(([k,v]) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between", fontSize:11, padding:"6px 0", borderBottom:`1px solid ${P.b}` }}>
                <span style={{ color:"#5533aa", fontFamily:P.raj }}>{k}</span>
                <span style={{ color:"#9977cc", fontFamily:P.raj, fontWeight:600 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* ── COMMUNITY SECTION ── */}
          <div style={{ background:P.s1, border:`1px solid ${P.b2}`, borderRadius:12, overflow:"hidden", flex:1 }}>

            {/* Header */}
            <div style={{ padding:"12px 16px", borderBottom:`1px solid ${P.b}`, background:"rgba(123,47,255,0.05)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:14 }}>💬</span>
                <span style={{ fontFamily:P.raj, fontWeight:700, fontSize:12, color:"#c4a0ff", textTransform:"uppercase", letterSpacing:"1px" }}>Community</span>
              </div>
              <span style={{ fontSize:10, color:"#5533aa", fontFamily:P.raj }}>{comments.length} comments</span>
            </div>

            {/* Like bar */}
            <div style={{ padding:"10px 16px", borderBottom:`1px solid ${P.b}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <button className="like-btn" onClick={handleLike} disabled={!initiaAddress} style={{
                display:"flex", alignItems:"center", gap:8, padding:"7px 14px",
                background: liked ? "rgba(255,100,100,0.12)" : "rgba(123,47,255,0.06)",
                border:`1px solid ${liked ? "rgba(255,100,100,0.35)" : P.b}`,
                borderRadius:20, cursor: liked ? "default" : "pointer",
                fontFamily:P.raj, fontWeight:700, fontSize:12,
                color: liked ? "#ff6b6b" : "#9977cc",
                transition:"all 0.2s",
              }}>
                <span style={{ fontSize:15, animation: liked ? "heartBeat 0.4s ease" : "none" }}>{liked ? "❤️" : "🤍"}</span>
                <span>{liked ? "Liked!" : "Like"}</span>
              </button>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ fontSize:14 }}>❤️</span>
                <span style={{ fontFamily:P.orb, fontWeight:700, fontSize:13, color:"#ff6b6b" }}>{likeCount}</span>
              </div>
            </div>

            {/* Comment input */}
            {initiaAddress ? (
              <div style={{ padding:"10px 16px", borderBottom:`1px solid ${P.b}` }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:0 }}>
         
                  <div style={{ flex:1, display:"flex", gap:6 }}>
                    <input
                      className="comment-input"
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleComment()}
                      placeholder="Share your thoughts..."
                      maxLength={200}
                      style={{
                        flex:1, padding:"8px 12px",
                        background:"rgba(123,47,255,0.06)",
                        border:`1px solid ${P.b}`,
                        borderRadius:20, color:"#d4b8ff",
                        fontSize:12, fontFamily:P.raj,
                        transition:"all 0.2s",
                      }}
                    />
                    <button className="send-btn" onClick={handleComment} disabled={postingComment || !commentText.trim()} style={{
                      width:34, height:34, borderRadius:"50%",
                      background:"linear-gradient(135deg,#7B2FFF,#5a1fd4)",
                      border:"none", color:"#fff", fontSize:14,
                      cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                      flexShrink:0, transition:"all 0.18s",
                    }}>
                      {postingComment ? "..." : "↑"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding:"12px 16px", borderBottom:`1px solid ${P.b}`, textAlign:"center" }}>
                <div style={{ fontSize:11, color:"#5533aa", fontFamily:P.raj }}>Connect wallet to comment</div>
              </div>
            )}

            {/* Comments list */}
            <div style={{ maxHeight:220, overflowY:"auto", padding:"8px 0" }}>
              {commentsLoading ? (
                <div style={{ padding:"20px", textAlign:"center", fontSize:10, color:"#5533aa", fontFamily:P.raj }}>Loading...</div>
              ) : comments.length === 0 ? (
                <div style={{ padding:"24px 16px", textAlign:"center" }}>
                  <div style={{ fontSize:24, marginBottom:8 }}>💬</div>
                  <div style={{ fontSize:11, color:"#5533aa", fontFamily:P.raj }}>No comments yet</div>
                  <div style={{ fontSize:10, color:"#3a2a5a", fontFamily:P.raj, marginTop:4 }}>Be the first to comment!</div>
                </div>
              ) : comments.map((c, i) => (
                <div key={c.id} className="comment-row" style={{
                  padding:"10px 16px",
                  borderBottom: i < comments.length-1 ? `1px solid rgba(123,47,255,0.06)` : "none",
                  transition:"background 0.15s",
                  animation:"slideIn 0.25s ease",
                }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                    <span style={{
                      fontSize:11, fontFamily:"monospace", fontWeight:700, letterSpacing:"0.3px",
                      background:"linear-gradient(90deg,#7B2FFF,#00d4ff)",
                      WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
                    }}>{shortAddr(c.player)}</span>
                    <span style={{ fontSize:9, color:"#3a2a5a", fontFamily:P.raj }}>{timeAgo(c.createdAt)}</span>
                  </div>
                  <div style={{ fontSize:12, color:"#c4a0ff", fontFamily:P.raj, lineHeight:1.5, wordBreak:"break-word" }}>{c.text}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit score */}
          {score > 0 && !submitted && (
            <button onClick={() => submitScore(score)} disabled={submitting || !isConnected || !initiaAddress} style={{ padding:"13px", background: submitting?"rgba(123,47,255,0.1)":"linear-gradient(135deg,#7B2FFF,#5a1fd4)", border:"none", borderRadius:9, color:submitting?"#5533aa":"#fff", fontSize:12, fontWeight:700, cursor:submitting?"not-allowed":"pointer", fontFamily:P.raj, letterSpacing:"1px", textTransform:"uppercase" }}>
              {submitting ? "Submitting..." : "⛓ Submit Score On-Chain"}
            </button>
          )}

          {submitting && (
            <div style={{ background:"rgba(123,47,255,0.06)", border:`1px solid ${P.b}`, borderRadius:9, padding:14, textAlign:"center" }}>
              <div style={{ fontFamily:P.raj, fontSize:11, color:"#a67fff" }}>Submitting to blockchain...</div>
              <div style={{ fontSize:10, color:"#5533aa", fontFamily:P.raj, marginTop:4 }}>Approve in your wallet</div>
            </div>
          )}

          {submitError && (
            <div style={{ background:"rgba(255,68,68,0.06)", border:"1px solid rgba(255,68,68,0.2)", borderRadius:9, padding:14 }}>
              <div style={{ fontFamily:P.raj, fontWeight:700, fontSize:11, color:"#ff4444", marginBottom:4 }}>Submission failed</div>
              <div style={{ fontSize:10, color:"#5533aa", wordBreak:"break-all", fontFamily:"monospace" }}>{submitError}</div>
            </div>
          )}

          {submitted && txHash && (
            <div style={{ background:"rgba(0,255,136,0.05)", border:"1px solid rgba(0,255,136,0.15)", borderRadius:9, padding:16 }}>
              <div style={{ fontFamily:P.raj, fontWeight:700, fontSize:11, color:"#00FF88", marginBottom:6 }}>✓ Score submitted on-chain!</div>
              {tokensEarned > 0 && <div style={{ fontFamily:P.raj, fontWeight:700, fontSize:14, color:"#00FF88", marginBottom:6 }}>+{tokensEarned} ARCADE earned! 🎉</div>}
              <div style={{ fontSize:9, color:"#5533aa", wordBreak:"break-all", fontFamily:"monospace", marginBottom:8 }}>{txHash}</div>
              <a href={`https://scan.testnet.initia.xyz/initiation-2/txs/${txHash}`} target="_blank" rel="noreferrer" style={{ fontSize:10, color:"#a67fff", textDecoration:"none", fontFamily:P.raj, fontWeight:700 }}>View on Explorer →</a>
            </div>
          )}

          {/* Powered by */}
          <div style={{ textAlign:"center", padding:"10px 0 4px", animation:"poweredGlow 3s ease-in-out infinite" }}>
            <div style={{ fontSize:11, fontFamily:P.raj, fontWeight:700, letterSpacing:"1.5px", textTransform:"uppercase", background:"linear-gradient(90deg,#7B2FFF,#00d4ff)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
              ⚡ Powered by Initia
            </div>
            <div style={{ fontSize:9, color:"#3a2a5a", fontFamily:P.raj, letterSpacing:"1px", marginTop:2 }}>On-Chain Gaming</div>
          </div>

        </div>
      </div>
    </div>
  );
}