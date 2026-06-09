//إدارة وعرض سجلات المرضى

import React, { useState, useEffect } from "react";
import {
  Plus,
  Users,
  Award,
  AlertTriangle,
  Filter,
  Download,
  CheckCircle2,
  MoreVertical,
  Activity,
} from "lucide-react";

import { useTranslation } from "react-i18next";
// عميل الـ API لإرسال واستقبال البيانات من السيرفر
import { apiClient } from "../api.js";
// النوع البرمجي لبيانات المريض
import { Patient } from "../types.js";
// استيراد المكون الابن (النافذة المنبثقة لإضافة مريض)
import PatientModal from "./PatientModal.jsx";

/* تعريف الـ Props المستقبلة من المكون الأب (مثل شريط البحث في الهيدر الرئيسي) */
interface PatientsProps {
  searchTerm: string; // نص البحث القادم من شريط البحث المشترك
}

export default function Patients({ searchTerm }: PatientsProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  /* حالات الذاكرة (States) لإدارة السجلات والواجهة */
  const [patients, setPatients] = useState<Patient[]>([]); // مصفوفة المرضى القادمة من الباك اند
  const [loading, setLoading] = useState(true); // حالة التحميل أثناء جلب البيانات
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false); // التحكم بظهور وإخفاء نافذة التسجيل
  const [notif, setNotif] = useState<string | null>(null);

  /* دالة جلب سجلات المرضى من المستودع المركزي للبيانات */
  const fetchPatients = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await apiClient.get("/patients");

      // التحقق من أن البيانات القادمة هي مصفوفة بالفعل لتجنب كراش التطبيق
      if (Array.isArray(response.data)) {
        setPatients(response.data);
      } else {
        setErrorMsg(
          t(
            "patients.errors.schemaError",
            "Invalid data format received from clinical service.",
          ),
        );
      }
    } catch (err: any) {
      console.error("Clinical fetching failed:", err);
      setErrorMsg(
        t(
          "patients.errors.fetchFailed",
          "Failed to retrieve records from the central health data repository.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  /* استدعاء الدالة عند أول ظهور للمكون في الواجهة (Mounting) */
  useEffect(() => {
    fetchPatients();
  }, []);

  const handlePatientRegistered = (newPatient: Patient) => {
    // إضافة المريض الجديد في بداية المصفوفة وتحديث الواجهة فوراً
    setPatients((prev) => [newPatient, ...prev]);
    setNotif(
      t(
        "patients.notifications.registered",
        `File for ${newPatient.fullName} opened successfully. ID: ${newPatient.id}`,
      ),
    );
    // إخفاء الإشعار تلقائياً بعد 5 ثوانٍ
    setTimeout(() => setNotif(null), 5000);
  };

  /* تصفية وفلترة المرضى ديناميكياً بناءً على قيمة البحث المدخلة */
  const filteredPatients = patients.filter((p) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true; // إذا كان حقل البحث فارغاً، يتم عرض الجميع
    // البحث والتطابق في كافة الحقول الحيوية للمريض
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      p.bloodType.toLowerCase().includes(q) ||
      p.gender.toLowerCase().includes(q)
    );
  });

  return (
    <div
      className={`space-y-8 animate-in fade-in duration-300 ${isRtl ? "text-right" : "text-left"}`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* هيدر الصفحة وزر فتح نافذة التسجيل الجديدة */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-primary tracking-tight font-sans">
            {t("patients.header.title", "Outpatient Registry")}
          </h2>
          <p className="text-sm text-secondary mt-1">
            {t(
              "patients.header.subtitle",
              "Monitor admission files, clinical distributions, and basic analytics.",
            )}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-lg font-bold text-xs shadow-md hover:bg-primary/90 transition-all cursor-pointer group"
        >
          <Plus className="w-4.5 h-4.5 group-hover:scale-110 transition-transform" />
          <span>
            {t("patients.header.registerButton", "Register New Admission")}
          </span>
        </button>
      </div>

      {/* شريط إشعار نجاح التسجيل اللحظي */}
      {notif && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-500/20 text-emerald-800 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{notif}</span>
        </div>
      )}

      {/* قسم الإحصائيات الحيوية (الأرقام والنسب الافتراضية للمستشفى) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* بطاقة إجمالي قاعدة البيانات النشطة */}
        <div className="bg-white p-6 rounded-2xl border border-outline-variant hover:border-primary/30 transition-all shadow-sm group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-primary/5 text-primary rounded-xl group-hover:scale-110 transition-transform duration-200">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {t("patients.stats.totalGrowth", "+12% Growth")}
            </span>
          </div>
          <p className="text-secondary text-[11px] font-bold uppercase tracking-widest">
            {t("patients.stats.totalLabel", "Total Active Database")}
          </p>
          <h3 className="text-3xl font-bold mt-1 text-on-surface">
            {loading
              ? "..."
              : (patients.length + 1420).toLocaleString(i18n.language)}
          </h3>
        </div>

        {/* بطاقة الحالات الحرجة بالطوارئ والفرز */}
        <div className="bg-white p-6 rounded-2xl border border-outline-variant hover:border-primary/30 transition-all shadow-sm group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-rose-50 text-rose-700 rounded-xl group-hover:scale-110 transition-transform duration-200">
              <Activity className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full">
              {t("patients.stats.urgentStatus", "Critical Care")}
            </span>
          </div>
          <p className="text-secondary text-[11px] font-bold uppercase tracking-widest">
            {t("patients.stats.urgentLabel", "Urgent Triage Cases")}
          </p>
          <h3 className="text-3xl font-bold mt-1 text-on-surface">
            {(24).toLocaleString(i18n.language)}
          </h3>
        </div>

        {/* بطاقة نسبة الشفاء والخروج الشهرية */}
        <div className="bg-white p-6 rounded-2xl border border-outline-variant hover:border-primary/30 transition-all shadow-sm group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl group-hover:scale-110 transition-transform duration-200">
              <Award className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-secondary bg-slate-50 px-2.5 py-0.5 rounded-full">
              {t("patients.stats.recoveryPeriod", "Monthly")}
            </span>
          </div>
          <p className="text-secondary text-[11px] font-bold uppercase tracking-widest">
            {t("patients.stats.recoveryLabel", "Discharge Rate")}
          </p>
          <h3 className="text-3xl font-bold mt-1 text-on-surface">
            {isRtl ? `%94.2` : "94.2%"}
          </h3>
        </div>

        {/* بطاقة الفحوصات والتحاليل المعلقة بالانتظار */}
        <div className="bg-white p-6 rounded-2xl border border-outline-variant hover:border-primary/30 transition-all shadow-sm group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-50 text-amber-700 rounded-xl group-hover:scale-110 transition-transform duration-200">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
              {t("patients.stats.pendingStatus", "Pending Action")}
            </span>
          </div>
          <p className="text-secondary text-[11px] font-bold uppercase tracking-widest">
            {t("patients.stats.pendingLabel", "Unassigned Labs")}
          </p>
          <h3 className="text-3xl font-bold mt-1 text-on-surface">
            {(7).toLocaleString(i18n.language, { minimumIntegerDigits: 2 })}
          </h3>
        </div>
      </div>

      {/* حاوية جدول البيانات الرئيسي للمرضى */}
      <div className="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
        {/* ترويسة الجدول وأزرار التصفية والتصدير */}
        <div className="px-6 py-4.5 border-b border-outline-variant flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
          <h4 className="text-base font-bold text-on-surface">
            {t("patients.table.directoryTitle", "Patient Core Ledger")}
          </h4>
          <div className="flex gap-2">
            <button
              type="button"
              className="p-2 border border-outline-variant rounded-lg text-xs font-bold font-sans text-secondary hover:bg-slate-50 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Filter className="w-3.5 h-3.5" />
              {t("patients.table.filterButton", "Filter Wards")}
            </button>
            <button
              type="button"
              className="p-2 border border-outline-variant rounded-lg text-xs font-bold font-sans text-secondary hover:bg-slate-50 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              {t("patients.table.exportButton", "Export Manifest")}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {/* 1. معالجة حالة التحميل  (Spinner) */}
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center text-center gap-3">
              <svg
                className="animate-spin h-8 w-8 text-primary"
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
              <span className="text-secondary text-xs font-bold uppercase tracking-widest">
                {t(
                  "patients.table.loading",
                  "Synchronizing medical registry database...",
                )}
              </span>
            </div>
          ) : errorMsg ? (
            /* 2. معالجة وجود خطأ في جلب البيانات وزر إعادة المحاولة */
            <div className="p-16 text-center">
              <span className="text-error text-sm font-semibold">
                {errorMsg}
              </span>
              <button
                type="button"
                onClick={fetchPatients}
                className="mt-4 block mx-auto text-xs text-primary underline font-bold"
              >
                {t("patients.table.retry", "Refresh Data View")}
              </button>
            </div>
          ) : filteredPatients.length === 0 ? (
            /* 3. معالجة عدم وجود نتائج تطابق نص البحث */
            <div className="p-16 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-secondary font-semibold">
                {t(
                  "patients.table.noResults",
                  `No medical archives matched: "${searchTerm}"`,
                  { term: searchTerm },
                )}
              </p>
            </div>
          ) : (
            /* 4. رندرة جدول سجلات المرضى عند جاهزية البيانات */
            <table className="w-full border-collapse">
              <thead className="bg-slate-50 border-b border-outline-variant select-none">
                <tr>
                  <th
                    className={`px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider font-sans ${isRtl ? "text-right" : "text-left"}`}
                  >
                    {t(
                      "patients.table.cols.demographics",
                      "Demographics & Identity",
                    )}
                  </th>
                  <th
                    className={`px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider font-sans ${isRtl ? "text-right" : "text-left"}`}
                  >
                    {t("patients.table.cols.chartId", "Chart ID")}
                  </th>
                  <th
                    className={`px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider font-sans ${isRtl ? "text-right" : "text-left"}`}
                  >
                    {t("patients.table.cols.ward", "Assigned Unit")}
                  </th>
                  <th
                    className={`px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider font-sans ${isRtl ? "text-right" : "text-left"}`}
                  >
                    {t("patients.table.cols.contact", "Contact Info")}
                  </th>
                  <th
                    className={`px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider font-sans ${isRtl ? "text-right" : "text-left"}`}
                  >
                    {t("patients.table.cols.age", "Birth Summary")}
                  </th>
                  <th
                    className={`px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider font-sans ${isRtl ? "text-right" : "text-left"}`}
                  >
                    {t("patients.table.cols.vitals", "Triage Status")}
                  </th>
                  <th
                    className={`px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider font-sans ${isRtl ? "text-right" : "text-left"}`}
                  >
                    {t("patients.table.cols.action", "Options")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant font-sans">
                {filteredPatients.map((p) => {
                  // استخراج الحروف الأولى من الاسم لعرضها كـ Avatar ديموغرافي
                  const initials = p.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2);

                  // دالة تحديد كلاس التصميم (الألوان) بناءً على الحالة الصحية للمريض
                  const getStatusStyle = (status: string) => {
                    const normalizedStatus = status
                      ? status.trim().toLowerCase()
                      : "";
                    switch (normalizedStatus) {
                      case "stable":
                      case "مستقر":
                        return "bg-emerald-50 text-emerald-800 border-emerald-500/20";
                      case "critical":
                      case "حرج":
                        return "bg-rose-50 text-rose-800 border-rose-500/20";
                      case "recovering":
                      case "في مرحلة الشفاء":
                        return "bg-sky-50 text-sky-800 border-sky-500/20";
                      case "observation":
                      case "تحت الملاحظة":
                        return "bg-amber-50 text-amber-800 border-amber-500/20";
                      default:
                        return "bg-slate-50 text-slate-800 border-slate-500/10";
                    }
                  };

                  // ترجمة حقل الجنس برمجياً بالتوافق مع ملف i18n
                  const normalizedGender = p.gender
                    ? p.gender.trim().toLowerCase()
                    : "";
                  const translatedGender =
                    normalizedGender === "male"
                      ? t("patientModal.gender.male", "Male")
                      : normalizedGender === "female"
                        ? t("patientModal.gender.female", "Female")
                        : t("patientModal.gender.other", "Other");

                  // تهيئة وترجمة حالة الفرز الطبي للمريض
                  let statusKey = "stable";
                  if (p.status) {
                    const sLower = p.status.toLowerCase().trim();
                    if (sLower === "critical") statusKey = "critical";
                    else if (sLower === "recovering") statusKey = "recovering";
                    else if (sLower === "observation")
                      statusKey = "observation";
                  }
                  const translatedStatus = t(
                    `patients.status.${statusKey}`,
                    p.status,
                  );

                  // تهيئة وترجمة القسم الطبي الموزع عليه المريض
                  let deptKey = "general";
                  if (p.department) {
                    const dLower = p.department.toLowerCase().trim();
                    if (dLower.includes("cardiology")) deptKey = "cardiology";
                    else if (dLower.includes("neurology"))
                      deptKey = "neurology";
                    else if (dLower.includes("orthopedics"))
                      deptKey = "orthopedics";
                  }
                  const translatedDepartment = t(
                    `patients.departments.${deptKey}`,
                    p.department || "General Outpatient",
                  );

                  // حساب العمر ديناميكياً من تاريخ الميلاد الممرر من قاعدة البيانات
                  const ageCalculated = Math.floor(
                    (new Date().getTime() - new Date(p.dob).getTime()) /
                      (365.25 * 24 * 60 * 60 * 1000),
                  );

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* الاسم والجنس وفصيلة الدم */}
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 border border-outline-variant flex items-center justify-center text-primary font-bold text-xs">
                            {initials}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">
                              {p.fullName}
                            </p>
                            <p className="text-xs text-secondary mt-0.5">
                              {translatedGender} • Rh {p.bloodType}
                            </p>
                          </div>
                        </div>
                      </td>
                      {/* الرقم المعرف للملف الطبي */}
                      <td className="px-6 py-4.5">
                        <span className="font-mono text-xs font-semibold text-on-surface-variant bg-slate-100 py-1 px-2.5 rounded-md border border-outline-variant/60">
                          {p.id}
                        </span>
                      </td>
                      {/* القسم الطبي المختص */}
                      <td className="px-6 py-4.5">
                        <span className="text-xs font-bold text-on-surface-variant">
                          {translatedDepartment}
                        </span>
                      </td>
                      {/* البريد الإلكتروني ومحل الإقامة الحالي */}
                      <td className="px-6 py-4.5 text-xs max-w-xs">
                        <p className="font-semibold text-on-surface truncate">
                          {p.email}
                        </p>
                        <p className="text-secondary truncate mt-0.5">
                          {p.address}
                        </p>
                      </td>
                      {/* تاريخ الميلاد والعمر الفعلي المنسق محلياً */}
                      <td className="px-6 py-4.5 text-xs">
                        <p className="font-bold text-on-surface">
                          {new Date(p.dob).toLocaleDateString(i18n.language, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                        <p className="text-secondary mt-0.5">
                          {t(
                            "patients.table.yearsCount",
                            `${ageCalculated} Years Old`,
                            { count: ageCalculated },
                          )}
                        </p>
                      </td>
                      {/* شارة حالة الفرز الطبي (Triage Status Badge) */}
                      <td className="px-6 py-4.5">
                        <span
                          className={`px-3 py-1 border text-xs font-bold rounded-full ${getStatusStyle(p.status)}`}
                        >
                          {translatedStatus}
                        </span>
                      </td>
                      {/* زر الخيارات الإضافية لكل مريض */}
                      <td className="px-6 py-4.5">
                        <button
                          type="button"
                          className="text-outline hover:text-primary transition-colors focus:outline-none p-1 rounded-lg"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* تذييل الجدول وعرض العداد وأزرار التنقل Pagination غير النشطة افتراضياً */}
        <div className="px-6 py-4.5 bg-slate-50 border-t border-outline-variant flex justify-between items-center text-xs text-secondary font-semibold select-none">
          <p>
            {t(
              "patients.table.footerCount",
              `Showing ${filteredPatients.length} of ${patients.length} active entries`,
              { filtered: filteredPatients.length, total: patients.length },
            )}
          </p>
          <div className="flex gap-2">
            <button
              disabled
              className="px-3 py-1 border border-outline-variant rounded bg-white text-secondary opacity-50 cursor-not-allowed"
            >
              {t("patients.table.prev", "Previous")}
            </button>
            <button
              disabled
              className="px-3 py-1 border border-outline-variant rounded bg-white text-secondary opacity-50 cursor-not-allowed"
            >
              {t("patients.table.next", "Next")}
            </button>
          </div>
        </div>
      </div>

      {/* تفعيل رندرة المودال المشروط عند الضغط على زر الإضافة */}
      {showModal && (
        <PatientModal
          onClose={() => setShowModal(false)}
          onSaveSuccess={handlePatientRegistered}
        />
      )}
    </div>
  );
}
