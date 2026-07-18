import { COMPATIBLE_CHAINS } from "./ChainIcons";

export function ChainStrip({ label }: { label: string }) {
  const loop = [...COMPATIBLE_CHAINS, ...COMPATIBLE_CHAINS];

  return (
    <div className="twc-chains" role="region" aria-label={label}>
      <div className="twc-chains-inner">
        <p className="twc-chains-label">{label}</p>
        <div className="twc-chains-viewport">
          <ul className="twc-chains-track">
            {loop.map((chain, index) => (
              <li
                key={`${chain.id}-${index}`}
                className="twc-chain"
                title={chain.name}
                aria-hidden={index >= COMPATIBLE_CHAINS.length}
              >
                <span className="twc-chain-icon">
                  <chain.Icon />
                </span>
                <span className="twc-chain-name">{chain.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
