import { useNavigate } from "react-router-dom";

const tagColors = {
  HOT: { bg: "#ff4444", color: "#fff" },
  NEW: { bg: "#7B2FFF", color: "#fff" },
  TOP: { bg: "linear-gradient(90deg,#7B2FFF,#00d4ff)", color: "#fff" },
};

export default function GameCard({ game }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/play/${game.id}`)}
      style={{
        background: "#0e0c1a",
        border: "1px solid rgba(123,47,255,0.1)",
        borderRadius: 10, overflow: "hidden",
        cursor: "pointer", transition: "all 0.22s",
        display: "flex", flexDirection: "column",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "rgba(123,47,255,0.4)";
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(123,47,255,0.15)";
        const btn = e.currentTarget.querySelector(".play-btn");
        if (btn) { btn.style.background = "linear-gradient(90deg,#7B2FFF,#5a1fd4)"; btn.style.color = "#fff"; }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "rgba(123,47,255,0.1)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        const btn = e.currentTarget.querySelector(".play-btn");
        if (btn) { btn.style.background = "linear-gradient(90deg,#7B2FFF,#5a1fd4)"; btn.style.color = "#fff"; }
      }}
    >
      {/* Thumbnail */}
      <div style={{
        height: 170,
        background: game.bg || "#0d0a1a",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", fontSize: 32, overflow: "hidden",
        flexShrink: 0,
      }}>
        {game.thumbnailUrl ? (
          <img
            src={game.thumbnailUrl}
            alt={game.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={e => { e.target.style.display = "none"; }}
          />
        ) : (
          <span style={{ fontSize: 44, filter: "drop-shadow(0 0 12px rgba(123,47,255,0.4))" }}>
            {game.emoji || "🎮"}
          </span>
        )}

        {/* Bottom gradient overlay */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "50%",
          background: "linear-gradient(to top, rgba(14,12,26,0.85), transparent)",
          pointerEvents: "none",
        }} />

        {/* Tag badge */}
        {game.tag && (
          <span style={{
            position: "absolute", top: 9, left: 9,
            padding: "3px 8px", borderRadius: 4,
            fontSize: 8, fontWeight: 700,
            letterSpacing: "0.8px", textTransform: "uppercase",
            fontFamily: "'Rajdhani',sans-serif",
            background: tagColors[game.tag]?.bg || "#7B2FFF",
            color: tagColors[game.tag]?.color || "#fff",
          }}>
            {game.tag}
          </span>
        )}

        {/* Category badge */}
        <span style={{
          position: "absolute", bottom: 9, left: 9,
          padding: "2px 7px", borderRadius: 3,
          fontSize: 8, color: "rgba(180,150,255,0.6)",
          background: "rgba(123,47,255,0.15)",
          border: "1px solid rgba(123,47,255,0.2)",
          fontFamily: "'Rajdhani',sans-serif", fontWeight: 600, letterSpacing: "0.5px",
        }}>
          {game.category}
        </span>
      </div>

      {/* Info */}
      <div style={{ padding: "12px 14px 0", flex: 1 }}>
        <div style={{
          fontSize: 13, fontWeight: 700, marginBottom: 3,
          fontFamily: "'Rajdhani',sans-serif", letterSpacing: "0.2px",
          color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {game.name}
        </div>
        <div style={{
          fontSize: 10, color: "#2a1a4a", marginBottom: 8,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          fontFamily: "'Rajdhani',sans-serif",
        }}>
          {game.description || "A blockchain game on Initia"}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 10, color: "#2a1a4a", fontFamily: "'Rajdhani',sans-serif" }}>
            {(game.plays || 0).toLocaleString()} players
          </span>
          <span style={{
            fontSize: 10, color: "#a67fff",
            fontFamily: "'Orbitron',sans-serif", fontWeight: 600,
          }}>
            +{game.reward || game.rewardRate || 50} ARCADE
          </span>
        </div>
      </div>

      {/* PLAY NOW button */}
      <div style={{ padding: "0 14px 12px" }}>
        <button
          className="play-btn"
          style={{
            width: "100%", padding: "8px",
            background: "linear-gradient(90deg,#7B2FFF,#5a1fd4)",
            border: "1px solid rgba(123,47,255,0.4)",
            borderRadius: 6,
            fontFamily: "'Rajdhani',sans-serif", fontWeight: 700,
            fontSize: 11, color: "#fff",
            cursor: "pointer", letterSpacing: "1.5px",
            textTransform: "uppercase",
            transition: "all 0.18s",
          }}
        >
          Play Now
        </button>
      </div>
    </div>
  );
}