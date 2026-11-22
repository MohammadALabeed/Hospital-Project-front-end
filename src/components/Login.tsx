import React, { useState } from "react";
import {
  BriefcaseMedical,
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  User,
  Globe,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../api.js";
import { RoleID, type RoleName, type UserSession } from "../types.js";

//تحديد نوع البيانات المستقبلة
interface LoginProps {
  onLoginSuccess: (session: UserSession) => void;
}

const roleNameById: Record<RoleID, RoleName> = {
  [RoleID.Admin]: "Admin",
  [RoleID.Doctor]: "Doctor",
  [RoleID.Employee]: "Employee",
  [RoleID.Patient]: "Patient",
};

const roleIdByName: Record<string, RoleID> = {
  admin: RoleID.Admin,
  administrator: RoleID.Admin,
  "system admin": RoleID.Admin,
  doctor: RoleID.Doctor,
  employee: RoleID.Employee,
  patient: RoleID.Patient,
};

const parseRoleId = (value: unknown): RoleID | null => {
  if (typeof value === "number" && value in roleNameById) {
    return value as RoleID;
  }
  if (typeof value !== "string") return null;

  const normalizedValue = value.trim().toLowerCase().replace(/\s+/g, " ");
  if (normalizedValue in roleIdByName) return roleIdByName[normalizedValue];
  const numericValue = Number(normalizedValue);
  return Number.isInteger(numericValue) && numericValue in roleNameById
    ? (numericValue as RoleID)
    : null;
};

const parseUserSession = (value: unknown): UserSession | null => {
  if (!value || typeof value !== "object") return null;
  const user = value as Record<string, unknown>;
  const usernameValue = user.Username ?? user.username;
  if (typeof usernameValue !== "string" || !usernameValue.trim()) return null;

  const roleId =
    parseRoleId(user.RoleID ?? user.RoleId ?? user.roleId) ??
    parseRoleId(user.RoleName ?? user.roleName ?? user.Role ?? user.role);
  if (roleId === null) return null;

  const fullNameValue = user.FullName ?? user.fullName;
  return {
    username: usernameValue,
    fullName:
      typeof fullNameValue === "string" && fullNameValue.trim()
        ? fullNameValue
        : usernameValue,
    roleId,
    roleName: roleNameById[roleId],
  };
};

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
      setErrorMsg("login.error");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      // إرسال البيانات للباك إند بالحروف الكبيرة كما يتوقعها السيرفر
      const response = await apiClient.post("/auth/login", {
        Username: username,
        Password: password,
      });

      // التحقق من استلام بيانات المستخدم من السيرفر
      const sessionData = parseUserSession(response.data?.user);
      if (sessionData) {
        onLoginSuccess(sessionData);
      } else {
        console.error("Login response did not contain a valid user session.");
        setErrorMsg("login.error");
      }
    } catch (error) {
      console.error("Login request failed:", error);
      setErrorMsg("login.error");
    } finally {
      setLoading(false);
    }
  };

  //تبديل اللغة بين العربية والإنجليزية
  const isRtl = i18n.language.startsWith("ar");
  const toggleLanguage = () => {
    i18n.changeLanguage(isRtl ? "en" : "ar");
  };

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
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
              ? t("common.languageEnglish")
              : t("common.languageArabic")}
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
            {t("common.brandName")}
          </h1>
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
                {t("login.title")}
              </span>
            </div>

            {/*مؤشر الاتصال الحي*/}
            <div
              className={`flex items-center gap-2 ${isRtl ? "flex-row-reverse" : ""}`}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-secondary uppercase tracking-widest">
                {t("patients.status.stable")}
              </span>
            </div>
          </div>

          {/*العناصر النصية الترحيبية داخل البطاقة*/}
          <div className="p-8 md:p-10">
            <header className="mb-6">
              <h2 className="text-2xl font-bold text-on-surface tracking-tight">
                {t("login.title")}
              </h2>
            </header>

            {/*صندوق التنبيه بالأخطاء الديناميكي*/}
            {errorMsg && (
              <div
                className={`mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex gap-3 text-sm text-red-600 select-text ${isRtl ? "flex-row-reverse" : ""}`}
              >
                <ShieldCheck className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <span dir="auto" className="font-semibold leading-snug">
                  {t(errorMsg)}
                </span>
              </div>
            )}

            {/* نموذج إرسال البيانات والاتصال بالدالة المسؤولية عن تسجيل الدخول */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* حقل إدخال اسم المستخدم */}
              <div className="space-y-1.5">
                <label
                  className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant block"
                  htmlFor="username"
                >
                  {t("login.usernameLabel")}
                </label>
                <div className="relative group">
                  <div
                    className={`absolute inset-y-0 ${isRtl ? "right-0 pr-3.5" : "left-0 pl-3.5"} flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors`}
                  >
                    <User className="w-4 h-4" />
                  </div>

                  <input
                    id="username"
                    name="username"
                    type="text"
                    dir="auto"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t("login.usernameLabel")}
                    className={`block w-full ${isRtl ? "pr-10 pl-10 text-right" : "pl-10 pr-10 text-left"} py-3 bg-white border border-outline-variant rounded-lg font-sans text-sm text-on-surface placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-inner`}
                  />
                </div>
              </div>

              {/* حقل إدخال كلمة المرور مع خيار الاستعادة */}
              <div className="space-y-1.5">
                <div className={isRtl ? "text-right" : "text-left"}>
                  <label
                    className={`text-xs font-semibold uppercase tracking-wider text-on-surface-variant block ${isRtl ? "text-right" : "text-left"}`}
                    htmlFor="password"
                  >
                    {t("login.passwordLabel")}
                  </label>
                </div>
                <div className="relative group">
                  <div
                    className={`absolute inset-y-0 ${isRtl ? "right-10 pr-3.5" : "left-10 pl-3.5"} flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors`}
                  >
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    dir={isRtl ? "rtl" : "ltr"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`block w-full ${isRtl ? "pr-16 pl-10 text-right" : "pl-16 pr-10 text-left"} py-3 bg-white border border-outline-variant rounded-lg font-sans text-sm text-on-surface placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-inner`}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute inset-y-0 ${isRtl ? "right-0 pr-3.5" : "left-0 pl-3.5"} flex items-center text-slate-400 hover:text-primary transition-colors focus:outline-none`}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div
                className={`flex flex-col sm:flex-row items-center justify-between gap-3 ${isRtl ? "sm:flex-row-reverse" : ""}`}
              >
                <div className="flex items-center">
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
                    {t("login.rememberWorkstation")}
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    alert(
                      t("login.alerts.passwordReset"),
                    )
                  }
                  className="text-xs font-semibold text-primary hover:underline transition-all"
                >
                  {t("login.forgotPassword")}
                </button>
              </div>

              {/* زر إرسال النموذج */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full bg-primary text-white py-3.5 rounded-lg font-semibold text-sm hover:bg-primary/90 transition-all active:scale-[0.99] shadow-lg shadow-primary/10 flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50 ${isRtl ? "flex-row-reverse" : ""}`}
              >
                {loading ? (
                  <>
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
                      {t("login.status.authenticating")}
                    </span>
                  </>
                ) : (
                  <>
                    <span>{t("login.button")}</span>
                    <ArrowRight
                      className={`w-4 h-4 group-hover:translate-x-1 transition-transform ${isRtl ? "rotate-180 group-hover:-translate-x-1" : ""}`}
                    />
                  </>
                )}
              </button>
            </form>

            {/* قسم المساعدة والدعم التقني المؤسسي */}
            <div
              className={`mt-8 pt-5 border-t border-outline-variant flex items-center justify-between gap-4 text-xs ${isRtl ? "flex-row-reverse" : ""}`}
            >
              <span className="text-secondary font-semibold font-sans">
                {t("login.help.needAssistance")}
              </span>
              <button
                type="button"
                onClick={() =>
                  alert(
                    t("login.alerts.supportOffline"),
                  )
                }
                className="px-3 py-1.5 border border-outline-variant text-secondary font-bold rounded-lg hover:border-primary hover:text-primary transition-all cursor-pointer"
              >
                {t("login.help.contactSupport")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}