import { Link, useNavigate } from "react-router-dom";
import { useInterwovenKit, useUsernameQuery } from "@initia/interwovenkit-react";
import { useAccount } from "wagmi";
import { useArcadeBalance } from "../hooks/useArcadeBalance";
export default function Navbar() {
  const { openConnect, openWallet, openDeposit, openWithdraw, autoSign } = useInterwovenKit();
  const { isConnected, address } = useAccount();
  const navigate = useNavigate();
  const { data: displayName, isLoading: usernameLoading } = useUsernameQuery();
  const { balance } = useArcadeBalance();
  const short = (addr) => addr ? addr.slice(0, 8) + "..." + addr.slice(-4) : "";
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "18px 52px",
      borderBottom: "0.5px solid #1a1a1a",
      background: "rgba(12,12,12,0.95)",
      backdropFilter: "blur(12px)",
    }}>
      {/* Logo */}
      <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 17, fontWeight: 500, letterSpacing: "-0.3px", textDecoration: "none", color: "#fff" }}>
        <div style={{
          width: 30, height: 30, background: "#00FF88", borderRadius: 6,
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, padding: 5,
        }}>
          {[0,1,2,3].map(i => (
            <span key={i} style={{ background: "#0C0C0C", borderRadius: i === 3 ? "50%" : 1 }} />
          ))}
        </div>
        InitiaArcade
      </Link>
      {/* Nav Links */}
      <div style={{ display: "flex", gap: 32, fontSize: 13, color: "#555" }}>
        {[["Games", "/games"], ["Leaderboard", "/leaderboard"], ["Earn", "/games"], ["Publish", "/publish"]].map(([label, path]) => (
          <Link key={label} to={path} style={{ color: "#555", transition: "color 0.2s", textDecoration: "none" }}
            onMouseEnter={e => e.target.style.color = "#fff"}
            onMouseLeave={e => e.target.style.color = "#555"}>
            {label}
          </Link>
        ))}
      </div>
      {/* Right side */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {/* ARCADE Balance */}
        {isConnected && balance !== null && (
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 12px", border: "0.5px solid #1a2e1a",
            borderRadius: 8, fontSize: 11, background: "#0a1a0a",
          }}>
            <span style={{ color: "#00FF88", fontWeight: 500 }}>
              {Number(balance).toLocaleString()}
            </span>
            <span style={{ color: "#444" }}>ARCADE</span>
          </div>
        )}
        {/* Auto-sign status */}
        {isConnected && (
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 12px", border: "0.5px solid #1e1e1e",
            borderRadius: 8, fontSize: 11, color: "#555",
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: autoSign?.isEnabledByChain?.["initiation-2"] ? "#00FF88" : "#444",
            }} />
            {autoSign?.isEnabledByChain?.["initiation-2"] ? "Auto-sign ON" : "Auto-sign OFF"}
          </div>
        )}
        {/* Wallet button */}
        {isConnected ? (
          <button onClick={openWallet} style={{
            padding: "9px 18px", background: "transparent",
            border: "0.5px solid #2a2a2a", borderRadius: 8,
            color: "#fff", fontSize: 13, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            {usernameLoading ? (
              <span style={{ fontSize: 10, color: "#555" }}>...</span>
            ) : displayName ? (
              <span style={{
                background: "#0d1f12", color: "#00FF88",
                padding: "2px 8px", borderRadius: 4,
                fontSize: 10, fontWeight: 500,
              }}>
                {displayName}
              </span>
            ) : null}
            {short(address)}
          </button>
        ) : (
          <button onClick={openConnect} style={{
            padding: "9px 18px", background: "transparent",
            border: "0.5px solid #2a2a2a", borderRadius: 8,
            color: "#888", fontSize: 13, cursor: "pointer",
          }}>
            Connect Wallet
          </button>
        )}
        {/* Bridge In */}
        {isConnected && (
          <>
            <button
              onClick={() => openDeposit({ denoms: ["uinit"], chainId: "initiation-2" })}
              style={{
                padding: "9px 18px", background: "transparent",
                border: "0.5px solid #2a2a2a", borderRadius: 8,
                color: "#888", fontSize: 13, cursor: "pointer", transition: "all 0.2s",
              }}
              onMouseEnter={e => { e.target.style.color = "#00FF88"; e.target.style.borderColor = "#00FF88"; }}
              onMouseLeave={e => { e.target.style.color = "#888"; e.target.style.borderColor = "#2a2a2a"; }}>
              Bridge In
            </button>
            {/* Bridge Out */}
            <button
              onClick={() => openWithdraw({ denoms: ["uinit"], chainId: "initiation-2" })}
              style={{
                padding: "9px 18px", background: "transparent",
                border: "0.5px solid #2a2a2a", borderRadius: 8,
                color: "#888", fontSize: 13, cursor: "pointer", transition: "all 0.2s",
              }}
              onMouseEnter={e => { e.target.style.color = "#7B2FFF"; e.target.style.borderColor = "#7B2FFF"; }}
              onMouseLeave={e => { e.target.style.color = "#888"; e.target.style.borderColor = "#2a2a2a"; }}>
              Bridge Out
            </button>
          </>
        )}
        {/* Play Now */}
        <button onClick={() => navigate("/games")} style={{
          padding: "9px 18px", background: "#00FF88",
          border: "none", borderRadius: 8,
          color: "#0C0C0C", fontSize: 13, fontWeight: 500, cursor: "pointer",
        }}>
          Play Now
        </button>
      </div>
    </nav>
  );
}