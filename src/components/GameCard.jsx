import { useNavigate } from "react-router-dom";

const tagColors = {
  HOT: { bg: "#ff4444", color: "#fff" },
  NEW: { bg: "#00FF88", color: "#0C0C0C" },
  TOP: { bg: "#7B2FFF", color: "#fff" },
};

export default function GameCard({ game }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/play/${game.id}`)}
      style={{
        background: "#111", border: "0.5px solid #1e1e1e",
        borderRadius: 12, overflow: "hidden",
        cursor: "pointer", transition: "all 0.25s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "#00FF88";
        e.currentTarget.style.transform = "translateY(-3px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "#1e1e1e";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Thumbnail */}
      <div style={{
        height: 150, background: game.bg || "#0d1a10",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", fontSize: 44, overflow: "hidden",
      }}>
        {game.thumbnailUrl ? (
          <img
            src={game.thumbnailUrl}
            alt={game.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={e => { e.target.style.display = "none"; }}
          />
        ) : (
          <span>{game.emoji || "🎮"}</span>
        )}
        {game.tag && (
          <span style={{
            position: "absolute", top: 10, left: 10,
            padding: "3px 8px", borderRadius: 4,
            fontSize: 9, fontWeight: 500,
            letterSpacing: "0.5px", textTransform: "uppercase",
            ...(tagColors[game.tag] || tagColors.NEW),
          }}>
            {game.tag}
          </span>
        )}
        {/* Category badge */}
        <span style={{
          position: "absolute", bottom: 10, right: 10,
          padding: "3px 8px", borderRadius: 4,
          fontSize: 9, color: "#888",
          background: "rgba(0,0,0,0.6)",
          border: "0.5px solid #2a2a2a",
        }}>
          {game.category}
        </span>
      </div>

      {/* Info */}
      <div style={{ padding: "14px 16px" }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{game.name}</div>
        <div style={{ fontSize: 11, color: "#555", marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {game.description || "A blockchain game on Initia"}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: "#444" }}>{(game.plays || 0).toLocaleString()} plays</span>
          <span style={{ fontSize: 11, color: "#00FF88" }}>+{game.reward || 50} ARCADE</span>
        </div>
      </div>
    </div>
  );
}