import React, { useState } from "react";
import {
  Users,
  Activity,
  HeartPulse,
  Clock,
  ShieldCheck,
  ArrowRight,
  TrendingDown,
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

export default function Overview({ user, onNavigate }: OverviewProps) {
  // تفعيل دالة الترجمة ومعرفة اللغة الحالية للنظام
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
    <div dir={isRtl ? "rtl" : "ltr"} className="space-y-8 animate-in fade-in duration-300">
      
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
            {getPersonalGreeting()} — {t("overview.subtitle", "Welcome back. Access database registries and active outpatient schedules.")}
          </p>

          {/* أزرار التنقل السريع باستخدام الدالة الممررة onNavigate */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate("patients")}
              className="bg-white text-primary px-5 py-2.5 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer shadow-md shadow-black/10 flex items-center gap-1.5"
            >
              <span>{t("overview.buttons.viewPatients", "Patient Registry")}</span>
              <ArrowRight className={`w-4 h-4 text-primary ${isRtl ? "rotate-180" : ""}`} />
            </button>
            <button
              onClick={() => onNavigate("appointments")}
              className="bg-white/10 border border-white/20 text-white px-5 py-2.5 rounded-lg text-xs font-bold hover:bg-white/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>{t("overview.buttons.manageApts", "Appointments Schedule")}</span>
              <ChevronRight className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>

        {/* خلفية جمالية (أيقونة نبض متحركة تظهر في الشاشات الكبيرة فقط) */}
        <div className={`absolute bottom-0 top-0 w-1/3 opacity-15 hidden md:flex items-center justify-center ${isRtl ? "left-0" : "right-0"}`}>
          <HeartPulse className="w-48 h-48 text-white stroke-1" />
        </div>
      </div>

      {/* 3. قسم بطاقات الإحصائيات الحية (شبكة بثلاثة أعمدة) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* البطاقة الأولى: نسبة إشغال أسرة العناية المركزة ICU */}
        <div className="bg-white p-6 rounded-2xl border border-outline-variant shadow-sm flex items-start gap-4">
          <div className="p-3.5 bg-rose-50 text-rose-600 rounded-xl shrink-0">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest leading-none">
              {t("overview.stats.icuTitle", "ICU Bed Occupancy")}
            </p>
            <h4 className="text-2xl font-bold mt-2 text-on-surface">
              {t("overview.stats.icuOccupied", "87.5%")}
            </h4>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-rose-600 font-semibold">
              <TrendingDown className="w-4 h-4" />
              <span>{t("overview.stats.icuTrend", "-1.2% in last 24h")}</span>
            </div>
          </div>
        </div>

        {/* البطاقة الثانية: عدد الأطباء المناوبين حالياً في المشفى */}
        <div className="bg-white p-6 rounded-2xl border border-outline-variant shadow-sm flex items-start gap-4">
          <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest leading-none font-sans">
              {t("overview.stats.physiciansTitle", "On-Call Physicians")}
            </p>
            <h4 className="text-2xl font-bold mt-2 text-on-surface">
              {t("overview.stats.physiciansCount", "14 Active")}
            </h4>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              {t("overview.stats.physiciansNote", "Distributed across emergency wards")}
            </p>
          </div>
        </div>

        {/* البطاقة الثالثة: حالة أمان وتشفير قاعدة البيانات الطبية */}
        <div className="bg-white p-6 rounded-2xl border border-outline-variant shadow-sm flex items-start gap-4">
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest leading-none font-sans">
              {t("overview.stats.securityTitle", "Database Protection")}
            </p>
            <h4 className="text-2xl font-bold mt-2 text-on-surface">
              {t("overview.stats.securityStatus", "HIPAA Secured")}
            </h4>
            <p className="text-xs text-emerald-700 font-bold mt-1 bg-emerald-50 inline-block px-2 py-0.5 rounded-md">
              {t("overview.stats.securityBadge", "Encrypted Channel")}
            </p>
          </div>
        </div>
      </div>

      {/* 4. القسم السفلي: ينقسم إلى جدول الاجتماعات ومعلومات الامتثال القانوني */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* الجدول الفرعي الأول: قائمة الإيجازات والاجتماعات القادمة للأقسام */}
        <div className="lg:col-span-7 bg-white p-8 rounded-2xl border border-outline-variant space-y-6">
          <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <span>{t("overview.inspections.title", "Upcoming Facility Briefings & Briefs")}</span>
          </h3>

          <div className="divide-y divide-slate-100 font-sans text-sm">
            {/* اجتماع 1 */}
            <div className="py-4 flex justify-between items-center gap-4">
              <div>
                <p className="font-bold text-on-surface">{t("overview.inspections.item1.title", "Department Staff Briefing")}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t("overview.inspections.item1.location", "Conference Room Annex A")}
                </p>
              </div>
              <span className="text-xs text-slate-500 font-semibold bg-slate-100 py-1 px-2.5 rounded-lg whitespace-nowrap">
                {t("overview.inspections.item1.time", "Today, 14:00")}
              </span>
            </div>

            {/* اجتماع 2 */}
            <div className="py-4 flex justify-between items-center gap-4">
              <div>
                <p className="font-bold text-on-surface">{t("overview.inspections.item2.title", "Internal Clinical Registry Safety Audit")}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t("overview.inspections.item2.note", "Routine security validation batch")}
                </p>
              </div>
              <span className="text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-500/10 py-1 px-2.5 rounded-lg whitespace-nowrap">
                {t("overview.inspections.item2.status", "Pending Review")}
              </span>
            </div>

            {/* اجتماع 3 */}
            <div className="py-4 flex justify-between items-center gap-4">
              <div>
                <p className="font-bold text-on-surface">{t("overview.inspections.item3.title", "Maintenance Verification Window")}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t("overview.inspections.item3.note", "Technician hardware routine inspections")}
                </p>
              </div>
              <span className="text-xs text-slate-500 bg-slate-50 py-1 px-2.5 rounded-lg whitespace-nowrap">
                {t("overview.inspections.item3.time", "Tomorrow, 08:00")}
              </span>
            </div>
          </div>
        </div>

        {/* الجدول الفرعي الثاني: تفاصيل الأمان، معايير التشفير (JWT / AES-256)، وسياسة الخصوصية */}
        <div className="lg:col-span-5 bg-white p-8 rounded-2xl border border-outline-variant space-y-4 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 leading-none">
              {t("overview.compliance.title", "System Access Compliance")}
            </h4>
            <p className="text-sm text-slate-600 font-sans mt-3.5 leading-relaxed">
              {t("overview.compliance.body1", "In accordance with standard digital health provisions, all user interactions inside patient directories are logged for internal audit logs.")}
            </p>
            <p className="text-xs text-slate-400 font-sans leading-relaxed mt-2">
              {t("overview.compliance.body2", "Please lock sessions when leaving terminal workstations unattended.")}
            </p>
          </div>
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              {t("overview.compliance.sessionType", "Encryption standard:")}
            </span>
            <span className="text-xs font-mono font-bold text-primary bg-primary/5 px-2.5 py-1 rounded-md border border-outline-variant">
              AES-256 / JWT
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}