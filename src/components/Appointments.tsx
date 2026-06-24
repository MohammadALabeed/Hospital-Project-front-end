import React, { useState, useEffect } from "react";

// استيراد أيقونات التقويم، الوقت، الإضافة، الحفظ وعلامات التحقق
import { Calendar, Clock, Plus, Save, CheckCircle2 } from "lucide-react";

// أداة الترجمة لدعم اللغتين العربية والإنجليزية
import { useTranslation } from "react-i18next";

// استيراد الـ apiClient للاتصال مع خادم الباك اند
import { apiClient } from "../api.js";

// استيراد قالب التحقق من بيانات الموعد (Type/Interface)
import { Appointment } from "../types.js";


export default function Appointments() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  /* 1. حالات الذاكرة المؤقتة (States) لإدارة السجلات والتحميل والأخطاء */
  const [apts, setApts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* 2. حالات الذاكرة المؤقتة (States) لتجميع بيانات الموعد الجديد من الـ Form */
  const [patientName, setPatientName] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [department, setDepartment] = useState("general");
  const [reason, setReason] = useState("");
  const [notif, setNotif] = useState<string | null>(null);

  /* 3. دالة جلب قائمة المواعيد المحجوزة من السيرفر عبر الـ API (GET Request) */
  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/appointments");
      if (Array.isArray(response.data)) {
        setApts(response.data);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(
        t("appointments.errors.fetchFailed", "Failed to load appointments."),
      );
    } finally {
      setLoading(false);
    }
  };

  /* 4. (useEffect) لتحديث اللوحة وجلب المواعيد فور فتح الشاشة مباشرة */
  useEffect(() => {
    fetchAppointments();
  }, []);

  /* 5. دالة معالجة وحفظ الموعد الجديد وإرساله لقاعدة البيانات (POST Request) */
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // منع المتصفح من عمل Refresh عند إرسال النموذج

    // التحقق الفوري من إدخال البيانات المطلوبة
    if (!patientName || !doctorName || !dateTime || !department) {
      alert(
        t(
          "appointments.errors.requiredFields",
          "Please fill in all required fields.",
        ),
      );
      return;
    }

    try {
      const response = await apiClient.post("/appointments", {
        patientName,
        doctorName,
        dateTime,
        department,
        reason,
      });

      // في حال نجاح السيرفر بالحفظ، يتم تحديث القائمة محلياً فوراً
      if (response.data && response.data.success) {
        setApts((prev) => [response.data.appointment, ...prev]);
        // تنظيف المدخلات لإتاحة حجز موعد جديد
        setPatientName("");
        setDoctorName("");
        setDateTime("");
        setReason("");
        setNotif(
          t(
            "appointments.notifications.saved",
            "Appointment scheduled successfully.",
          ),
        );
        setTimeout(() => setNotif(null), 4000);
      }
    } catch (err) {
      console.error(err);
      alert(t("appointments.errors.saveFailed", "Failed to save appointment."));
    }
  };

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="space-y-8 animate-in fade-in duration-300"
    >
      {/* هيدر الصفحة والعناوين التعريفية */}
      <div>
        <h2 className="text-3xl font-bold text-primary tracking-tight font-sans">
          {t("appointments.title", "Appointments Overview")}
        </h2>
        <p className="text-sm text-secondary mt-1">
          {t(
            "appointments.subtitle",
            "Manage and book patient consultation slots.",
          )}
        </p>
      </div>

      {/* واجهة إشعارات النجاح أو الفشل الديناميكية */}
      {notif && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-500/20 text-emerald-800 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shadow-sm shrink-0" />
          <span>{notif}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-500/20 text-rose-800 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-rose-600 shadow-sm shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* 6. واجهة الاستمارة (Form): نموذج حجز موعد جديد للمريض */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-outline-variant h-fit">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary border-b border-slate-100 pb-3.5 mb-5 flex items-center gap-2">
            <Plus className="w-4.5 h-4.5" />
            <span>{t("appointments.form.title", "Book Appointment")}</span>
          </h3>

          <form
            onSubmit={handleScheduleSubmit}
            className="space-y-4 font-sans text-xs"
          >
            {/* حقل اسم المريض */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface-variant block">
                {t("appointments.form.patientNameLabel", "Patient Name")}
              </label>
              <input
                type="text"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder={t(
                  "appointments.form.patientNamePlaceholder",
                  "Jonathan Doe",
                )}
                className="w-full px-3.5 py-2.5 bg-surface border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm font-sans"
              />
            </div>

            {/* قائمة اختيار الطبيب المعالج */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface-variant block">
                {t("appointments.table.doctor", "Physician")}
              </label>
              <select
                required
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm font-sans cursor-pointer"
              >
                <option value="" disabled>
                  {t(
                    "appointments.form.selectDoctorPlaceholder",
                    "Select practitioner",
                  )}
                </option>
                <option value="Dr. Alexander">Dr. Alexander</option>
                <option value="Dr. Sarah Taylor">Dr. Sarah Taylor</option>
                <option value="Dr. Michael Vance">Dr. Michael Vance</option>
              </select>
            </div>

            {/* حقل تحديد تاريخ ووقت الزيارة الطبية */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-semibold text-on-surface-variant block">
                  {t("appointments.table.date", "Date & Time")}
                </label>
                <input
                  type="datetime-local"
                  required
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm font-sans cursor-pointer"
                />
              </div>
            </div>

            {/* قائمة اختيار قسم العيادة الطبية */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface-variant block">
                {t("appointments.table.department", "Department")}
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm font-sans cursor-pointer"
              >
                <option value="general">
                  {t("patients.departments.general", "General Medicine")}
                </option>
                <option value="cardiology">
                  {t("patients.departments.cardiology", "Cardiology")}
                </option>
                <option value="pediatrics">
                  {t("patients.departments.pediatrics", "Pediatrics")}
                </option>
                <option value="neurology">
                  {t("patients.departments.neurology", "Neurology")}
                </option>
              </select>
            </div>

            {/* حقل كتابة سبب الزيارة */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface-variant block">
                {t("appointments.form.reasonLabel", "Reason for Visit")}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t(
                  "appointments.form.reasonPlaceholder",
                  "Enter reason for visit...",
                )}
                rows={3}
                className="w-full px-3.5 py-2.5 bg-surface border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-xs font-sans resize-none"
              />
            </div>

            {/* زر تأكيد الإرسال والحفظ للباك اند */}
            <button
              type="submit"
              className="w-full bg-primary text-white py-3 rounded-lg font-bold text-xs hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>
                {t("appointments.form.saveButton", "Save Appointment")}
              </span>
            </button>
          </form>
        </div>

        {/* 7. واجهة الجدول (Table): لعرض ومتابعة المواعيد المحجوزة حالياً بالمستشفى */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-slate-50">
            <h4 className="text-base font-bold text-primary flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <span>{t("appointments.title", "Scheduled Slots")}</span>
            </h4>
            <span className="text-xs text-secondary font-bold">
              {t("patients.table.exportButton", "Total")}: {apts.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            {/* عرض واجهة الانتظار أثناء تحميل البيانات */}
            {loading ? (
              <div className="p-16 text-center text-secondary text-xs uppercase tracking-widest font-semibold">
                {t("appointments.loading", "Loading appointments...")}
              </div>
            ) : apts.length === 0 ? (
              /* في حال كان جدول العيادات فارغ تماماً */
              <div className="p-16 text-center text-secondary font-semibold">
                {t("appointments.noAppointments", "No appointments scheduled.")}
              </div>
            ) : (
              /* رسم محتويات الجدول الحقيقية بعد اكتمال الاستجابة */
              <table className="w-full border-collapse">
                <thead className="bg-[#f8fafc] border-b border-outline-variant">
                  <tr className="select-none">
                    <th className="px-5 py-3 text-xs font-bold text-secondary uppercase tracking-wider font-sans text-start">
                      {t("appointments.table.patientName", "Patient")}
                    </th>
                    <th className="px-5 py-3 text-xs font-bold text-secondary uppercase tracking-wider font-sans text-start">
                      {t("appointments.table.doctor", "Doctor")}
                    </th>
                    <th className="px-5 py-3 text-xs font-bold text-secondary uppercase tracking-wider font-sans text-start">
                      {t("appointments.table.date", "Date & Time")}
                    </th>
                    <th className="px-5 py-3 text-xs font-bold text-secondary uppercase tracking-wider font-sans text-start">
                      {t("appointments.table.department", "Department")}
                    </th>
                    <th className="px-5 py-3 text-xs font-bold text-secondary uppercase tracking-wider font-sans text-start">
                      {t("appointments.table.status", "Status")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant font-sans text-xs">
                  {apts.map((item) => {
                    /* 8. منطق تلوين شارات الحالة (Confirmed, Pending, Cancelled) ديناميكياً */
                    const getStatusStyle = (s: string) => {
                      switch (s) {
                        case "Confirmed":
                          return "bg-emerald-50 text-emerald-800 border-emerald-400/20";
                        case "Pending":
                          return "bg-amber-50 text-amber-800 border-amber-400/20";
                        case "Cancelled":
                          return "bg-rose-50 text-rose-800 border-rose-400/20";
                        default:
                          return "bg-sky-50 text-sky-800 border-sky-400/20";
                      }
                    };

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-primary/5 transition-colors cursor-pointer"
                      >
                        <td className="px-5 py-4">
                          <p className="font-bold text-on-surface">
                            {item.patientName}
                          </p>
                        </td>
                        <td className="px-5 py-4 font-semibold text-on-surface-variant">
                          {item.doctorName}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-on-surface font-semibold">
                            <Clock className="w-3.5 h-3.5 text-secondary" />

                            {/* صياغة صيغة التاريخ محلياً وتلقائياً */}
                            <span>
                              {new Date(item.dateTime).toLocaleDateString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {t(
                            `patients.departments.${item.department.toLowerCase()}`,
                            item.department,
                          )}
                        </td>
                        {/* عمود حالة الموعد مع الشارة الملونة */}
                        <td className="px-5 py-4">
                          <span
                            className={`px-2.5 py-0.5 border text-[10px] font-bold rounded-full ${getStatusStyle(item.status)}`}
                          >
                            {t(
                              `appointments.status.${item.status.toLowerCase()}`,
                              item.status,
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="px-6 py-4 bg-slate-50 border-t border-outline-variant text-[11px] text-secondary font-bold">
            {t(
              "patients.table.directoryTitle",
              "Showing active facility schedule rows.",
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
