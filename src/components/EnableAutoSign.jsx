// src/components/EnableAutoSign.jsx
import { useInterwovenKit } from "@initia/interwovenkit-react";
import { useMutation } from "@tanstack/react-query";

const CHAIN_ID = "initiation-2";

export default function EnableAutoSign() {
  const { autoSign, address } = useInterwovenKit();

  const enable = useMutation({
    mutationFn: () => autoSign.enable(CHAIN_ID),
    onError: (err) => console.error("Enable failed:", err),
  });

  const disable = useMutation({
    mutationFn: () => autoSign.disable(CHAIN_ID),
    onError: (err) => console.error("Disable failed:", err),
  });

  if (!address) return null;
  if (autoSign.isLoading) return null;

  if (autoSign.isEnabledByChain[CHAIN_ID]) {
    const expiry = autoSign.expiredAtByChain[CHAIN_ID];
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 16px", background: "#0d1f12",
        border: "0.5px solid #1a3a1a", borderRadius: 8,
        fontSize: 12,
      }}>
        <span style={{ color: "#00FF88" }}>⚡ Auto-sign active</span>
        {expiry && <span style={{ color: "#444" }}>Expires: {expiry.toLocaleString()}</span>}
        <button onClick={() => disable.mutate()} disabled={disable.isPending}
          style={{ padding: "4px 10px", background: "transparent", border: "0.5px solid #333", borderRadius: 6, color: "#666", fontSize: 11 }}>
          {disable.isPending ? "Revoking..." : "Revoke"}
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => enable.mutate()} disabled={enable.isPending}
      style={{
        padding: "10px 20px", background: "#0d1f12",
        border: "0.5px solid #1a3a1a", borderRadius: 8,
        color: "#00FF88", fontSize: 13,
      }}>
      {enable.isPending ? "Setting up Ghost Wallet..." : "⚡ Enable Auto-sign"}
    </button>
  );
}