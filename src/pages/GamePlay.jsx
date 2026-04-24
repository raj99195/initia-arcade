import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useInterwovenKit } from "@initia/interwovenkit-react";
import { useAccount } from "wagmi";
import EnableAutoSign from "../components/EnableAutoSign";
import { useGames } from "../hooks/useGames";
import { saveScore } from "../lib/gameService";

const CHAIN_ID = "initiation-2";
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

  const { submitTxBlock, autoSign, initiaAddress } = useInterwovenKit();
  const { isConnected } = useAccount();

  const [score, setScore]           = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [txHash, setTxHash]         = useState("");
  const [submitError, setSubmitError] = useState("");
  const [gameLoading, setGameLoading] = useState(true);
  const [tokensEarned, setTokensEarned] = useState(0);
  const iframeRef    = useRef(null);
  const submittingRef = useRef(false);

  useEffect(() => { if (games.length > 0) setGameLoading(false); }, [games]);

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
  }, [autoSign, initiaAddress]);

  const submitScore = async (finalScore) => {
    if (submittingRef.current || !initiaAddress) return;
    submittingRef.current = true;
    setSubmitting(true); setSubmitError("");
    try {
      const sender = initiaAddress;
      const rewardRate   = game.rewardRate || 50;
      const playerReward = Math.floor(rewardRate * 80 / 100);
      const creatorReward= Math.floor(rewardRate * 20 / 100);

      if (!autoSign?.isEnabledByChain?.[CHAIN_ID]) await autoSign.enable(CHAIN_ID);

      const result = await submitTxBlock({ messages:[{ typeUrl:"/initia.move.v1.MsgExecute", value:{ sender, moduleAddress:CONTRACT, moduleName:"leaderboard", functionName:"submit_score", typeArgs:[], args:[encodeAddress(CONTRACT),encodeU64(game.id),encodeU64(finalScore)] } }], fee:{ amount:[{denom:"uinit",amount:"6000"}], gas:"400000" } });

      try {
        await submitTxBlock({ messages:[{ typeUrl:"/initia.move.v1.MsgExecute", value:{ sender, moduleAddress:CONTRACT, moduleName:"arcade_token", functionName:"auto_mint_reward", typeArgs:[], args:[encodeAddress(CONTRACT),encodeU64(finalScore),encodeU64(playerReward)] } }], fee:{ amount:[{denom:"uinit",amount:"6000"}], gas:"400000" } });
        setTokensEarned(playerReward);
      } catch(e){ console.warn("Player mint failed:",e); }

      try {
        const creatorHex = bech32ToHex(game.creator);
        await submitTxBlock({ messages:[{ typeUrl:"/initia.move.v1.MsgExecute", value:{ sender, moduleAddress:CONTRACT, moduleName:"arcade_token", functionName:"init_player", typeArgs:[], args:[] } }], fee:{ amount:[{denom:"uinit",amount:"6000"}], gas:"400000" } });
        await submitTxBlock({ messages:[{ typeUrl:"/initia.move.v1.MsgExecute", value:{ sender, moduleAddress:CONTRACT, moduleName:"arcade_token", functionName:"mint_to", typeArgs:[], args:[encodeAddress(creatorHex),encodeU64(creatorReward),encodeAddress(CONTRACT)] } }], fee:{ amount:[{denom:"uinit",amount:"6000"}], gas:"400000" } });
      } catch(e){ console.warn("Creator mint failed:",e); }

      try {
        await submitTxBlock({ messages:[{ typeUrl:"/initia.move.v1.MsgExecute", value:{ sender, moduleAddress:CONTRACT, moduleName:"platform", functionName:"record_play_and_earn", typeArgs:[], args:[encodeAddress(CONTRACT),encodeU64(game.id),encodeU64(rewardRate)] } }], fee:{ amount:[{denom:"uinit",amount:"6000"}], gas:"400000" } });
      } catch(e){ console.warn("Record play failed:",e); }

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
      <button onClick={() => navigate("/games")} style={{ padding:"8px 20px", background:"rgba(123,47,255,0.1)", border:`1px solid ${P.b2}`, borderRadius:8, color:"#a67fff", fontSize:12, cursor:"pointer", fontFamily:P.raj, fontWeight:700 }}>
        Browse Games
      </button>
    </div>
  );

  const rewardRate    = game.rewardRate || 50;
  const playerReward  = Math.floor(rewardRate * 80 / 100);
  const creatorReward = Math.floor(rewardRate * 20 / 100);
  const autoSignOn    = autoSign?.isEnabledByChain?.[CHAIN_ID];

  return (
    <div style={{ minHeight:"calc(100vh - 54px)", background:P.bg, padding:"16px 36px 16px" }}>
      <style>{`@keyframes lbPulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:12 }}>
        <button onClick={() => navigate("/games")} style={{
          background:"rgba(123,47,255,0.06)", border:`1px solid ${P.b}`,
          borderRadius:7, color:"#7755aa", fontSize:11, padding:"7px 14px", cursor:"pointer",
          fontFamily:P.raj, fontWeight:700, letterSpacing:"0.5px", transition:"all 0.18s",
        }}
        onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(123,47,255,0.35)"; e.currentTarget.style.color="#c4a0ff";}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor=P.b; e.currentTarget.style.color="#7755aa";}}
        >← Back</button>

        <div>
          <h1 style={{ fontFamily:P.raj, fontWeight:700, fontSize:22, textTransform:"uppercase", color:"#fff", letterSpacing:"-0.3px", marginBottom:2 }}>
            {game.emoji||"🎮"} {game.name}
          </h1>
          <p style={{ fontSize:11, color:"#5533aa", fontFamily:P.raj }}>{game.description}</p>
        </div>

        <div style={{ marginLeft:"auto" }}>
          <EnableAutoSign />
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 270px", gap:16 }}>

        {/* Game iframe */}
        <div style={{ background:P.s1, border:`1px solid ${P.b2}`, borderRadius:12, overflow:"hidden", display:"flex", flexDirection:"column" }}>
          {game.iframeUrl && !game.iframeUrl.includes("your-unity-game") ? (
            <iframe ref={iframeRef} src={game.iframeUrl} style={{ width:"100%", height:"calc(100vh - 54px - 120px)", minHeight:480, border:"none", display:"block" }} allow="fullscreen" title={game.name} />
          ) : (
            <div style={{ height:"calc(100vh - 54px - 120px)", minHeight:480, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14 }}>
              <div style={{ fontSize:56, filter:"drop-shadow(0 0 16px rgba(123,47,255,0.5))" }}>{game.emoji||"🎮"}</div>
              <div style={{ fontFamily:P.raj, fontWeight:700, fontSize:14, color:"#7755aa" }}>Game coming soon</div>
              <div style={{ fontFamily:P.raj, fontSize:11, color:"#3a2a5a" }}>Unity WebGL build not yet linked</div>
              <button onClick={() => { const s=Math.floor(Math.random()*10000); setScore(s); submitScore(s); }} style={{
                marginTop:8, padding:"10px 24px",
                background:"linear-gradient(135deg,#7B2FFF,#5a1fd4)",
                border:"none", borderRadius:8, color:"#fff",
                fontSize:12, fontWeight:700, cursor:"pointer",
                fontFamily:P.raj, letterSpacing:"0.5px",
              }}>Simulate Game Over (Test)</button>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>

          {/* Current Score */}
          <div style={{ background:P.s1, border:`1px solid ${P.b}`, borderRadius:10, padding:"16px 18px", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:-20, right:-20, width:80, height:80, background:"radial-gradient(circle,rgba(123,47,255,0.15) 0%,transparent 70%)", borderRadius:"50%", pointerEvents:"none" }} />
            <div style={{ fontSize:9, color:"#5533aa", textTransform:"uppercase", letterSpacing:"1.5px", fontFamily:P.raj, fontWeight:700, marginBottom:8 }}>Current Score</div>
            <div style={{ fontFamily:P.orb, fontWeight:700, fontSize:38, color:"#a67fff", letterSpacing:"-1px", lineHeight:1 }}>
              {score.toLocaleString()}
            </div>
            <div style={{ fontSize:10, color:"#5533aa", marginTop:8, fontFamily:P.raj }}>
              You: <span style={{ color:"#a67fff", fontWeight:700 }}>+{playerReward} ARCADE</span>
              {" · "}Creator: <span style={{ color:"#7755aa" }}>+{creatorReward} ARCADE</span>
            </div>
          </div>

          {/* Auto-sign status */}
          <div style={{ background:P.s1, border:`1px solid ${P.b}`, borderRadius:10, padding:"14px 18px" }}>
            <div style={{ fontSize:9, color:"#5533aa", textTransform:"uppercase", letterSpacing:"1.5px", fontFamily:P.raj, fontWeight:700, marginBottom:10 }}>Auto-Sign</div>
            {autoSignOn ? (
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:7, fontFamily:P.raj, fontWeight:700, fontSize:12, color:"#00FF88", marginBottom:5 }}>
                  <span style={{ width:6, height:6, background:"#00FF88", borderRadius:"50%", animation:"lbPulse 1.5s ease-in-out infinite" }} />
                  Active — no popups
                </div>
                <div style={{ fontSize:10, color:"#5533aa", fontFamily:P.raj }}>Scores submit automatically on game over</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize:11, color:"#5533aa", marginBottom:8, fontFamily:P.raj }}>Enable for seamless score submission</div>
                <EnableAutoSign />
              </div>
            )}
          </div>

          {/* Manual submit button */}
          {!autoSignOn && score > 0 && !submitted && (
            <button onClick={() => submitScore(score)} disabled={submitting || !isConnected || !initiaAddress} style={{
              padding:"12px",
              background: submitting ? "rgba(123,47,255,0.1)" : "linear-gradient(135deg,#7B2FFF,#5a1fd4)",
              border:"none", borderRadius:8,
              color: submitting ? "#5533aa" : "#fff",
              fontSize:12, fontWeight:700,
              cursor: submitting ? "not-allowed" : "pointer",
              fontFamily:P.raj, letterSpacing:"0.5px", textTransform:"uppercase", transition:"all 0.18s",
            }}>
              {submitting ? "Submitting..." : "Submit Score On-Chain"}
            </button>
          )}

          {/* Submitting state */}
          {submitting && (
            <div style={{ background:"rgba(123,47,255,0.06)", border:`1px solid ${P.b}`, borderRadius:9, padding:14, textAlign:"center" }}>
              <div style={{ fontFamily:P.raj, fontSize:11, color:"#a67fff" }}>Submitting score to blockchain...</div>
            </div>
          )}

          {/* Error */}
          {submitError && (
            <div style={{ background:"rgba(255,68,68,0.06)", border:"1px solid rgba(255,68,68,0.2)", borderRadius:9, padding:14 }}>
              <div style={{ fontFamily:P.raj, fontWeight:700, fontSize:11, color:"#ff4444", marginBottom:4 }}>Submission failed</div>
              <div style={{ fontSize:10, color:"#5533aa", wordBreak:"break-all", fontFamily:"monospace" }}>{submitError}</div>
            </div>
          )}

          {/* Success */}
          {submitted && txHash && (
            <div style={{ background:"rgba(0,255,136,0.05)", border:"1px solid rgba(0,255,136,0.15)", borderRadius:9, padding:16 }}>
              <div style={{ fontFamily:P.raj, fontWeight:700, fontSize:11, color:"#00FF88", marginBottom:6 }}>✓ Score submitted on-chain!</div>
              {tokensEarned > 0 && (
                <div style={{ fontFamily:P.raj, fontWeight:700, fontSize:14, color:"#00FF88", marginBottom:6 }}>+{tokensEarned} ARCADE earned! 🎉</div>
              )}
              <div style={{ fontSize:9, color:"#5533aa", wordBreak:"break-all", fontFamily:"monospace", marginBottom:8 }}>{txHash}</div>
              <a href={`https://scan.testnet.initia.xyz/initiation-2/txs/${txHash}`} target="_blank" rel="noreferrer"
                style={{ fontSize:10, color:"#a67fff", textDecoration:"none", fontFamily:P.raj, fontWeight:700 }}>
                View on Explorer →
              </a>
            </div>
          )}

          {/* Game Info */}
          <div style={{ background:P.s1, border:`1px solid ${P.b}`, borderRadius:10, padding:"14px 18px" }}>
            <div style={{ fontSize:9, color:"#5533aa", textTransform:"uppercase", letterSpacing:"1.5px", fontFamily:P.raj, fontWeight:700, marginBottom:12 }}>Game Info</div>
            {[
              ["Category",      game.category],
              ["Player Reward", `+${playerReward} ARCADE`],
              ["Creator Reward",`+${creatorReward} ARCADE`],
              ["Total Plays",   (game.plays||0).toLocaleString()],
              ["Chain",         "initiation-2"],
              ["Contract",      CONTRACT.slice(0,10)+"..."],
            ].map(([k,v]) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between", fontSize:11, padding:"6px 0", borderBottom:`1px solid ${P.b}` }}>
                <span style={{ color:"#5533aa", fontFamily:P.raj }}>{k}</span>
                <span style={{ color:"#9977cc", fontFamily:P.raj, fontWeight:600 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Powered by */}
          <div style={{ textAlign:"center", padding:"8px 0" }}>
            <span style={{ fontSize:9, color:"#3a2a5a", fontFamily:P.raj, letterSpacing:"1px" }}>Powered by Initia · On-Chain Gaming</span>
          </div>
        </div>
      </div>
    </div>
  );
}