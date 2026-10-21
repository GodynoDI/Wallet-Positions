import { createConfig, custom } from "wagmi";
import { mainnet } from "wagmi/chains";
import { injected } from "wagmi/connectors";

// "wallet": all reads go through the connected wallet's own RPC (works where the page
// itself may not open network connections). "http": reads go to a public RPC node,
// so any address can be looked up without a wallet.
export const TRANSPORT = (import.meta.env.VITE_TRANSPORT as string) === "wallet" ? "wallet" : "http";

const RPC_URLS = [
  "https://ethereum-rpc.publicnode.com",
  "https://eth.llamarpc.com",
  "https://1rpc.io/eth",
  "https://eth.drpc.org",
];

// Sends each request to every node at once and uses the first valid answer, so one slow
// or rate-limited node never holds the page up. A node that returns an error loses the race.
async function callNode(url: string, method: string, params: unknown, signal: AbortSignal) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal,
  });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const json = (await res.json()) as { result?: unknown; error?: { message: string } };
  if (json.error || json.result === undefined) throw new Error(`${url}: ${json.error?.message ?? "empty result"}`);
  return json.result;
}

const racing = (urls: string[]) =>
  custom({
    async request({ method, params }) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15_000);
      try {
        return await Promise.any(urls.map((u) => callNode(u, method, params, ctrl.signal)));
      } finally {
        clearTimeout(timer);
        ctrl.abort();
      }
    },
  });

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
  transports: { [mainnet.id]: TRANSPORT === "wallet" ? walletTransport : racing(RPC_URLS) },
});
