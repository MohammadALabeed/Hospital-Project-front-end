import React, { useState, useEffect } from "react"; //لإنشاء "حالة" (State)، وهي عبارة عن ذاكرة مؤقتة خاصة بالصفحة
import { useTranslation } from "react-i18next";
import Login from "./components/Login";
import Layout from "./components/Layout";
import Overview from "./components/Overview";
import Patients from "./components/Patients";
import Appointments from "./components/Appointments";
import MedicalRecords from "./components/MedicalRecords";
import { UserSession } from "./types.js";
import { apiClient } from "./api.js";

export default function App() {
  const { t, i18n } = useTranslation();

  const isRtl = i18n.language === "ar";

  const [session, setSession] = useState<UserSession | null>(null); //يخزن بيانات المستخدم الحالي بعد تسجيل الدخول

  const [checkingSession, setCheckingSession] = useState(true); //وظيفته عرض شاشة "جارٍ التحميل" أثناء فحص السيرفر للتأكد من وجود جلسة قديمة أم لا

  const [currentTab, setCurrentTab] = useState("dashboard"); //يحدد الصفحة النشطة حالياً داخل لوحة التحكم، وافتراضياً يبدأ بصفحة لوحة التحكم

  const [searchTerm, setSearchTerm] = useState(""); //نص البحث الذي يكتبه المستخدم للبحث عن مريض أو موعد

  // الفحص التلقائي لجلسة الدخول (Auto-login)
  const checkActiveSession = async () => {
    setCheckingSession(true);
    try {
      const response = await apiClient.get("/auth/me");
      if (response.data && response.data.authenticated) {
        setSession(response.data.user);
      }
    } catch (error) {
      console.log(
        "No active session found. Redirection to authentication portal required.",
      );
    } finally {
      setCheckingSession(false);
    }
  };

  useEffect(() => {
    checkActiveSession();
  }, []);

  //  معالجة نجاح تسجيل الدخول وتحديث حالة الجلسة نقله ل لوحة التحكم
  const handleLoginSuccess = (user: UserSession) => {
    setSession(user);
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
      setCurrentTab("dashboard");
      setSearchTerm("");
    }
  };

  // عرض شاشة "جارٍ التحميل" أثناء فحص السيرفر للتأكد من وجود جلسة قديمة أم لا
  if (checkingSession) {
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
