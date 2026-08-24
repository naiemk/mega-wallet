import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      appName: "Mega Wallet",
      exchange: "Exchange",
      wallet: "Wallet",
      history: "History",
      account: "Account",
      operator: "Operator",
      invite: "Invite friends",
      send: "Send money",
      youSend: "You send",
      theyGet: "They get",
      getQuote: "Get quote",
      startTransfer: "Start transfer",
      balance: "Balance",
      deposit: "Deposit",
      withdraw: "Withdraw",
      steps: {
        deposit: "Funds deposited",
        recipient: "Recipient set",
        withdraw: "Withdrawal",
      },
      login: "Sign in",
      signup: "Create account",
      email: "Email",
      password: "Password",
      name: "Name",
      affiliateEarned: "Bonus earned",
      affiliateLink: "Your invite link",
    },
  },
  fa: {
    translation: {
      appName: "مگا ولت",
      exchange: "انتقال",
      wallet: "کیف پول",
      history: "تاریخچه",
      account: "حساب",
      operator: "اپراتور",
      invite: "دعوت دوستان",
      send: "ارسال پول",
      youSend: "شما می‌فرستید",
      theyGet: "دریافت می‌کنند",
      getQuote: "دریافت نرخ",
      startTransfer: "شروع انتقال",
      balance: "موجودی",
      deposit: "واریز",
      withdraw: "برداشت",
      steps: {
        deposit: "واریز وجه",
        recipient: "تعیین گیرنده",
        withdraw: "برداشت",
      },
      login: "ورود",
      signup: "ثبت‌نام",
      email: "ایمیل",
      password: "رمز",
      name: "نام",
      affiliateEarned: "پاداش جمع‌شده",
      affiliateLink: "لینک دعوت",
    },
  },
  ar: {
    translation: {
      appName: "ميغا وولت",
      exchange: "تحويل",
      wallet: "المحفظة",
      history: "السجل",
      account: "الحساب",
      operator: "المشغّل",
      invite: "ادعُ أصدقاء",
      send: "إرسال الأموال",
      youSend: "ترسل",
      theyGet: "يستلم",
      getQuote: "احصل على السعر",
      startTransfer: "ابدأ التحويل",
      balance: "الرصيد",
      deposit: "إيداع",
      withdraw: "سحب",
      steps: {
        deposit: "تم الإيداع",
        recipient: "تعيين المستلم",
        withdraw: "السحب",
      },
      login: "تسجيل الدخول",
      signup: "إنشاء حساب",
      email: "البريد",
      password: "كلمة المرور",
      name: "الاسم",
      affiliateEarned: "المكافآت",
      affiliateLink: "رابط الدعوة",
    },
  },
};

const saved = typeof localStorage !== "undefined" ? localStorage.getItem("mw-lang") : null;

void i18n.use(initReactI18next).init({
  resources,
  lng: saved ?? "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

if (typeof document !== "undefined") {
  const lang = saved ?? "en";
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "fa" || lang === "ar" ? "rtl" : "ltr";
}

export default i18n;
