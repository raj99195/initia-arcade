import { useEffect, useState } from "react";
import { useInterwovenKit } from "@initia/interwovenkit-react";

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

export function useArcadeBalance() {
  const { initiaAddress } = useInterwovenKit();
  const [balance, setBalance] = useState("0");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!initiaAddress) return;

    const fetchBalance = async () => {
      setLoading(true);
      try {
        const hexAddr = bech32ToHex(initiaAddress);
        const res = await fetch(
          `${REST}/initia/move/v1/accounts/${hexAddr}/resources`
        );
        const data = await res.json();
        
        // ArcadeBalance struct dhundho
        const arcadeResource = data?.resources?.find(
          r => r.struct_tag === `${CONTRACT}::arcade_token::ArcadeBalance`
        );
        
        if (arcadeResource) {
          const parsed = JSON.parse(arcadeResource.move_resource);
          setBalance(parsed?.data?.amount || "0");
        } else {
          setBalance("0");
        }
      } catch (err) {
        console.error("Balance fetch failed:", err);
        setBalance("0");
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 15000);
    return () => clearInterval(interval);
  }, [initiaAddress]);

  return { balance, loading };
}