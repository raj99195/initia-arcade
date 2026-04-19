import { useEffect } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { mainnet } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  InterwovenKitProvider,
  initiaPrivyWalletConnector,
  injectStyles,
  TESTNET,
} from "@initia/interwovenkit-react";
import styles from "@initia/interwovenkit-react/styles.js";
const config = createConfig({
  connectors: [initiaPrivyWalletConnector],
  chains: [mainnet],
  transports: { [mainnet.id]: http() },
});
const queryClient = new QueryClient();
export const CONTRACT_ADDRESS = "0xd1aa08d2de31ca1af55682f4185547f92332bee";
export const ADMIN_ADDRESS = "init1p5d2prfduvw2rt64dqh5rp2507frx2lwyr8fx9";
export const CHAIN_ID = "initiation-2";
export default function Providers({ children }) {
  useEffect(() => {
    injectStyles(styles);
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <InterwovenKitProvider
          {...TESTNET}
          defaultChainId="initiation-2"
          enableAutoSign
        >
          {children}
        </InterwovenKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}