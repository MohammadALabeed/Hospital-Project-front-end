import React, { useEffect, useState } from "react";
import {
  Users,
  Activity,
  HeartPulse,
  ArrowRight,
  ChevronRight,
  Loader2,
  CalendarDays,
  FileText,
  AlertTriangle,
  Stethoscope,
} from "lucide-react";

import { useTranslation } from "react-i18next";
import { apiClient } from "../api.js";
import { getUnavailableDoctorIds } from "../doctorAvailability.js";

// استيراد تيبات التحقق من البيانات الخاصة بالجلسة
import { RoleID, UserSession } from "../types.js";

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

interface DashboardAppointment {
  AppointmentID: number | string;
  DoctorID: number | string;
  PatientName?: string | null;
  AppointmentDate: string;
  Status: string;
}

interface DashboardDoctor {
  DoctorID: number | string;
  UserID: number | string;
  DoctorName?: string | null;
  Specialization?: string | null;
  Specialty?: string | null;
}

interface DashboardPersonalInfo {
  UserID: number | string;
  FullName?: string | null;
}

interface DoctorAvailabilityEntry {
  doctorId: number | string;
  fullName: string;
  specialization: string;
  isAvailable: boolean;
}

interface DashboardMedicalRecord {
  RecordID: number | string;
  PatientName?: string | null;
  Diagnosis: string;
}

interface DashboardAIReport {
  ReportID: number | string;
  RecordID: number | string;
  ReportText: unknown;
}

interface DrugInteractionCase {
  recordId: number | string;
  warningCount: number;
}

interface DashboardSummary {
  appointments: DashboardAppointment[];
  medicalRecords: DashboardMedicalRecord[];
  drugInteractions: DrugInteractionCase[];
}

const getStatCount = (value: unknown): number => {
  const count = typeof value === "number" ? value : Number(value);
  return Number.isFinite(count) && count >= 0 ? count : 0;
};

const parseArray = <T,>(
  value: unknown,
  isItem: (item: unknown) => item is T,
): T[] | null => {
  if (!Array.isArray(value)) return null;
  const parsedItems: T[] = [];
  for (const item of value) {
    if (!isItem(item)) return null;
    parsedItems.push(item);
  }
  return parsedItems;
};

const isDashboardAppointment = (value: unknown): value is DashboardAppointment => {
  if (!value || typeof value !== "object") return false;
  const appointment = value as Record<string, unknown>;
  return (
    (typeof appointment.AppointmentID === "number" ||
      typeof appointment.AppointmentID === "string") &&
    (typeof appointment.DoctorID === "number" ||
      typeof appointment.DoctorID === "string") &&
    typeof appointment.AppointmentDate === "string" &&
    typeof appointment.Status === "string" &&
    (appointment.PatientName === undefined ||
      typeof appointment.PatientName === "string" ||
      appointment.PatientName === null)
  );
};

const isDashboardDoctor = (value: unknown): value is DashboardDoctor => {
  if (!value || typeof value !== "object") return false;
  const doctor = value as Record<string, unknown>;
  return (
    (typeof doctor.DoctorID === "number" || typeof doctor.DoctorID === "string") &&
    (typeof doctor.UserID === "number" || typeof doctor.UserID === "string") &&
    (typeof (doctor.Specialization ?? doctor.Specialty) === "string") &&
    (doctor.DoctorName === undefined ||
      doctor.DoctorName === null ||
      typeof doctor.DoctorName === "string")
  );
};

const isDashboardPersonalInfo = (value: unknown): value is DashboardPersonalInfo => {
  if (!value || typeof value !== "object") return false;
  const personalInfo = value as Record<string, unknown>;
  return (
    (typeof personalInfo.UserID === "number" ||
      typeof personalInfo.UserID === "string") &&
    (personalInfo.FullName === undefined ||
      personalInfo.FullName === null ||
      typeof personalInfo.FullName === "string")
  );
};

const isDashboardMedicalRecord = (value: unknown): value is DashboardMedicalRecord => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    (typeof record.RecordID === "number" || typeof record.RecordID === "string") &&
    typeof record.Diagnosis === "string" &&
    (record.PatientName === undefined ||
      typeof record.PatientName === "string" ||
      record.PatientName === null)
  );
};

const isDashboardAIReport = (value: unknown): value is DashboardAIReport => {
  if (!value || typeof value !== "object") return false;
  const report = value as Record<string, unknown>;
  return (
    (typeof report.ReportID === "number" || typeof report.ReportID === "string") &&
    (typeof report.RecordID === "number" || typeof report.RecordID === "string") &&
    "ReportText" in report
  );
};

const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const getDrugWarningCount = (value: unknown): number => {
  let reportContent = value;
  if (typeof reportContent === "string") {
    try {
      reportContent = JSON.parse(reportContent) as unknown;
    } catch {
      return 0;
    }
  }
  const report = asObject(reportContent);
  const deliberation = asObject(report?.deliberation);
  const warningCounts = [
    asObject(deliberation?.agent2_safetyAuditor)?.drugWarnings,
    asObject(deliberation?.agent2_pharmacologist)?.drugWarnings,
  ]
    .filter(Array.isArray)
    .map((warnings) => warnings.length);
  return Math.max(0, ...warningCounts);
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
  const [summary, setSummary] = useState<DashboardSummary>({
    appointments: [],
    medicalRecords: [],
    drugInteractions: [],
  });
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [doctorAvailability, setDoctorAvailability] = useState<
    DoctorAvailabilityEntry[]
  >([]);
  const [doctorAvailabilityLoading, setDoctorAvailabilityLoading] = useState(true);
  const [doctorAvailabilityError, setDoctorAvailabilityError] = useState<
    string | null
  >(null);
  const canViewClinicalSummary =
    user.roleId === RoleID.Admin || user.roleId === RoleID.Doctor;

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

  useEffect(() => {
    if (!canViewClinicalSummary) {
      setSummaryLoading(false);
      setDoctorAvailabilityLoading(false);
      return;
    }

    let isMounted = true;
    const fetchSummary = async () => {
      setSummaryLoading(true);
      setSummaryError(null);
      setDoctorAvailabilityLoading(true);
      setDoctorAvailabilityError(null);
      try {
        const [appointmentsResponse, recordsResponse, reportsResponse] =
          await Promise.all([
            apiClient.get("/appointments"),
            apiClient.get("/medical-records"),
            apiClient.get("/ai-reports"),
          ]);
        const appointmentRecords = parseArray(
          appointmentsResponse.data,
          isDashboardAppointment,
        );
        const medicalRecordEntries = parseArray(
          recordsResponse.data,
          isDashboardMedicalRecord,
        );
        const aiReportEntries = parseArray(reportsResponse.data, isDashboardAIReport);
        if (!appointmentRecords || !medicalRecordEntries || !aiReportEntries) {
          throw new Error("The server returned an unexpected dashboard summary format.");
        }

        const appointments = [...appointmentRecords]
          .filter((appointment) =>
            ["scheduled", "confirmed", "pending", "in progress"].includes(
              appointment.Status.trim().toLowerCase(),
            ),
          )
          .sort(
            (first, second) =>
              Date.parse(second.AppointmentDate) - Date.parse(first.AppointmentDate),
          )
          .slice(0, 3);
        const fetchDoctorAvailability = async () => {
          try {
            const [doctorsResponse, personalInfoResponse] = await Promise.all([
              apiClient.get("/doctors"),
              apiClient.get("/personal-info"),
            ]);
            const doctors = parseArray(doctorsResponse.data, isDashboardDoctor);
            const personalInfo = parseArray(
              personalInfoResponse.data,
              isDashboardPersonalInfo,
            );
            if (!doctors || !personalInfo) {
              throw new Error("The server returned an unexpected doctor directory format.");
            }

            const personalInfoByUserId = new Map(
              personalInfo.map((entry) => [String(entry.UserID), entry]),
            );
            const unavailableDoctorIds =
              getUnavailableDoctorIds(appointmentRecords);
            const entries = doctors
              .map((doctor) => ({
                doctorId: doctor.DoctorID,
                fullName:
                  personalInfoByUserId
                    .get(String(doctor.UserID))
                    ?.FullName?.trim() ||
                  doctor.DoctorName?.trim() ||
                  "",
                specialization:
                  doctor.Specialization ?? doctor.Specialty ?? "",
                isAvailable: !unavailableDoctorIds.has(String(doctor.DoctorID)),
              }))
              .sort(
                (firstDoctor, secondDoctor) =>
                  Number(firstDoctor.doctorId) - Number(secondDoctor.doctorId),
              );
            if (isMounted) setDoctorAvailability(entries);
          } catch (error) {
            console.error("Failed to retrieve doctor availability:", error);
            if (isMounted) {
              setDoctorAvailabilityError("overview.recent.doctorsLoadFailed");
            }
          } finally {
            if (isMounted) setDoctorAvailabilityLoading(false);
          }
        };

        const medicalRecords = [...medicalRecordEntries]
          .sort(
            (first, second) => Number(second.RecordID) - Number(first.RecordID),
          )
          .slice(0, 3);
        const seenRecordIds = new Set<string>();
        const drugInteractions: DrugInteractionCase[] = [];
        [...aiReportEntries]
          .sort((first, second) => Number(second.ReportID) - Number(first.ReportID))
          .forEach((report) => {
            const recordId = String(report.RecordID);
            const warningCount = getDrugWarningCount(report.ReportText);
            if (warningCount > 0 && !seenRecordIds.has(recordId)) {
              seenRecordIds.add(recordId);
              drugInteractions.push({ recordId: report.RecordID, warningCount });
            }
          });

        if (isMounted) {
          setSummary({ appointments, medicalRecords, drugInteractions });
          void fetchDoctorAvailability();
        }
      } catch (error) {
        console.error("Failed to retrieve dashboard summaries:", error);
        if (isMounted) {
          setSummaryError("overview.recent.loadFailed");
          setDoctorAvailabilityError("overview.recent.doctorsLoadFailed");
          setDoctorAvailabilityLoading(false);
        }
      } finally {
        if (isMounted) setSummaryLoading(false);
      }
    };

    void fetchSummary();
    return () => {
      isMounted = false;
    };
  }, [canViewClinicalSummary]);

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

  const formatAppointmentDate = (date: string) => {
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return t("overview.recent.invalidDate");
    return new Intl.DateTimeFormat(i18n.language, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(parsedDate);
  };

  const availableDoctorCount = doctorAvailability.filter(
    (doctor) => doctor.isAvailable,
  ).length;

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
      <div className="space-y-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
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
                {canViewClinicalSummary
                  ? doctorAvailabilityLoading
                    ? t("overview.stats.availabilityLoading")
                    : doctorAvailabilityError
                      ? t("overview.stats.availabilityUnavailable")
                      : t("overview.stats.availableDoctors", {
                          count: availableDoctorCount,
                        })
                  : t("overview.stats.doctorsSubtitle")}
              </p>
            </div>
          </div>
        </div>

        {canViewClinicalSummary && (
          <section className="space-y-5">
            <h3 className="text-xl font-bold text-primary">
              {t("overview.recent.title")}
            </h3>
            {summaryError && (
              <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-50 p-4 text-sm font-semibold text-rose-800">
                {t(summaryError)}
              </p>
            )}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-2xl border border-outline-variant bg-white p-6 shadow-sm">
                <h4 className="mb-4 flex items-center gap-2 font-bold text-on-surface">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  {t("overview.recent.appointments")}
                </h4>
                {summaryLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" aria-label={t("overview.stats.loading")} />
                ) : summary.appointments.length ? (
                  <ul className="space-y-3">
                    {summary.appointments.map((appointment) => (
                      <li key={String(appointment.AppointmentID)} className="border-t border-outline-variant pt-3 first:border-0 first:pt-0">
                        <p dir="auto" className="font-semibold text-on-surface">
                          {appointment.PatientName || `#${appointment.AppointmentID}`}
                        </p>
                        <p className="mt-1 text-xs text-secondary">
                          {formatAppointmentDate(appointment.AppointmentDate)} ·{" "}
                          {t(
                            `appointments.status.${appointment.Status
                              .toLowerCase()
                              .replace(/\s+/g, "")}`,
                            { defaultValue: appointment.Status },
                          )}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-secondary">{t("overview.recent.empty")}</p>
                )}
              </article>

              <article className="rounded-2xl border border-outline-variant bg-white p-6 shadow-sm">
                <h4 className="mb-4 flex items-center gap-2 font-bold text-on-surface">
                  <FileText className="h-5 w-5 text-primary" />
                  {t("overview.recent.medicalRecords")}
                </h4>
                {summaryLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" aria-label={t("overview.stats.loading")} />
                ) : summary.medicalRecords.length ? (
                  <ul className="space-y-3">
                    {summary.medicalRecords.map((record) => (
                      <li key={String(record.RecordID)} className="border-t border-outline-variant pt-3 first:border-0 first:pt-0">
                        <p dir="auto" className="font-semibold text-on-surface">
                          {record.PatientName || `#${record.RecordID}`}
                        </p>
                        <p dir="auto" className="mt-1 truncate text-xs text-secondary">
                          {record.Diagnosis}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-secondary">{t("overview.recent.empty")}</p>
                )}
              </article>

              <article className="rounded-2xl border border-outline-variant bg-white p-6 shadow-sm">
                <h4 className="mb-2 flex items-center gap-2 font-bold text-on-surface">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  {t("overview.recent.drugInteractions")}
                </h4>
                <p className="mb-4 text-3xl font-extrabold text-amber-700">
                  {summaryLoading ? "—" : summary.drugInteractions.length}
                </p>
                {summaryLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" aria-label={t("overview.stats.loading")} />
                ) : summary.drugInteractions.length ? (
                  <ul className="space-y-3">
                    {summary.drugInteractions.slice(0, 3).map((interaction) => (
                      <li key={String(interaction.recordId)} className="border-t border-outline-variant pt-3 first:border-0 first:pt-0">
                        <p className="font-semibold text-on-surface">
                          {t("overview.recent.interactionRecord", { id: interaction.recordId })}
                        </p>
                        <p className="mt-1 text-xs text-secondary">
                          {t("overview.recent.warningCount", { count: interaction.warningCount })}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-secondary">{t("overview.recent.noInteractions")}</p>
                )}
              </article>

              <article className="rounded-2xl border border-outline-variant bg-white p-6 shadow-sm">
                <h4 className="mb-2 flex items-center gap-2 font-bold text-on-surface">
                  <Stethoscope className="h-5 w-5 text-primary" />
                  {t("overview.recent.doctorAvailability")}
                </h4>
                {doctorAvailabilityLoading ? (
                  <Loader2
                    className="h-5 w-5 animate-spin text-primary"
                    aria-label={t("overview.stats.loading")}
                  />
                ) : doctorAvailabilityError ? (
                  <p role="alert" className="text-sm text-rose-700">
                    {t(doctorAvailabilityError)}
                  </p>
                ) : (
                  <>
                    <p className="mb-4 text-sm font-semibold text-secondary">
                      {t("overview.recent.doctorCounts", {
                        available: availableDoctorCount,
                        total: doctorAvailability.length,
                      })}
                    </p>
                    {doctorAvailability.length ? (
                      <ul className="space-y-3">
                        {doctorAvailability.slice(0, 4).map((doctor) => (
                          <li
                            key={String(doctor.doctorId)}
                            className="border-t border-outline-variant pt-3 first:border-0 first:pt-0"
                          >
                            <p
                              dir="auto"
                              className="font-semibold text-on-surface"
                            >
                              {doctor.fullName || `#${doctor.doctorId}`}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                              <span
                                dir="auto"
                                className="text-xs text-secondary"
                              >
                                {doctor.specialization}
                              </span>
                              <span
                                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                  doctor.isAvailable
                                    ? "bg-emerald-50 text-emerald-800"
                                    : "bg-amber-50 text-amber-800"
                                }`}
                              >
                                {t(
                                  doctor.isAvailable
                                    ? "overview.recent.available"
                                    : "overview.recent.scheduled",
                                )}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-secondary">
                        {t("overview.recent.noDoctors")}
                      </p>
                    )}
                  </>
                )}
              </article>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
