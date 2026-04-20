import { useState } from "react";
import { useNavigate } from "react-router-dom";
import GameCard from "../components/GameCard";
import { useGames } from "../hooks/useGames";

const categories = ["All", "Action", "Runner", "Strategy", "Puzzle", "Casual", "Shooter", "Adventure"];

export default function GameLibrary() {
  const navigate = useNavigate();
  const [active, setActive] = useState("All");
  const { games, loading } = useGames();
  const filtered = active === "All" ? games : games.filter(g => g.category === active);

  return (
    <div style={{ minHeight: "calc(100vh - 54px)", background: "#08070f", padding: "28px 36px" }}>

      <style>{`@keyframes lbPulse{0%,100%{opacity:1}50%{opacity:0.35}}`}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "4px 11px", border: "1px solid rgba(123,47,255,0.2)",
          borderRadius: 4, fontSize: 9, color: "rgba(180,150,255,0.55)",
          letterSpacing: "1.5px", textTransform: "uppercase",
          marginBottom: 14, background: "rgba(123,47,255,0.06)",
          fontFamily: "'Rajdhani',sans-serif", fontWeight: 600,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00FF88", animation: "lbPulse 1.5s ease-in-out infinite" }} />
          {games.length} Games Live · Initia Testnet
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 42, letterSpacing: "-0.5px", textTransform: "uppercase", lineHeight: 1 }}>
            All{" "}
            <span style={{ background: "linear-gradient(90deg,#7B2FFF,#00d4ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Games
            </span>
          </h1>

        </div>
      </div>

      {/* Category Filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setActive(cat)} style={{
            padding: "6px 15px", borderRadius: 20,
            border: `1px solid ${active === cat ? "rgba(123,47,255,0.4)" : "rgba(123,47,255,0.1)"}`,
            background: active === cat ? "rgba(123,47,255,0.12)" : "transparent",
            color: active === cat ? "#c4a0ff" : "#7755aa",
            fontSize: 11, cursor: "pointer", transition: "all 0.18s",
            fontFamily: "'Rajdhani',sans-serif", fontWeight: 600, letterSpacing: "0.3px",
          }}
          onMouseEnter={e => { if (active !== cat) { e.currentTarget.style.borderColor = "rgba(123,47,255,0.25)"; e.currentTarget.style.color = "#a67fff"; }}}
          onMouseLeave={e => { if (active !== cat) { e.currentTarget.style.borderColor = "rgba(123,47,255,0.1)"; e.currentTarget.style.color = "#7755aa"; }}}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ padding: 48, textAlign: "center", fontSize: 12, color: "#7755aa", fontFamily: "'Rajdhani',sans-serif" }}>
          Loading games from chain...
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div style={{ padding: 64, textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>🎮</div>
          <div style={{ fontSize: 14, color: "#9977cc", marginBottom: 8, fontFamily: "'Rajdhani',sans-serif", fontWeight: 700 }}>
            {active === "All" ? "No approved games yet" : `No ${active} games yet`}
          </div>

        </div>
      )}

      {/* Grid */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {filtered.map(game => <GameCard key={game.id} game={game} />)}
        </div>
      )}
    </div>
  );
}