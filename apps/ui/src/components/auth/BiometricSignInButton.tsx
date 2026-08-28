import { Icon } from "../Icon";
import { PrimaryButton } from "../PrimaryButton";

export function BiometricSignInButton({
  busy,
  onClick,
  label,
}: {
  busy?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <PrimaryButton disabled={busy} onClick={onClick}>
      <Icon name="fingerprint" />
      {busy ? "…" : label}
    </PrimaryButton>
  );
}
