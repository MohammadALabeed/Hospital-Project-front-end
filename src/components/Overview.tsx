import React, { useEffect, useState } from "react";
import {
  Users,
  Activity,
  HeartPulse,
  ArrowRight,
  ChevronRight,
  Loader2,
} from "lucide-react";

import { useTranslation } from "react-i18next";
import { apiClient } from "../api.js";

// استيراد تيبات التحقق من البيانات الخاصة بالجلسة
import { UserSession } from "../types.js";

// تحديد أنواع البيانات المستلمة كـ Props للمكون
interface OverviewProps {
  user: UserSession;
  onNavigate: (tab: string) => void;
}

interface DashboardStats {
  totalPatients: number;
  totalEmployees: number;
  totalDoctors: number;
}

const getStatCount = (value: unknown): number => {
  const count = typeof value === "number" ? value : Number(value);
  return Number.isFinite(count) && count >= 0 ? count : 0;
};

// تفعيل دالة الترجمة ومعرفة اللغة الحالية للنظام
export default function Overview({ user, onNavigate }: OverviewProps) {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    totalEmployees: 0,
    totalDoctors: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      try {
        const response = await apiClient.get("/dashboard/stats");
        if (isMounted) {
          const data = response.data as Record<string, unknown> | null;
          setStats({
            totalPatients: getStatCount(data?.totalPatients),
            totalEmployees: getStatCount(data?.totalEmployees),
            totalDoctors: getStatCount(data?.totalDoctors),
          });
        }
      } catch (error) {
        console.error("Failed to retrieve dashboard statistics:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void fetchStats();
    return () => {
      isMounted = false;
    };
  }, []);

  /* 1. منطق تخصيص الترحيب بناءً على صلاحية المستخدم (Role ID) */
  const getPersonalGreeting = () => {
    switch (user.roleId) {
      case 1:
        return t("overview.greetings.admin"); // مدير
      case 2:
        return t("overview.greetings.clinical"); // طبيب/طاقم طبي
      default:
        return t("overview.greetings.default"); // موظف عام
    }
  };

  // فحص ما إذا كانت اللغة الحالية هي العربية لتعديل اتجاه الواجهة
  const isRtl = i18n.language.startsWith("ar");

  const renderStatCount = (count: number) =>
    loading ? (
      <span
        className="inline-flex items-center gap-2 text-primary"
        role="status"
        aria-label={t("overview.stats.loading")}
      >
        <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
        <span className="sr-only">{t("overview.stats.loading")}</span>
      </span>
    ) : (
      count
    );

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
            {t("overview.badge")}
          </span>
          <h2 dir="auto" className="text-3xl font-bold tracking-tight text-white">
            {t("overview.welcome", { name: user.fullName })}
          </h2>
          <p className="text-sm text-sky-100/80 leading-relaxed">
            {getPersonalGreeting()} —{" "}
            {t("overview.subtitle")}
          </p>

          {/* أزرار التنقل السريع باستخدام الدالة الممررة onNavigate */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate("patients")}
              className="bg-white text-primary px-5 py-2.5 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer shadow-md shadow-black/10 flex items-center gap-1.5"
            >
              <span>
                {t("overview.buttons.viewPatients")}
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
                {t("overview.buttons.manageApts")}
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
              {t("overview.stats.patientsTitle")}
            </p>
            <h4 className="text-4xl font-extrabold mt-3 text-on-surface">
              {renderStatCount(stats.totalPatients)}
            </h4>
            <p className="text-base text-slate-500 mt-3 leading-relaxed">
              {t("overview.stats.patientsSubtitle")}
            </p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-4xl border border-outline-variant shadow-lg flex items-start gap-5">
          <div className="p-4.5 bg-amber-50 text-amber-600 rounded-3xl shrink-0">
            <Activity className="w-8 h-8" />
          </div>
          <div>
            <p className="text-slate-400 text-[12px] font-semibold uppercase tracking-[0.24em] leading-none">
              {t("overview.stats.employeesTitle")}
            </p>
            <h4 className="text-4xl font-extrabold mt-3 text-on-surface">
              {renderStatCount(stats.totalEmployees)}
            </h4>
            <p className="text-base text-slate-500 mt-3 leading-relaxed">
              {t("overview.stats.employeesSubtitle")}
            </p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-4xl border border-outline-variant shadow-lg flex items-start gap-5">
          <div className="p-4.5 bg-emerald-50 text-emerald-600 rounded-3xl shrink-0">
            <HeartPulse className="w-8 h-8" />
          </div>
          <div>
            <p className="text-slate-400 text-[12px] font-semibold uppercase tracking-[0.24em] leading-none">
              {t("overview.stats.doctorsTitle")}
            </p>
            <h4 className="text-4xl font-extrabold mt-3 text-on-surface">
              {renderStatCount(stats.totalDoctors)}
            </h4>
            <p className="text-base text-slate-500 mt-3 leading-relaxed">
              {t("overview.stats.doctorsSubtitle")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
