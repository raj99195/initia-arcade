import { useState } from "react";
import GameCard from "../components/GameCard";
import { useGames } from "../hooks/useGames";

const categories = ["All", "Action", "Runner", "Strategy", "Puzzle", "Casual", "Shooter", "Adventure"];

export default function GameLibrary() {
  const [active, setActive] = useState("All");
  const { games, loading } = useGames();

  const filtered = active === "All" ? games : games.filter(g => g.category === active);

  return (
    <div style={{ padding: "52px" }}>
      <h1 style={{ fontSize: 42, fontWeight: 500, letterSpacing: "-1px", marginBottom: 8 }}>
        All <span style={{ color: "#00FF88" }}>Games</span>
      </h1>
      <p style={{ color: "#444", fontSize: 14, marginBottom: 36 }}>
        {games.length} games live on Initia testnet — zero wallet popups
      </p>

      {/* Category Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setActive(cat)} style={{
            padding: "7px 16px", borderRadius: 20,
            border: "0.5px solid",
            borderColor: active === cat ? "#00FF88" : "#1e1e1e",
            background: active === cat ? "#0d1f12" : "transparent",
            color: active === cat ? "#00FF88" : "#555",
            fontSize: 12, cursor: "pointer",
          }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ padding: 48, textAlign: "center", fontSize: 13, color: "#444" }}>
          Loading games from chain...
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div style={{ padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎮</div>
          <div style={{ fontSize: 16, color: "#444" }}>
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