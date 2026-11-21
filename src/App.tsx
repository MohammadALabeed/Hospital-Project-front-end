import React, { useState, useEffect } from "react";
import { isAxiosError } from "axios";
import { useTranslation } from "react-i18next";
import Login from "./components/Login";
import Layout from "./components/Layout";
import Overview from "./components/Overview";
import Patients from "./components/Patients";
import Appointments from "./components/Appointments";
import MedicalRecords from "./components/MedicalRecords";
import { UserSession } from "./types.js";
import { apiClient } from "./api.js";

const SESSION_STORAGE_KEY = "app_user_session";

const isUserSession = (value: unknown): value is UserSession => {
  if (!value || typeof value !== "object") return false;
  const session = value as Record<string, unknown>;
  return (
    typeof session.username === "string" &&
    typeof session.fullName === "string" &&
    typeof session.roleId === "number" &&
    ["Admin", "Doctor", "Employee", "Patient"].includes(String(session.roleName))
  );
};

const readStoredSession = (): UserSession | null => {
  try {
    const storedSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!storedSession) return null;
    const parsedSession: unknown = JSON.parse(storedSession);
    return isUserSession(parsedSession) ? parsedSession : null;
  } catch (error) {
    console.error("Failed to restore the saved user session:", error);
    return null;
  }
};

const persistSession = (session: UserSession) => {
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.error("Failed to save the user session:", error);
  }
};

const clearStoredSession = () => {
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear the saved user session:", error);
  }
};

const normalizeSession = (value: unknown): UserSession | null => {
  if (!value || typeof value !== "object") return null;
  const user = value as Record<string, unknown>;
  if (isUserSession(user)) return user;

  const username = user.Username ?? user.username;
  const roleId = user.RoleID ?? user.roleId;
  if (typeof username !== "string" || typeof roleId !== "number") return null;

  const roleNames: Record<number, UserSession["roleName"]> = {
    1: "Admin",
    2: "Doctor",
    3: "Employee",
    4: "Patient",
  };
  const roleName = roleNames[roleId];
  if (!roleName) return null;

  return {
    username,
    fullName:
      typeof user.fullName === "string"
        ? user.fullName
        : typeof user.FullName === "string"
          ? user.FullName
          : username,
    roleId: roleId as UserSession["roleId"],
    roleName,
  };
};

export default function App() {
  const { t, i18n } = useTranslation();

  const isRtl = i18n.language === "ar";

  const [session, setSession] = useState<UserSession | null>(() => readStoredSession());
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authCheckError, setAuthCheckError] = useState<string | null>(null);

  const [currentTab, setCurrentTab] = useState("dashboard"); //يحدد الصفحة النشطة حالياً داخل لوحة التحكم، وافتراضياً يبدأ بصفحة لوحة التحكم

  const [searchTerm, setSearchTerm] = useState(""); //نص البحث الذي يكتبه المستخدم للبحث عن مريض أو موعد

  // الفحص التلقائي لجلسة الدخول (Auto-login)
  const checkActiveSession = async () => {
    setCheckingAuth(true);
    setAuthCheckError(null);
    try {
      const response = await apiClient.get("/auth/me");
      const userSession = normalizeSession(response.data?.user ?? response.data?.data?.user);
      const activeSession = userSession ?? readStoredSession();
      if (response.status === 200 && response.data?.authenticated !== false && activeSession) {
        setSession(activeSession);
        persistSession(activeSession);
      } else {
        setAuthCheckError(t("app.session.verificationFailed"));
      }
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) {
        setSession(null);
        clearStoredSession();
      } else {
        console.error("Failed to verify the active session:", error);
        if (!readStoredSession()) {
          setAuthCheckError(t("app.session.connectionFailed"));
        }
      }
    } finally {
      setCheckingAuth(false);
    }
  };

  useEffect(() => {
    checkActiveSession();
  }, []);

  //  معالجة نجاح تسجيل الدخول وتحديث حالة الجلسة نقله ل لوحة التحكم
  const handleLoginSuccess = (user: UserSession) => {
    setSession(user);
    persistSession(user);
    setAuthCheckError(null);
    setCurrentTab("dashboard");
  };

  //   تسجيل الخروج وإنهاء الجلسة الحالية عن طريق ارسال طلب للباك اند يعود الموقع لصفحة تسجيل الدخول
  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch (error) {
      console.error("Error occurred during logout process:", error);
    } finally {
      setSession(null);
      clearStoredSession();
      setCurrentTab("dashboard");
      setSearchTerm("");
    }
  };

  // عرض شاشة "جارٍ التحميل" أثناء فحص السيرفر للتأكد من وجود جلسة قديمة أم لا
  if (checkingAuth) {
    return (
      <div
        className={`min-h-screen w-full bg-[#f8f9fb] flex flex-col items-center justify-center font-sans ${isRtl ? "text-right" : "text-left"}`}
        dir={isRtl ? "rtl" : "ltr"}
      >
        <svg
          className="animate-spin h-8 w-8 text-primary mb-3"
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
        <p className="text-sm font-semibold text-secondary">
          {t("app.session.restoring")}
        </p>
      </div>
    );
  }

  if (!session && authCheckError) {
    return (
      <div
        dir={i18n.language === "ar" ? "rtl" : "ltr"}
        className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-[#f8f9fb] p-6 text-center"
      >
        <p role="alert" className="text-sm font-semibold text-secondary">
          {authCheckError}
        </p>
        <button
          type="button"
          onClick={() => void checkActiveSession()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white"
        >
          {t("app.session.retry")}
        </button>
      </div>
    );
  }

  // عرض صفحة تسجيل الدخول
  if (!session) {
    //إذا لم يكن هناك جلسة مستخدم نشطة، يتم عرض صفحة تسجيل الدخول
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // بعد تسجيل الدخول عرض لوحة التحكم والتنقل بين الصفحات بناء على المتغير currentTab
  return (
    <Layout
      currentTab={currentTab}
      onTabChange={setCurrentTab} //إخبار القائمة الجانبية بالزر النشط حالياً، وتغييره عند الضغط على زر آخر
      user={session} //لعرض اسم الطبيب أو المدير وصورته وصلاحياته في أعلى الشاشة
      onLogout={handleLogout} //تشغيل دالة الخروج ومسح الكوكيز عند الضغط على "Logout"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm} //تحديث نص البحث في حالة وجوده في الصفحة الحالية
    >
      {currentTab === "dashboard" && (
        <Overview user={session} onNavigate={setCurrentTab} />
      )}

      {currentTab === "patients" && <Patients searchTerm={searchTerm} />}
      {currentTab === "appointments" && <Appointments />}
      {currentTab === "medical-records" && <MedicalRecords />}
    </Layout>
  );
}
