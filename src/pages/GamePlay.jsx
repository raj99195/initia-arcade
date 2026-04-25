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
  bg:"#08070f", s1:"#0e0c1a", s2:"#12101f",
  b:"rgba(123,47,255,0.12)", b2:"rgba(123,47,255,0.22)",
  raj:"'Rajdhani',sans-serif", orb:"'Orbitron',sans-serif",
};

function encodeU64(value) {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setBigUint64(0, BigInt(value), true);
  return new Uint8Array(buf);
}
function encodeAddress(hexAddr) {
  const hex = hexAddr.replace("0x","").padStart(64,"0");
  const bytes = new Uint8Array(32);
  for (let i=0;i<32;i++) bytes[i]=parseInt(hex.slice(i*2,i*2+2),16);
  return bytes;
}
function bech32ToHex(addr) {
  const charset="qpzry9x8gf2tvdw0s3jn54khce6mua7l";
  const stripped=addr.slice(addr.indexOf("1")+1);
  const data=[];
  for (const c of stripped){const idx=charset.indexOf(c);if(idx!==-1)data.push(idx);}
  const result=[];let acc=0,bits=0;
  for (const val of data.slice(0,-6)){acc=((acc<<5)|val)&0x1fff;bits+=5;if(bits>=8){bits-=8;result.push((acc>>bits)&0xff);}}
  return "0x"+result.map(b=>b.toString(16).padStart(2,"0")).join("");
}

export default function GamePlay() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { games } = useGames();
  const game = games.find(g => g.id === Number(gameId));

  const { requestTxBlock, initiaAddress } = useInterwovenKit();
  const { isConnected } = useAccount();

  const [score, setScore]               = useState(0);
  const [submitting, setSubmitting]     = useState(false);
  const [submitted, setSubmitted]       = useState(false);
  const [txHash, setTxHash]             = useState("");
  const [submitError, setSubmitError]   = useState("");
  const [gameLoading, setGameLoading]   = useState(true);
  const [tokensEarned, setTokensEarned] = useState(0);
  const [liked, setLiked]               = useState(false);
  const [likeCount, setLikeCount]       = useState(0);
  const [comments, setComments]         = useState([]);
  const [commentText, setCommentText]   = useState("");
  const [postingComment, setPostingComment] = useState(false);

  const iframeRef     = useRef(null);
  const submittingRef = useRef(false);

  useEffect(() => { if (games.length > 0) setGameLoading(false); }, [games]);
  useEffect(() => { if (game) setLikeCount(game.likes || 0); }, [game]);

  useEffect(() => {
    if (!gameId) return;
    getDocs(query(collection(db, "games", String(gameId), "comments"), orderBy("createdAt", "desc")))
      .then(snap => setComments(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => {});
  }, [gameId]);

  const handleLike = async () => {
    if (liked || !initiaAddress) return;
    setLiked(true);
    setLikeCount(c => c + 1);
    try { await updateDoc(doc(db, "games", String(gameId)), { likes: increment(1) }); }
    catch(e) { console.warn("Like failed:", e); }
  };

  const handleComment = async () => {
    if (!commentText.trim() || !initiaAddress || postingComment) return;
    setPostingComment(true);
    try {
      await addDoc(collection(db, "games", String(gameId), "comments"), {
        text: commentText.trim(), player: initiaAddress, createdAt: serverTimestamp(),
      });
      setComments(prev => [{ id: Date.now(), text: commentText.trim(), player: initiaAddress, createdAt: { toDate: () => new Date() } }, ...prev]);
      setCommentText("");
    } catch(e) { console.warn("Comment failed:", e); }
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
    submittingRef.current = true;
    setSubmitting(true); setSubmitError("");
    try {
      const sender = initiaAddress;
      const rewardRate = game.rewardRate || 50;
      const playerReward = Math.floor(rewardRate * 80 / 100);
      const creatorReward = Math.floor(rewardRate * 20 / 100);

      const result = await requestTxBlock({ messages:[{ typeUrl:"/initia.move.v1.MsgExecute", value:{ sender, moduleAddress:CONTRACT, moduleName:"leaderboard", functionName:"submit_score", typeArgs:[], args:[encodeAddress(CONTRACT), encodeU64(game.id), encodeU64(finalScore)] } }] });

      try {
        await requestTxBlock({ messages:[{ typeUrl:"/initia.move.v1.MsgExecute", value:{ sender, moduleAddress:CONTRACT, moduleName:"arcade_token", functionName:"auto_mint_reward", typeArgs:[], args:[encodeAddress(CONTRACT), encodeU64(finalScore), encodeU64(playerReward)] } }] });
        setTokensEarned(playerReward);
      } catch(e){ console.warn("Player mint:",e); }

      try {
        const creatorHex = bech32ToHex(game.creator);
        await requestTxBlock({ messages:[{ typeUrl:"/initia.move.v1.MsgExecute", value:{ sender, moduleAddress:CONTRACT, moduleName:"arcade_token", functionName:"mint_to", typeArgs:[], args:[encodeAddress(creatorHex), encodeU64(creatorReward), encodeAddress(CONTRACT)] } }] });
      } catch(e){ console.warn("Creator mint:",e); }

      try {
        await requestTxBlock({ messages:[{ typeUrl:"/initia.move.v1.MsgExecute", value:{ sender, moduleAddress:CONTRACT, moduleName:"platform", functionName:"record_play_and_earn", typeArgs:[], args:[encodeAddress(CONTRACT), encodeU64(game.id), encodeU64(rewardRate)] } }] });
      } catch(e){ console.warn("Record play:",e); }

      await saveScore({ player:sender, score:finalScore, gameId:game.id, gameName:game.name, txHash:result.transactionHash });
      setTxHash(result.transactionHash); setSubmitted(true);
      iframeRef.current?.contentWindow?.postMessage({ type:"TRANSACTION_SUCCESS", _platform:true, txHash:result.transactionHash }, "*");
    } catch(err) {
      setSubmitError(err.message||"Transaction failed");
      iframeRef.current?.contentWindow?.postMessage({ type:"TRANSACTION_FAILED", _platform:true, error:err.message }, "*");
    } finally { setSubmitting(false); submittingRef.current=false; }
  };

  if (gameLoading) return (
    <div style={{ minHeight:"calc(100vh - 54px)", background:P.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ fontFamily:P.raj, fontSize:11, color:"#5533aa", textTransform:"uppercase", letterSpacing:"2px" }}>Loading game...</div>
    </div>
  );

  if (!game) return (
    <div style={{ minHeight:"calc(100vh - 54px)", background:P.bg, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12 }}>
      <div style={{ fontSize:48 }}>🎮</div>
      <div style={{ fontFamily:P.raj, fontWeight:700, fontSize:16, color:"#c4a0ff" }}>Game not found</div>
      <button onClick={() => navigate("/games")} style={{ padding:"8px 20px", background:"rgba(123,47,255,0.1)", border:`1px solid ${P.b2}`, borderRadius:8, color:"#a67fff", fontSize:12, cursor:"pointer", fontFamily:P.raj, fontWeight:700 }}>Browse Games</button>
    </div>
  );

  const rewardRate    = game.rewardRate || 50;
  const playerReward  = Math.floor(rewardRate * 80 / 100);
  const creatorReward = Math.floor(rewardRate * 20 / 100);
  const shortAddr = (a) => a ? a.slice(0,8)+"..."+a.slice(-4) : "?";

  return (
    <div style={{ minHeight:"calc(100vh - 54px)", background:P.bg, padding:"16px 36px" }}>
      <style>{`
        @keyframes lbPulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes poweredGlow{0%,100%{filter:drop-shadow(0 0 6px rgba(123,47,255,0.5)) drop-shadow(0 0 12px rgba(0,212,255,0.2))}50%{filter:drop-shadow(0 0 12px rgba(123,47,255,0.8)) drop-shadow(0 0 24px rgba(0,212,255,0.4))}}
        .like-btn:hover{transform:scale(1.05);}
        .comment-input:focus{outline:none;border-color:rgba(123,47,255,0.45)!important;}
        .comment-input::placeholder{color:#3a2a5a;}
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:12 }}>
        <button onClick={() => navigate(-1)} style={{ padding:"6px 14px", background:"rgba(123,47,255,0.08)", border:`1px solid ${P.b}`, borderRadius:7, color:"#a67fff", fontSize:12, cursor:"pointer", fontFamily:P.raj, fontWeight:700 }}>← Back</button>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:8, background:"rgba(123,47,255,0.2)", border:`1px solid ${P.b2}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🎮</div>
          <div>
            <div style={{ fontFamily:P.raj, fontWeight:700, fontSize:16, color:"#d4b8ff", textTransform:"uppercase" }}>{game.name}</div>
            <p style={{ fontSize:11, color:"#5533aa", fontFamily:P.raj, margin:0 }}>{game.description}</p>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 270px", gap:16 }}>

        {/* Game iframe */}
        <div style={{ background:P.s1, border:`1px solid ${P.b2}`, borderRadius:12, overflow:"hidden" }}>
          {game.iframeUrl && !game.iframeUrl.includes("your-unity-game") ? (
            <iframe ref={iframeRef} src={game.iframeUrl} style={{ width:"100%", height:"calc(100vh - 54px - 120px)", minHeight:480, border:"none", display:"block" }} allow="fullscreen" title={game.name} />
          ) : (
            <div style={{ height:"calc(100vh - 54px - 120px)", minHeight:480, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14 }}>
              <div style={{ fontSize:56, filter:"drop-shadow(0 0 16px rgba(123,47,255,0.5))" }}>🎮</div>
              <div style={{ fontFamily:P.raj, fontWeight:700, fontSize:14, color:"#7755aa" }}>Game coming soon</div>
              <button onClick={() => { const s=Math.floor(Math.random()*10000); setScore(s); submitScore(s); }} style={{ marginTop:8, padding:"10px 24px", background:"linear-gradient(135deg,#7B2FFF,#5a1fd4)", border:"none", borderRadius:8, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:P.raj }}>
                Simulate Game Over (Test)
              </button>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>

          {/* Score */}
          <div style={{ background:P.s1, border:`1px solid ${P.b}`, borderRadius:10, padding:"16px 18px", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:-20, right:-20, width:80, height:80, background:"radial-gradient(circle,rgba(123,47,255,0.15) 0%,transparent 70%)", borderRadius:"50%", pointerEvents:"none" }} />
            <div style={{ fontSize:9, color:"#5533aa", textTransform:"uppercase", letterSpacing:"1.5px", fontFamily:P.raj, fontWeight:700, marginBottom:8 }}>Current Score</div>
            <div style={{ fontFamily:P.orb, fontWeight:700, fontSize:38, color:"#a67fff", letterSpacing:"-1px", lineHeight:1 }}>{score.toLocaleString()}</div>
            <div style={{ fontSize:10, color:"#5533aa", marginTop:8, fontFamily:P.raj }}>
              You: <span style={{ color:"#a67fff", fontWeight:700 }}>+{playerReward} ARCADE</span>
              {" · "}Creator: <span style={{ color:"#7755aa" }}>+{creatorReward} ARCADE</span>
            </div>
          </div>

          {/* Game Info */}
          <div style={{ background:P.s1, border:`1px solid ${P.b}`, borderRadius:10, padding:"14px 18px" }}>
            <div style={{ fontSize:9, color:"#5533aa", textTransform:"uppercase", letterSpacing:"1.5px", fontFamily:P.raj, fontWeight:700, marginBottom:10 }}>Game Info</div>
            {[
              ["Category",       game.category],
              ["Player Reward",  `+${playerReward} ARCADE`],
              ["Creator Reward", `+${creatorReward} ARCADE`],
            ].map(([k,v]) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between", fontSize:11, padding:"6px 0", borderBottom:`1px solid ${P.b}` }}>
                <span style={{ color:"#5533aa", fontFamily:P.raj }}>{k}</span>
                <span style={{ color:"#9977cc", fontFamily:P.raj, fontWeight:600 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Like & Comment */}
          <div style={{ background:P.s1, border:`1px solid ${P.b}`, borderRadius:10, padding:"14px 18px" }}>
            <div style={{ fontSize:9, color:"#5533aa", textTransform:"uppercase", letterSpacing:"1.5px", fontFamily:P.raj, fontWeight:700, marginBottom:10 }}>Community</div>

            <button className="like-btn" onClick={handleLike} disabled={liked || !initiaAddress} style={{
              display:"flex", alignItems:"center", gap:8, padding:"8px 14px", width:"100%",
              background: liked ? "rgba(255,100,100,0.1)" : "rgba(123,47,255,0.06)",
              border:`1px solid ${liked ? "rgba(255,100,100,0.3)" : P.b}`,
              borderRadius:7, cursor: liked ? "default" : "pointer",
              fontFamily:P.raj, fontWeight:700, fontSize:12,
              color: liked ? "#ff6b6b" : "#9977cc",
              transition:"all 0.18s", marginBottom:10,
            }}>
              <span style={{ fontSize:16 }}>{liked ? "❤️" : "🤍"}</span>
              <span>{liked ? "Liked!" : "Like this game"}</span>
              <span style={{ marginLeft:"auto", fontSize:11, color:"#5533aa" }}>{likeCount}</span>
            </button>

            {initiaAddress && (
              <div style={{ display:"flex", gap:6, marginBottom:8 }}>
                <input className="comment-input" value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === "Enter" && handleComment()} placeholder="Add a comment..."
                  style={{ flex:1, padding:"7px 10px", background:"rgba(123,47,255,0.06)", border:`1px solid ${P.b}`, borderRadius:6, color:"#d4b8ff", fontSize:11, fontFamily:P.raj }} />
                <button onClick={handleComment} disabled={postingComment || !commentText.trim()} style={{ padding:"7px 12px", background:"linear-gradient(135deg,#7B2FFF,#5a1fd4)", border:"none", borderRadius:6, color:"#fff", fontSize:12, cursor:"pointer", fontFamily:P.raj, fontWeight:700, opacity:(!commentText.trim()||postingComment)?0.4:1 }}>→</button>
              </div>
            )}

            <div style={{ maxHeight:120, overflowY:"auto", display:"flex", flexDirection:"column", gap:5 }}>
              {comments.length === 0
                ? <div style={{ fontSize:10, color:"#3a2a5a", fontFamily:P.raj, textAlign:"center", padding:"6px 0" }}>No comments yet!</div>
                : comments.map(c => (
                  <div key={c.id} style={{ background:"rgba(123,47,255,0.04)", border:`1px solid ${P.b}`, borderRadius:6, padding:"6px 8px" }}>
                    <div style={{ fontSize:9, color:"#5533aa", fontFamily:"monospace", marginBottom:2 }}>{shortAddr(c.player)}</div>
                    <div style={{ fontSize:11, color:"#c4a0ff", fontFamily:P.raj }}>{c.text}</div>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Submit */}
          {score > 0 && !submitted && (
            <button onClick={() => submitScore(score)} disabled={submitting || !isConnected || !initiaAddress} style={{ padding:"12px", background: submitting ? "rgba(123,47,255,0.1)" : "linear-gradient(135deg,#7B2FFF,#5a1fd4)", border:"none", borderRadius:8, color: submitting ? "#5533aa" : "#fff", fontSize:12, fontWeight:700, cursor: submitting ? "not-allowed" : "pointer", fontFamily:P.raj, letterSpacing:"0.5px", textTransform:"uppercase" }}>
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

          {/* Powered by — glowing */}
          <div style={{ textAlign:"center", padding:"14px 0 6px" }}>
            <div style={{ animation:"poweredGlow 3s ease-in-out infinite", display:"inline-block" }}>
              <span style={{
                fontSize:11, fontFamily:P.raj, fontWeight:700, letterSpacing:"1.5px", textTransform:"uppercase",
                background:"linear-gradient(90deg,#7B2FFF,#00d4ff,#7B2FFF)",
                backgroundSize:"200% auto",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
              }}>
                ⚡ Powered by Initia
              </span>
              <div style={{ fontSize:9, color:"#5533aa", fontFamily:P.raj, letterSpacing:"1px", marginTop:2 }}>On-Chain Gaming</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}