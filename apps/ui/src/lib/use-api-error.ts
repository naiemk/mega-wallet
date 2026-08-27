import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { translateApiError } from "./api-error";
import { isUnauthorizedError, loginPath, rememberReturnTo } from "./auth-redirect";

/** Translate API errors; redirect to login on 401 instead of showing an error. */
export function useApiErrorHandler() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return function handleApiError(error: unknown, setError?: (msg: string) => void): boolean {
    if (isUnauthorizedError(error)) {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      rememberReturnTo(returnTo);
      navigate(loginPath(returnTo), { replace: true });
      return true;
    }
    if (setError) setError(translateApiError(error, t));
    return false;
  };
}
