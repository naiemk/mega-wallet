import type { SavedPasskey } from "../../lib/auth-storage";
import { Icon } from "../Icon";

function initialsFor(passkey: SavedPasskey): string {
  const fromName = passkey.name
    ?.split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
  if (fromName) return fromName.toUpperCase();
  const label = passkey.identityLabel;
  if (label.includes("@")) return label.slice(0, 2).toUpperCase();
  return label.slice(-2).toUpperCase();
}

export function SavedPasskeyList({
  passkeys,
  busy,
  onSelect,
  title,
}: {
  passkeys: SavedPasskey[];
  busy?: boolean;
  onSelect: (passkey: SavedPasskey) => void;
  title: string;
}) {
  if (passkeys.length === 0) return null;

  return (
    <section className="flex flex-col gap-sm">
      <h2 className="font-label-md text-label-md text-outline uppercase tracking-wider m-0 ps-xs">
        {title}
      </h2>
      <ul className="flex flex-col gap-sm m-0 p-0 list-none">
        {passkeys.map((passkey) => (
          <li key={passkey.credentialId ?? passkey.identityLabel}>
            <button
              type="button"
              disabled={busy}
              onClick={() => onSelect(passkey)}
              className="w-full flex items-center gap-md p-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-[0_2px_8px_rgba(11,28,48,0.06)] hover:bg-surface-container-low active:scale-[0.99] transition-all text-start disabled:opacity-50"
            >
              <div className="w-11 h-11 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-label-md shrink-0">
                {initialsFor(passkey)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-body-lg text-body-lg text-on-background m-0 truncate">
                  {passkey.name}
                </p>
                <p className="font-label-md text-label-md text-outline m-0 truncate">
                  {passkey.identityLabel}
                </p>
              </div>
              <Icon name="fingerprint" className="text-primary shrink-0" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
