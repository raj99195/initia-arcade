import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useInterwovenKit } from "@initia/interwovenkit-react";
import { useGames } from "../hooks/useGames";
import { getScores, getScoresByGame } from "../lib/gameService";

const CONTRACT = "0xd1aa08d2de31ca1af55682f4185547f92332bee";
const REST = "https://rest.testnet.initia.xyz";

function bech32ToHex(addr) {
  const charset = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
  const stripped = addr.slice(addr.indexOf("1") + 1);
  const data = [];
  for (const c of stripped) {
    const idx = charset.indexOf(c);
    if (idx !== -1) data.push(idx);
  }
  const result = [];
  let acc = 0, bits = 0;
  for (const val of data.slice(0, -6)) {
    acc = ((acc << 5) | val) & 0x1fff;
    bits += 5;
    if (bits >= 8) { bits -= 8; result.push((acc >> bits) & 0xff); }
  }
  return "0x" + result.map(b => b.toString(16).padStart(2, "0")).join("");
}

const rankColor = { 1: "#FFB800", 2: "#aaaaaa", 3: "#cd7f32" };
const rankEmoji  = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function Leaderboard() {
  const { initiaAddress } = useInterwovenKit();
  const { isConnected } = useAccount();
  const { games } = useGames();

  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("global");
  const [selectedGameId, setSelectedGameId] = useState("all");
  const [myStats, setMyStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchScores = async () => {
    setLoading(true);
    try {
      const data = await getScores();
      setScores(data);
    } catch (err) {
      console.error("Scores fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyStats = async () => {
    if (!initiaAddress) return;
    try {
      const hexAddr = bech32ToHex(initiaAddress);
      const res = await fetch(
        `${REST}/initia/move/v1/accounts/${CONTRACT}/resources/view?module_name=leaderboard&function_name=get_player_stats&type_args=[]&args=["address:${hexAddr}"]`
      );
      const data = await res.json();
      if (data?.data) {
        const arr = JSON.parse(data.data);
        setMyStats({
          totalScore: parseInt(arr[0] || "0"),
          gamesPlayed: parseInt(arr[1] || "0"),
          bestScore: parseInt(arr[2] || "0"),
        });
      }
    } catch (err) {
      console.error("My stats fetch failed:", err);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await fetchScores();
    await fetchMyStats();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchScores();
    if (initiaAddress) fetchMyStats();
  }, [initiaAddress]);

  // Global — group by player, best score
  const globalLeaderboard = Object.values(
    scores.reduce((acc, s) => {
      const p = s.player;
      if (!acc[p]) {
        acc[p] = { player: p, bestScore: 0, totalScore: 0, gamesPlayed: 0, bestGame: "" };
      }
      acc[p].totalScore += s.score;
      acc[p].gamesPlayed += 1;
      if (s.score > acc[p].bestScore) {
        acc[p].bestScore = s.score;
        acc[p].bestGame = s.gameName;
      }
      return acc;
    }, {})
  )
    .sort((a, b) => b.bestScore - a.bestScore)
    .map((p, i) => ({ ...p, rank: i + 1 }));

  // By game
  const gameLeaderboard = (
    selectedGameId === "all"
      ? scores
      : scores.filter(s => s.gameId === parseInt(selectedGameId))
  )
    .sort((a, b) => b.score - a.score)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  const myHexAddr = initiaAddress ? bech32ToHex(initiaAddress) : null;
  const myRank = globalLeaderboard.findIndex(p => p.player === myHexAddr) + 1;

  const displayData = activeTab === "global" ? globalLeaderboard : gameLeaderboard;

  return (
    <div style={{ padding: "52px" }}>

      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 12px", border: "0.5px solid #252525", borderRadius: 20, fontSize: 11, color: "#555", marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          <span style={{ width: 5, height: 5, background: "#00FF88", borderRadius: "50%" }} />
          Live on-chain scores
        </div>
        <h1 style={{ fontSize: 48, fontWeight: 500, letterSpacing: "-1.5px", marginBottom: 8 }}>
          Global <span style={{ color: "#00FF88" }}>Leaderboard</span>
        </h1>
        <p style={{ color: "#444", fontSize: 14 }}>
          Tamper-proof scores from Initia blockchain — verified every block.
        </p>
      </div>

      {/* My Stats Banner */}
      {isConnected && myStats && (
        <div style={{ background: "#0d1f12", border: "0.5px solid #1a3a1a", borderRadius: 12, padding: "16px 24px", marginBottom: 28, display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, color: "#00FF88", fontWeight: 500, marginRight: 24 }}>Your Stats</div>
          {[
            { label: "Global Rank", value: myRank > 0 ? `#${myRank}` : "—", color: "#FFB800" },
            { label: "Best Score", value: myStats.bestScore.toLocaleString(), color: "#00FF88" },
            { label: "Total Score", value: myStats.totalScore.toLocaleString(), color: "#fff" },
            { label: "Games Played", value: myStats.gamesPlayed, color: "#4499ff" },
          ].map((s, i) => (
            <div key={s.label} style={{ textAlign: "center", padding: "0 20px", borderLeft: "0.5px solid #1a3a1a" }}>
              <div style={{ fontSize: 20, fontWeight: 500, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
          <button onClick={refresh} disabled={refreshing}
            style={{ marginLeft: "auto", padding: "8px 16px", background: "transparent", border: "0.5px solid #1a3a1a", borderRadius: 8, color: "#00FF88", fontSize: 12, cursor: "pointer" }}>
            {refreshing ? "..." : "↻ Refresh"}
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20 }}>

        {/* Main Table */}
        <div>
          {/* Tabs */}
          <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 20, borderBottom: "0.5px solid #1e1e1e" }}>
            {[
              { id: "global", label: "Global" },
              { id: "by-game", label: "By Game" },
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

            {activeTab === "by-game" && (
              <select value={selectedGameId} onChange={e => setSelectedGameId(e.target.value)}
                style={{ marginLeft: "auto", padding: "6px 12px", background: "#111", border: "0.5px solid #2a2a2a", borderRadius: 6, color: "#fff", fontSize: 12, outline: "none", marginBottom: 4 }}>
                <option value="all">All Games</option>
                {games.map(g => (
                  <option key={g.id} value={g.id}>#{g.id} — {g.name}</option>
                ))}
              </select>
            )}

            {!isConnected && (
              <button onClick={refresh} disabled={refreshing}
                style={{ marginLeft: "auto", padding: "6px 14px", background: "transparent", border: "0.5px solid #1e1e1e", borderRadius: 6, color: "#555", fontSize: 11, cursor: "pointer", marginBottom: 4 }}>
                {refreshing ? "..." : "↻"}
              </button>
            )}
          </div>

          {/* Table */}
          <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "14px 22px", borderBottom: "0.5px solid #1e1e1e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>
                {activeTab === "global" ? "Top Players" : selectedGameId === "all" ? "All Game Scores" : `Game #${selectedGameId} Scores`}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#444" }}>
                <span style={{ width: 5, height: 5, background: "#00FF88", borderRadius: "50%", display: "inline-block" }} />
                Live · {displayData.length} entries
              </div>
            </div>

            {/* Column headers */}
            <div style={{ display: "grid", gridTemplateColumns: activeTab === "global" ? "52px 1fr 140px 100px 100px" : "52px 1fr 140px 100px", padding: "8px 22px", borderBottom: "0.5px solid #1a1a1a" }}>
              {(activeTab === "global"
                ? ["Rank", "Player", "Best Game", "Best Score", "Total"]
                : ["Rank", "Player", "Game", "Score"]
              ).map((h, i) => (
                <div key={i} style={{ fontSize: 10, color: "#333", textTransform: "uppercase", letterSpacing: 1, textAlign: i >= 3 ? "right" : "left" }}>{h}</div>
              ))}
            </div>

            {loading ? (
              <div style={{ padding: 48, textAlign: "center", fontSize: 13, color: "#444" }}>
                Loading scores...
              </div>
            ) : displayData.length === 0 ? (
              <div style={{ padding: 64, textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🏆</div>
                <div style={{ fontSize: 14, color: "#555", marginBottom: 8 }}>No scores yet</div>
                <div style={{ fontSize: 12, color: "#333" }}>Play a game to get on the board!</div>
              </div>
            ) : (
              displayData.map((row, idx) => {
                const isMe = row.player === myHexAddr;
                return (
                  <div key={idx}
                    style={{
                      display: "grid",
                      gridTemplateColumns: activeTab === "global" ? "52px 1fr 140px 100px 100px" : "52px 1fr 140px 100px",
                      padding: "14px 22px",
                      borderBottom: "0.5px solid #0f0f0f",
                      background: isMe ? "#0d1f12" : "transparent",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => !isMe && (e.currentTarget.style.background = "#141414")}
                    onMouseLeave={e => !isMe && (e.currentTarget.style.background = "transparent")}>

                    {/* Rank */}
                    <div style={{ display: "flex", alignItems: "center" }}>
                      {row.rank <= 3 ? (
                        <span style={{ fontSize: 18 }}>{rankEmoji[row.rank]}</span>
                      ) : (
                        <span style={{ fontSize: 13, color: "#333", fontWeight: 500 }}>{row.rank}</span>
                      )}
                    </div>

                    {/* Player */}
                    <div style={{ alignSelf: "center" }}>
                      <div style={{ fontSize: 12, color: isMe ? "#00FF88" : "#888", fontFamily: "monospace" }}>
                        {row.player?.slice(0, 10)}...{row.player?.slice(-6)}
                      </div>
                      {isMe && <div style={{ fontSize: 10, color: "#1a5a1a", marginTop: 2 }}>← You</div>}
                    </div>

                    {/* Game name */}
                    <div style={{ fontSize: 12, color: "#555", alignSelf: "center" }}>
                      {activeTab === "global" ? (row.bestGame || "—") : (row.gameName || `Game #${row.gameId}`)}
                    </div>

                    {/* Score */}
                    <div style={{ fontSize: 14, fontWeight: 500, color: rankColor[row.rank] || "#00FF88", textAlign: "right", alignSelf: "center" }}>
                      {(activeTab === "global" ? row.bestScore : row.score).toLocaleString()}
                    </div>

                    {/* Total (global only) */}
                    {activeTab === "global" && (
                      <div style={{ fontSize: 12, color: "#555", textAlign: "right", alignSelf: "center" }}>
                        {row.totalScore.toLocaleString()}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* My Rank */}
          <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 12, padding: 22 }}>
            <div style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Your Rank</div>
            {isConnected ? (
              myStats ? (
                <div>
                  <div style={{ fontSize: 42, fontWeight: 500, color: "#00FF88", letterSpacing: "-1px" }}>
                    {myRank > 0 ? `#${myRank}` : "—"}
                  </div>
                  <div style={{ fontSize: 12, color: "#444", marginTop: 4, marginBottom: 16 }}>Global ranking</div>
                  {[
                    ["Best Score", myStats.bestScore.toLocaleString()],
                    ["Total Score", myStats.totalScore.toLocaleString()],
                    ["Games Played", myStats.gamesPlayed],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8, paddingBottom: 8, borderBottom: "0.5px solid #1a1a1a" }}>
                      <span style={{ color: "#444" }}>{k}</span>
                      <span style={{ color: "#888" }}>{v}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "#444" }}>No scores yet — play a game!</div>
              )
            ) : (
              <div style={{ fontSize: 13, color: "#444" }}>Connect wallet to see your rank</div>
            )}
          </div>

          {/* Top Games */}
          <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 12, padding: 22 }}>
            <div style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Top Games</div>
            {games.length === 0 ? (
              <div style={{ fontSize: 12, color: "#333" }}>No games yet</div>
            ) : (
              games.slice(0, 5).map((g, i) => {
                const gameScoreCount = scores.filter(s => s.gameId === g.id).length;
                return (
                  <div key={g.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, marginBottom: 10, paddingBottom: 10, borderBottom: "0.5px solid #1a1a1a" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, color: "#333", minWidth: 16 }}>{i + 1}</span>
                      <span style={{ color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>{g.name}</span>
                    </div>
                    <span style={{ fontSize: 11, color: "#333" }}>{gameScoreCount} scores</span>
                  </div>
                );
              })
            )}
          </div>

          {/* How it works */}
          <div style={{ background: "#0d1020", border: "0.5px solid #1a2540", borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: 11, color: "#4499ff", fontWeight: 500, marginBottom: 10 }}>How scores work</div>
            {[
              "Play any game on InitiaArcade",
              "Score submits on Initia blockchain",
              "Tamper-proof — nobody can fake it",
              "Leaderboard updates instantly",
            ].map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 8, fontSize: 11, color: "#444", marginBottom: 6, lineHeight: 1.5 }}>
                <span style={{ color: "#4499ff", flexShrink: 0, fontWeight: 500 }}>0{i + 1}</span>
                <span>{t}</span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}