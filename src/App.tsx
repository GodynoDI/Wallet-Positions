import { useState } from "react";
import { useAccount, useBalance, useBlockNumber, useConnect, useDisconnect, useEnsName, useReadContracts, useChainId, useSwitchChain } from "wagmi";
import { mainnet } from "wagmi/chains";
import { formatUnits, isAddress, maxUint256, type Address } from "viem";
import { AAVE_ABI, AAVE_POOL, ERC20_ABI, TOKENS } from "./contracts";
import { TRANSPORT } from "./config";

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const fmt = (v: bigint, d: number, max = 4) =>
  Number(formatUnits(v, d)).toLocaleString("en-US", { maximumFractionDigits: max });
const usd = (v: bigint) =>
  Number(formatUnits(v, 8)).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

const SAMPLE = {
  address: "0x0000…0000",
  eth: "1.2480",
  tokens: [
    { symbol: "USDC", value: "5,200.00" },
    { symbol: "USDT", value: "0.00" },
    { symbol: "DAI", value: "310.55" },
  ],
  collateral: "$8,940.12",
  debt: "$2,100.00",
  health: "2.84",
};

export function App() {
  const { address: connected, isConnected } = useAccount();
  const { connect, connectors, error: connectError, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [typed, setTyped] = useState("");

  const target: Address | undefined = isAddress(typed) ? (typed as Address) : connected;
  const wrongChain = isConnected && chainId !== mainnet.id;
  const enabled = Boolean(target) && !wrongChain;

  const block = useBlockNumber({ watch: false, query: { enabled } });
  const ens = useEnsName({ address: target, chainId: mainnet.id, query: { enabled } });
  const eth = useBalance({ address: target, chainId: mainnet.id, query: { enabled } });

  const reads = useReadContracts({
    allowFailure: true,
    query: { enabled },
    contracts: [
      ...TOKENS.map((t) => ({ address: t.address, abi: ERC20_ABI, functionName: "balanceOf", args: [target!] }) as const),
      { address: AAVE_POOL, abi: AAVE_ABI, functionName: "getUserAccountData", args: [target!] } as const,
    ],
  });

  const tokenResults = reads.data?.slice(0, TOKENS.length);
  const aave = reads.data?.[TOKENS.length];
  const aaveData = aave?.status === "success" ? (aave.result as readonly bigint[]) : undefined;
  const noDebt = aaveData && aaveData[5] === maxUint256;
  const noPosition = aaveData && aaveData[0] === 0n && aaveData[1] === 0n;

  const loading = enabled && (eth.isLoading || reads.isLoading);
  const failed = enabled && (eth.isError || reads.isError);

  return (
    <main className="wrap">
      <header className="top">
        <div>
          <p className="eyebrow">Ethereum mainnet · read-only</p>
          <h1>Wallet Positions</h1>
        </div>
        {isConnected ? (
          <button className="btn ghost" onClick={() => disconnect()}>
            Disconnect {short(connected!)}
          </button>
        ) : (
          <button className="btn" disabled={isPending} onClick={() => connect({ connector: connectors[0] })}>
            {isPending ? "Waiting for wallet…" : "Connect wallet"}
          </button>
        )}
      </header>

      {connectError && <p className="note warn" role="alert">{connectError.message.split("\n")[0]}</p>}
      {wrongChain && (
        <p className="note warn" role="alert">
          Your wallet is on another network.{" "}
          <button className="link" onClick={() => switchChain({ chainId: mainnet.id })}>Switch to Ethereum</button>
        </p>
      )}

      {TRANSPORT === "http" && (
        <div className="field">
          <label htmlFor="addr">Look up any address</label>
          <input id="addr" value={typed} onChange={(e) => setTyped(e.target.value.trim())} placeholder="0x… (no wallet needed)" spellCheck={false} autoComplete="off" />
          {typed && !isAddress(typed) && <span className="hint">Not a valid address</span>}
        </div>
      )}

      {!enabled && (
        <section className="panel sample" aria-label="Example data">
          <div className="badge">Example data, not a real wallet</div>
          <Rows
            who={SAMPLE.address}
            eth={SAMPLE.eth}
            tokens={SAMPLE.tokens}
            collateral={SAMPLE.collateral}
            debt={SAMPLE.debt}
            health={SAMPLE.health}
          />
          <p className="foot">
            {TRANSPORT === "wallet"
              ? "Connect a browser wallet to read your balances and Aave position. Nothing is signed or sent."
              : "Connect a wallet or paste an address to read live balances and an Aave position."}
          </p>
        </section>
      )}

      {enabled && (
        <section className="panel" aria-live="polite">
          {loading && <p className="note">Reading chain…</p>}
          {failed && <p className="note warn">Could not read from the network. Try again in a moment.</p>}
          {!loading && !failed && (
            <>
              <Rows
                who={ens.data ?? short(target!)}
                eth={eth.data ? fmt(eth.data.value, 18) : "…"}
                tokens={TOKENS.map((t, i) => ({
                  symbol: t.symbol,
                  value: tokenResults?.[i]?.status === "success" ? fmt(tokenResults[i].result as bigint, t.decimals, 2) : "n/a",
                }))}
                collateral={aaveData ? usd(aaveData[0]) : "n/a"}
                debt={aaveData ? usd(aaveData[1]) : "n/a"}
                health={aaveData ? (noDebt ? "no debt" : Number(formatUnits(aaveData[5], 18)).toFixed(2)) : "n/a"}
              />
              {noPosition && <p className="foot">This address has no open Aave V3 position.</p>}
              <p className="foot mono">block {block.data?.toString() ?? "…"} · reads: balanceOf ×{TOKENS.length}, Pool.getUserAccountData</p>
            </>
          )}
        </section>
      )}
    </main>
  );
}

function Rows(p: {
  who: string;
  eth: string;
  tokens: { symbol: string; value: string }[];
  collateral: string;
  debt: string;
  health: string;
}) {
  return (
    <div className="grid">
      <div className="card">
        <h2>Balances</h2>
        <p className="who mono">{p.who}</p>
        <dl>
          <div><dt>ETH</dt><dd className="num">{p.eth}</dd></div>
          {p.tokens.map((t) => (
            <div key={t.symbol}><dt>{t.symbol}</dt><dd className="num">{t.value}</dd></div>
          ))}
        </dl>
      </div>
      <div className="card">
        <h2>Aave V3 position</h2>
        <dl>
          <div><dt>Collateral</dt><dd className="num">{p.collateral}</dd></div>
          <div><dt>Debt</dt><dd className="num">{p.debt}</dd></div>
          <div><dt>Health factor</dt><dd className="num">{p.health}</dd></div>
        </dl>
      </div>
    </div>
  );
}
