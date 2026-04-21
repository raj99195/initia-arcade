import { useState } from "react";
import GameCard from "../components/GameCard";
import { useGames } from "../hooks/useGames";

const categories = ["All","Action","Runner","Strategy","Puzzle","Casual","Shooter","Adventure"];

export default function GameLibrary() {
  const [active, setActive] = useState("All");
  const [search, setSearch] = useState("");
  const { games, loading } = useGames();

  const filtered = (active === "All" ? games : games.filter(g => g.category === active))
    .filter(g => g.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{
      minHeight: "calc(100vh - 54px)",
      background: "transparent",
      position: "relative"
    }}>

      {/* ── FULL PAGE FIXED BG (Leaderboard Style) ── */}
      <div style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none"
      }}>
        <img src="/bg-games.png" alt="" style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center -100px"
        }} />

        <div style={{
          position: "absolute",
          inset: 0,
          background: "rgba(8,7,15,0.55)"
        }} />
      </div>

      {/* ── PAGE CONTENT ── */}
      <div style={{ position: "relative", zIndex: 1, padding: "28px 36px" }}>

        {/* HEADER */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{
            fontSize: 42,
            fontWeight: 700,
            color: "#fff"
          }}>
            ALL{" "}
            <span style={{
              background: "linear-gradient(90deg,#7B2FFF,#00d4ff)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>
              GAMES
            </span>
          </h1>

          <p style={{ color: "#aaa", marginTop: 6 }}>
            Discover, play and compete in on-chain games.
          </p>
        </div>

        {/* FILTER + SEARCH */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 24
        }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActive(cat)} style={{
                padding: "8px 16px",
                borderRadius: 20,
                border: `1px solid ${active === cat ? "rgba(123,47,255,0.4)" : "rgba(123,47,255,0.1)"}`,
                background: active === cat ? "rgba(123,47,255,0.25)" : "rgba(20,15,40,0.5)",
                color: active === cat ? "#fff" : "#aaa",
                cursor: "pointer",
                backdropFilter: "blur(8px)"
              }}>
                {cat}
              </button>
            ))}
          </div>

          <input
            placeholder="Search games..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(123,47,255,0.2)",
              background: "rgba(20,15,40,0.6)",
              color: "#fff",
              outline: "none",
              backdropFilter: "blur(8px)"
            }}
          />
        </div>

        {/* GRID */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 50, color: "#aaa" }}>
            Loading games...
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 20
          }}>
            {filtered.map(game => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        )}

        {/* BOTTOM INFO */}
        <div style={{
          marginTop: 40,
          padding: 20,
          borderRadius: 14,
          background: "rgba(6,5,12,0.75)",
          border: "1px solid rgba(123,47,255,0.15)",
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 20,
          textAlign: "center",
          backdropFilter: "blur(20px)"
        }}>
          {[
            ["🛡️","On-Chain Verified","All games are fully on-chain"],
            ["⚡","Instant Play","No downloads required"],
            ["🏆","Fair Rewards","Earn real rewards"],
            ["🔒","Secure","Built on blockchain"]
          ].map(([icon,title,desc]) => (
            <div key={title}>
              <div style={{ fontSize: 28 }}>{icon}</div>
              <div style={{ fontWeight: 700, marginTop: 6, color:"#fff" }}>{title}</div>
              <div style={{ fontSize: 12, color: "#aaa" }}>{desc}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}