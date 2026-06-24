import React, { useState } from "react";
import {
  BriefcaseMedical,
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  User,
  Terminal,
  Globe,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../api.js";
import { UserSession } from "../types.js";
import { button } from "motion/react-client";

//تحديد نوع البيانات المستقبلة
interface LoginProps {
  onLoginSuccess: (session: UserSession) => void;
}
//بيانات الحقول
export default function Login({ onLoginSuccess }: LoginProps) {
  const { t, i18n } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  //حالة التحميل و الرسائل الخطأ
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  //معالجة إرسال النموذج
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); //منع إعادة تحميل الصفحة
    if (!username || !password) {
      setErrorMsg(t("login.error", "Invalid username or password."));
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await apiClient.post("/auth/login", {
        username,
        password,
      });
      if (response.data && response.data.success) {
        onLoginSuccess(response.data.user);
      } else {
        setErrorMsg(t("login.error", "Invalid username or password."));
      }
      //لمعرفة سبب الخطأوعرض رسالة الخطأ المناسبة للمستخدم
    } catch (error: any) {
      console.error("Login request failed:", error);
      if (error.response && error.response.data && error.response.data.error) {
        setErrorMsg(error.response.data.error);
      } else {
        setErrorMsg(
          t("login.error", "Authentication failed. Please try again."),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  //تبديل اللغة بين العربية والإنجليزية
  const toggleLanguage = () => {
    const nextLang = i18n.language === "ar" ? "en" : "ar";
    i18n.changeLanguage(nextLang);
  };
  const isRtl = i18n.language === "ar";

  return (
    <div
      className={`relative min-h-screen w-full bg-surface text-on-surface select-none flex flex-col items-center justify-center p-4 ${isRtl ? "text-right" : "text-left"}`}
    >
      <div className={`absolute top-6 ${isRtl ? "left-6" : "right-6"} z-50`}>
        <button
          type="button"
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-4 py-2 border border-outline-variant bg-white text-secondary rounded-lg text-xs font-bold hover:bg-slate-50 transition-all focus:outline-none cursor-pointer shadow-sm"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>
            {isRtl
              ? t("common.language.english", "English")
              : t("common.language.arabic", "العربية")}
          </span>
        </button>
        <div className="absolute bottom-[10%] right-[10%] w-[35%] h-[35%] rounded-full bg-primary-container/10 blur-[130px]" />
      </div>

      {/* صندوق تسجيل الدخول */}
      <div className="relative z-10 w-full max-w-115 flex flex-col items-center">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-white mb-4 shadow-xl shadow-primary/25 cursor-pointer hover:scale-105 transition-transform duration-300">
            <BriefcaseMedical className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-primary tracking-tight font-sans">
            MedCenter Pro
          </h1>
          <p className="text-xs text-secondary mt-1 uppercase tracking-widest font-semibold">
            {t("patients.analytics.title", "Operational Hospital Analytics")}
          </p>
        </div>

        {/*الحاوية الخارجية لبطاقة تسجيل الدخول*/}
        <div className="w-full bg-white border border-outline-variant rounded-2xl shadow-xl shadow-black/4 overflow-hidden transition-all duration-300 hover:shadow-2xl">
          {/*شريط الحالة العلوي */}
          <div
            className={`bg-primary/5 px-6 py-3.5 border-b border-outline-variant flex items-center justify-between ${isRtl ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`flex items-center gap-2 ${isRtl ? "flex-row-reverse" : ""}`}
            >
              <Lock className="text-primary w-4 h-4" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider font-sans">
                {t("login.title", "Unified Medical Portal")}
              </span>
            </div>

            {/*مؤشر الاتصال الحي*/}
            <div
              className={`flex items-center gap-2 ${isRtl ? "flex-row-reverse" : ""}`}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-secondary uppercase tracking-widest">
                {t("patients.status.stable", "Stable")}
              </span>
            </div>
          </div>
          {/*العناصر النصية الترحيبية داخل البطاقة*/}
          <div className="p-8 md:p-10">
            <header className="mb-6">
              <h2 className="text-2xl font-bold text-on-surface tracking-tight">
                {t("login.title", "Unified Medical Portal")}
              </h2>
              <p className="text-sm text-secondary mt-1.5 leading-relaxed">
                {t(
                  "login.subtitle",
                  "Log in to access secure hospital database and manage patient registries.",
                )}
              </p>
            </header>

            {/*صندوق التنبيه بالأخطاء الديناميكي*/}
            {errorMsg && (
              <div
                className={`mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex gap-3 text-sm text-red-600 select-text ${isRtl ? "flex-row-reverse" : ""}`}
              >
                <ShieldCheck className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <span className="font-semibold leading-snug">{errorMsg}</span>
              </div>
            )}

            {/* نموذج إرسال البيانات والاتصال بالدالة المسؤولية عن تسجيل الدخول */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* حقل إدخال اسم المستخدم أو البريد الإلكتروني */}
              <div className="space-y-1.5">
                <label
                  className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant block"
                  htmlFor="username"
                >
                  {t("login.emailLabel", "Professional Email Address")}
                </label>
                <div className="relative group">
                  {/* أيقونة المستخدم الجانبية داخل الحقل وتغير موضعها حسب اللغة */}
                  <div
                    className={`absolute inset-y-0 ${isRtl ? "right-0 pr-3.5" : "left-0 pl-3.5"} flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors`}
                  >
                    <User className="w-4 h-4" />
                  </div>

                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t(
                      "login.emailLabel",
                      "Professional Email Address",
                    )}
                    className={`block w-full ${isRtl ? "pr-10 pl-3.5 text-right" : "pl-10 pr-3.5 text-left"} py-3 bg-white border border-outline-variant rounded-lg font-sans text-sm text-on-surface placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-inner`}
                  />
                </div>
              </div>

              {/* حقل إدخال كلمة المرور مع خيار الاستعادة */}
              <div className="space-y-1.5">
                <div
                  className={`flex justify-between items-center ${isRtl ? "flex-row-reverse" : ""}`}
                >
                  <label
                    className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant block"
                    htmlFor="password"
                  >
                    {t("login.passwordLabel", "Password")}
                  </label>

                  {/* زر نسيت كلمة المرور الرابط بالدعم الفني */}
                  <button
                    type="button"
                    onClick={() =>
                      alert(
                        t(
                          "login.alerts.passwordReset",
                          "Please contact IT support to reset your password.",
                        ),
                      )
                    }
                    className="text-xs font-semibold text-primary hover:underline transition-all"
                  >
                    {t("login.forgotPassword", "Forgot Password?")}
                  </button>
                </div>
                <div className="relative group">
                  {/* أيقونة القفل الجانبية داخل حقل كلمة المرور */}
                  <div
                    className={`absolute inset-y-0 ${isRtl ? "right-0 pr-3.5" : "left-0 pl-3.5"} flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors`}
                  >
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`block w-full ${isRtl ? "pr-10 pl-12 text-right" : "pl-10 pr-12 text-left"} py-3 bg-white border border-outline-variant rounded-lg font-sans text-sm text-on-surface placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-inner`}
                  />

                  {/* زر العين التفاعلي لإظهار أو إخفاء حروف كلمة المرور */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute inset-y-0 ${isRtl ? "left-0 pl-3.5" : "right-0 pr-3.5"} flex items-center text-slate-400 hover:text-primary transition-colors focus:outline-none`}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* خيار تذكر الحساب ومحطة العمل */}
              <div
                className={`flex items-center ${isRtl ? "flex-row-reverse" : ""}`}
              >
                <input
                  id="remember_me"
                  name="remember_me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary"
                />
                <label
                  htmlFor="remember_me"
                  className={`${isRtl ? "mr-2.5 ml-0" : "ml-2.5 mr-0"} text-xs text-secondary cursor-pointer font-semibold leading-none`}
                >
                  {t("login.rememberWorkstation", "Remember this workstation")}
                </label>
              </div>

              {/* زر إرسال النموذج (يتغير مظهره ديناميكياً أثناء حالة التحميل وإرسال الطلب للـ API) */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full bg-primary text-white py-3.5 rounded-lg font-semibold text-sm hover:bg-primary/90 transition-all active:scale-[0.99] shadow-lg shadow-primary/10 flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50 ${isRtl ? "flex-row-reverse" : ""}`}
              >
                {loading ? (
                  <>
                    {/* مؤشر الدوران الأوتوماتيكي عند انتظار استجابة الخادم */}
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>
                      {t("login.status.authenticating", "Authenticating...")}
                    </span>
                  </>
                ) : (
                  <>
                    {/* المظهر الطبيعي للزر في حالة الاستقرار */}
                    <span>{t("login.button", "Secure Sign In")}</span>
                    <ArrowRight
                      className={`w-4 h-4 group-hover:translate-x-1 transition-transform ${isRtl ? "rotate-180 group-hover:-translate-x-1" : ""}`}
                    />
                  </>
                )}
              </button>
            </form>
            {/* قسم المساعدة والدعم التقني المؤسسي في أسفل بطاقة تسجيل الدخول */}
            <div
              className={`mt-8 pt-5 border-t border-outline-variant flex items-center justify-between gap-4 text-xs ${isRtl ? "flex-row-reverse" : ""}`}
            >
              <span className="text-secondary font-semibold font-sans">
                {t("login.help.needAssistance", "Need assistance?")}
              </span>
              {/* زر تذكرة الدعم الفني (يظهر تنبيه مؤقت حالياً عند النقر) */}
              <button
                type="button"
                onClick={() =>
                  alert(
                    t(
                      "login.alerts.supportOffline",
                      "Support ticket gateway is currently offline.",
                    ),
                  )
                }
                className="px-3 py-1.5 border border-outline-variant text-secondary font-bold rounded-lg hover:border-primary hover:text-primary transition-all cursor-pointer"
              >
                {t("login.help.contactSupport", "Contact IT Support")}
              </button>
            </div>
          </div>
        </div>

        {/* تذييل الصفحة الخارجي (Footer) لتوثيق أمان وإصدار النظام */}
        <footer className="mt-8 text-center select-text">
          {/* نص توضيحي لحالة الاتصال بنظام المعلومات الطبي الرئيسي */}
          <p className="text-[11px] leading-relaxed text-secondary opacity-75 font-semibold">
            {t(
              "app.session.verifying",
              "Connecting to medical information system hub...",
            )}
          </p>

          {/* أوسمة وشارات الأمان والنسخة المستقرة للموقع */}
          <div
            className={`mt-3 flex justify-center gap-4 text-[11px] text-secondary opacity-75 ${isRtl ? "flex-row-reverse" : ""}`}
          >
            {/* شارة التشفير والأمان SSL */}
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              {t("login.footer.sslBadge", "Secure 256-Bit SSL")}
            </span>

            {/* شارة رقم إصدار النظام الحالي المستقر */}
            <span className="flex items-center gap-1">
              <Terminal className="w-3.5 h-3.5 text-primary" />
              v4.8.2-stable
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
