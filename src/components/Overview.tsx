import React from "react";
import {
  Users,
  Activity,
  HeartPulse,
  ArrowRight,
  ChevronRight,
} from "lucide-react";

import { useTranslation } from "react-i18next";

// استيراد تيبات التحقق من البيانات الخاصة بالجلسة
import { UserSession } from "../types.js";

// تحديد أنواع البيانات المستلمة كـ Props للمكون
interface OverviewProps {
  user: UserSession;
  onNavigate: (tab: string) => void;
}

// تفعيل دالة الترجمة ومعرفة اللغة الحالية للنظام
export default function Overview({ user, onNavigate }: OverviewProps) {
const { t, i18n } = useTranslation();

  /* 1. منطق تخصيص الترحيب بناءً على صلاحية المستخدم (Role ID) */
  const getPersonalGreeting = () => {
    switch (user.roleId) {
      case 1:
        return t("overview.greetings.admin", "Hospital Management Console"); // مدير
      case 2:
        return t("overview.greetings.clinical", "Clinical Registry Active"); // طبيب/طاقم طبي
      default:
        return t("overview.greetings.default", "Authorized Personnel Session"); // موظف عام
    }
  };

  // فحص ما إذا كانت اللغة الحالية هي العربية لتعديل اتجاه الواجهة
  const isRtl = i18n.language === "ar";

  return (
    // تحديد اتجاه اللوحة (RTL للعربي و LTR للإنجليزي) مع تأثير حركي عند الدخول
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="space-y-8 animate-in fade-in duration-300"
    >
      {/* 2. قسم البانر الرئيسي: الترحيب بالمستخدم وأزرار التنقل السريع */}
      
      <div className="bg-linear-to-r from-primary to-primary-container text-white p-8 rounded-2xl shadow-xl relative overflow-hidden flex justify-between items-center">
        <div className="relative z-10 max-w-xl space-y-3">
          <span className="text-[10px] bg-white/20 text-white border border-white/30 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
            {t("overview.badge", "System Dashboard")}
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-white">
            {t("overview.welcome", { name: user.fullName })}
          </h2>
          <p className="text-sm text-sky-100/80 leading-relaxed">
            {getPersonalGreeting()} —{" "}
            {t(
              "overview.subtitle",
              "Welcome back. Access database registries and active outpatient schedules.",
            )}
          </p>

          {/* أزرار التنقل السريع باستخدام الدالة الممررة onNavigate */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate("patients")}
              className="bg-white text-primary px-5 py-2.5 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer shadow-md shadow-black/10 flex items-center gap-1.5"
            >
              <span>
                {t("overview.buttons.viewPatients", "Patient Registry")}
              </span>
              <ArrowRight
                className={`w-4 h-4 text-primary ${isRtl ? "rotate-180" : ""}`}
              />
            </button>
            <button
              onClick={() => onNavigate("appointments")}
              className="bg-white/10 border border-white/20 text-white px-5 py-2.5 rounded-lg text-xs font-bold hover:bg-white/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>
                {t("overview.buttons.manageApts", "Appointments Schedule")}
              </span>
              <ChevronRight
                className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* خلفية جمالية (أيقونة نبض متحركة تظهر في الشاشات الكبيرة فقط) */}
        <div
          className={`absolute bottom-0 top-0 w-1/3 opacity-15 hidden md:flex items-center justify-center ${isRtl ? "left-0" : "right-0"}`}
        >
          <HeartPulse className="w-48 h-48 text-white stroke-1" />
        </div>
      </div>

      {/* 3. قسم بطاقات الإحصائيات  */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-4xl border border-outline-variant shadow-lg flex items-start gap-5">
          <div className="p-4.5 bg-sky-50 text-sky-600 rounded-3xl shrink-0">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <p className="text-slate-400 text-[12px] font-semibold uppercase tracking-[0.24em] leading-none">
              {t("overview.stats.patientsTitle", "Total Patients")}
            </p>
            <h4 className="text-4xl font-extrabold mt-3 text-on-surface">
              250
            </h4>
            <p className="text-base text-slate-500 mt-3 leading-relaxed">
              {t(
                "overview.stats.patientsSubtitle",
                "Total registered patients in the hospital",
              )}
            </p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-4xl border border-outline-variant shadow-lg flex items-start gap-5">
          <div className="p-4.5 bg-amber-50 text-amber-600 rounded-3xl shrink-0">
            <Activity className="w-8 h-8" />
          </div>
          <div>
            <p className="text-slate-400 text-[12px] font-semibold uppercase tracking-[0.24em] leading-none">
              {t("overview.stats.nursesTitle", "Total Nurses")}
            </p>
            <h4 className="text-4xl font-extrabold mt-3 text-on-surface">45</h4>
            <p className="text-base text-slate-500 mt-3 leading-relaxed">
              {t(
                "overview.stats.nursesSubtitle",
                "Nursing staff available for duty",
              )}
            </p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-4xl border border-outline-variant shadow-lg flex items-start gap-5">
          <div className="p-4.5 bg-emerald-50 text-emerald-600 rounded-3xl shrink-0">
            <HeartPulse className="w-8 h-8" />
          </div>
          <div>
            <p className="text-slate-400 text-[12px] font-semibold uppercase tracking-[0.24em] leading-none">
              {t("overview.stats.doctorsTitle", "Total Doctors")}
            </p>
            <h4 className="text-4xl font-extrabold mt-3 text-on-surface">30</h4>
            <p className="text-base text-slate-500 mt-3 leading-relaxed">
              {t(
                "overview.stats.doctorsSubtitle",
                "Active medical doctors on staff",
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
