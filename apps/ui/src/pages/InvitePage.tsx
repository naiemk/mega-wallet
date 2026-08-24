import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

export function InvitePage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const ref = params.get("ref");

  return (
    <div className="card space-y-2 text-center">
      <h2 className="text-lg font-semibold">{t("invite")}</h2>
      {ref ? (
        <p className="text-sm text-slate-300">
          Welcome! Referral code <strong>{ref}</strong> will be applied when you sign up.
        </p>
      ) : (
        <p className="text-sm text-slate-400">Share your link from Account to earn bonuses.</p>
      )}
    </div>
  );
}
