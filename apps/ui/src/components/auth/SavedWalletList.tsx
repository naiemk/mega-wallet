import type { SavedWallet } from "../../lib/auth-storage";
import { Icon } from "../Icon";

function initialsFor(wallet: SavedWallet): string {
  const fromName = wallet.name
    ?.split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
  if (fromName) return fromName.toUpperCase();
  return wallet.email.slice(0, 2).toUpperCase();
}

export function SavedWalletList({
  wallets,
  busy,
  onSelect,
  title,
}: {
  wallets: SavedWallet[];
  busy?: boolean;
  onSelect: (wallet: SavedWallet) => void;
  title: string;
}) {
  if (wallets.length === 0) return null;

  return (
    <section className="flex flex-col gap-sm">
      <h2 className="font-label-md text-label-md text-outline uppercase tracking-wider m-0 ps-xs">
        {title}
      </h2>
      <ul className="flex flex-col gap-sm m-0 p-0 list-none">
        {wallets.map((wallet) => (
          <li key={wallet.email}>
            <button
              type="button"
              disabled={busy}
              onClick={() => onSelect(wallet)}
              className="w-full flex items-center gap-md p-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-[0_2px_8px_rgba(11,28,48,0.06)] hover:bg-surface-container-low active:scale-[0.99] transition-all text-start disabled:opacity-50"
            >
              <div className="w-11 h-11 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-label-md shrink-0">
                {initialsFor(wallet)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-body-lg text-body-lg text-on-background m-0 truncate">
                  {wallet.name || wallet.email}
                </p>
                {wallet.name && (
                  <p className="font-label-md text-label-md text-outline m-0 truncate">
                    {wallet.email}
                  </p>
                )}
              </div>
              <Icon name="fingerprint" className="text-primary shrink-0" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
