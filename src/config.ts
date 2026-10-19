import { createConfig, http, custom } from "wagmi";
import { mainnet } from "wagmi/chains";
import { injected } from "wagmi/connectors";

// "wallet": all reads go through the connected wallet's own RPC (works where the page
// itself may not open network connections). "http": reads go to a public RPC node,
// so any address can be looked up without a wallet.
export const TRANSPORT = (import.meta.env.VITE_TRANSPORT as string) === "wallet" ? "wallet" : "http";

const walletTransport = custom({
  async request(args) {
    const provider = (window as unknown as { ethereum?: { request: (a: unknown) => Promise<unknown> } }).ethereum;
    if (!provider) throw new Error("No wallet found");
    return provider.request(args);
  },
});

export const config = createConfig({
  chains: [mainnet],
  connectors: [injected()],
  transports: { [mainnet.id]: TRANSPORT === "wallet" ? walletTransport : http("https://ethereum-rpc.publicnode.com") },
});
