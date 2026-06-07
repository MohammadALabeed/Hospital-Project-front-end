import React, { useState, useEffect } from "react";

import { ClipboardList, ShieldAlert, FileSignature, Save, CheckCircle } from "lucide-react";

import { useTranslation } from "react-i18next";
// استيراد العميل المسؤول عن إرسال واستقبال الطلبات من الـ Backend API
import { apiClient } from "../api.js";
// استيراد مواصفات تيب السجل الطبي
import { MedicalRecord } from "../types.js";

export default function MedicalRecords() {
  const { t, i18n } = useTranslation();

  /* 1. حالات الذاكرة (States) الخاصة بجلب وإدارة البيانات من السيرفر */
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* 2. حالات الذاكرة (States) الخاصة بحقول استمارة الإدخال الجديدة */
  const [patientName, setPatientName] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");
  const [physician, setPhysician] = useState("");
  const [notif, setNotif] = useState<string | null>(null);

  /* 3. دالة جلب السجلات الطبية من قاعدة البيانات عبر الـ API (GET Request) */
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/medical-records");
      if (Array.isArray(response.data)) {
        setRecords(response.data);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(t("patients.errors.fetchFailed", "Failed to retrieve clinical charts."));
    } finally {
      setLoading(false);
    }
  };

  /* 4. خطاف الحفاظ على المكون: لتشغيل دالة جلب البيانات بمجرد تحميل الصفحة */
  useEffect(() => {
    fetchRecords();
  }, []);

  /* 5. دالة معالجة إرسال وحفظ سجل طبي جديد في قاعدة البيانات (POST Request) */
  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault(); // منع المتصفح من إعادة تحميل الصفحة عند الإرسال
    
    // التحقق من أن الحقول الإلزامية تمت تعبئتها
    if (!patientName || !diagnosis || !physician) {
      alert(t("patientModal.errors.requiredFields", "Please complete all mandatory entries."));
      return;
    }

    try {
      // إرسال كائن البيانات الجديد إلى السيرفر
      const response = await apiClient.post("/medical-records", {
        patientName,
        diagnosis,
        treatment,
        physician
      });
      
      // في حال نجاح الحفظ، يتم تحديث المصفوفة محلياً لتظهر في الجدول فوراً
      if (response.data && response.data.success) {
        setRecords((prev) => [response.data.record, ...prev]);
        // تصفير حقول الإدخال لتجهيزها لسجل جديد
        setPatientName("");
        setDiagnosis("");
        setTreatment("");
        setPhysician("");
        // إظهار إشعار النجاح المؤقت لمدة 4 ثوانٍ
        setNotif(t("appointments.notifications.saved", "Medical chart successfully logged."));
        setTimeout(() => setNotif(null), 4000);
      }
    } catch (err) {
      console.error(err);
      alert(t("patientModal.errors.saveFailed", "Error saving the medical record."));
    }
  };

  // فحص اتجاه اللغة لتعديل طريقة عرض العناصر وتراصها
  const isRtl = i18n.language === "ar";

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="space-y-8 animate-in fade-in duration-300">
      
      {/* عنوان الصفحة الرئيسي والفرعي */}
      <div>
        <h2 className="text-3xl font-bold text-primary tracking-tight font-sans">
          {t("medicalRecords.title", "Patient Medical Records")}
        </h2>
        <p className="text-sm text-secondary mt-1">
          {t("medicalRecords.subtitle", "Access, document, and review historical clinical charts and diagnosis logs.")}
        </p>
      </div>

      {/* قسم عرض إشعارات النجاح أو الخطأ المنبثقة ديناميكياً */}
      {notif && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-500/20 text-emerald-800 text-sm font-semibold flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{notif}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-500/20 text-rose-800 text-sm font-semibold flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* 6. واجهة الاستمارة (Form): لادخال بيانات السجل الطبي الجديد */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-outline-variant h-fit">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary border-b border-slate-100 pb-3.5 mb-5 flex items-center gap-2">
            <FileSignature className="w-4.5 h-4.5" />
            <span>{t("medicalRecords.aiReport", "New Entry Sheet")}</span>
          </h3>

          <form onSubmit={handleCreateRecord} className="space-y-4 font-sans text-xs">
            {/* حقل اسم المريض */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface-variant block text-start">
                {t("patientModal.form.fullNameLabel", "Patient Full Name")}
              </label>
              <input
                type="text"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder={t("patientModal.form.fullNamePlaceholder", "e.g. Jane Doe")}
                className="w-full px-3.5 py-2.5 bg-surface border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm font-sans text-start"
              />
            </div>

            {/* حقل تفاصيل التشخيص المرضي */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface-variant block text-start">
                {t("medicalRecords.sections.diagnoses", "Diagnosis Description")}
              </label>
              <textarea
                required
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                rows={3}
                placeholder="..."
                className="w-full px-3.5 py-2.5 bg-surface border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-xs font-sans resize-none text-start"
              />
            </div>

            {/* حقل العلاج والأدوية الموصوفة */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface-variant block text-start">
                {t("medicalRecords.sections.medications", "Prescribed Treatment / Medications")}
              </label>
              <textarea
                value={treatment}
                onChange={(e) => setTreatment(e.target.value)}
                rows={3}
                placeholder="..."
                className="w-full px-3.5 py-2.5 bg-surface border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-xs font-sans resize-none text-start"
              />
            </div>

            {/* قائمة اختيار الطبيب المعالج المشرف */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface-variant block text-start">
                {t("appointments.table.doctor", "Attending Physician")}
              </label>
              <select
                required
                value={physician}
                onChange={(e) => setPhysician(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm font-sans cursor-pointer text-start"
              >
                <option value="" disabled>{t("appointments.form.selectDoctorPlaceholder", "Select practitioner")}</option>
                <option value="Dr. Alexander">Dr. Alexander</option>
                <option value="Dr. Sarah Taylor">Dr. Sarah Taylor</option>
                <option value="Dr. Michael Vance">Dr. Michael Vance</option>
              </select>
            </div>

            {/* زر حفظ السجل البرمجي */}
            <button
              type="submit"
              className="w-full bg-primary text-white py-3 rounded-lg font-bold text-xs hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{t("patientModal.buttons.save", "Commit Entry")}</span>
            </button>
          </form>
        </div>

        {/* 7. واجهة الجدول (Table): لعرض السجلات الطبية القديمة المخزنة بنظام شبكي */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-slate-50">
            <h4 className="text-base font-bold text-primary flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              <span>{t("medicalRecords.sections.history", "Archived Clinical Logs")}</span>
            </h4>
            <span className="text-xs text-secondary font-bold">
              {t("patients.table.exportButton", "Total Records")}: {records.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            {/* في حالة جاري التحميل من السيرفر */}
            {loading ? (
              <div className="p-16 text-center text-secondary text-xs uppercase tracking-widest font-semibold">
                {t("patients.table.loading", "Fetching database data records...")}
              </div>
            ) : records.length === 0 ? (
              /* في حال كانت قاعدة البيانات فارغة تماماً */
              <div className="p-16 text-center text-secondary font-semibold">
                {t("medicalRecords.noRecords", "No data rows populated inside this partition.")}
              </div>
            ) : (
              /* رسم جدول البيانات الحقيقي بعد انتهاء جلب البيانات */
              <table className="w-full border-collapse">
                <thead className="bg-[#f8fafc] border-b border-outline-variant">
                  <tr className="select-none">
                    <th className="px-5 py-3 text-xs font-bold text-secondary uppercase tracking-wider font-sans text-start">{t("patients.table.cols.chartId", "Chart ID")}</th>
                    <th className="px-5 py-3 text-xs font-bold text-secondary uppercase tracking-wider font-sans text-start">{t("medicalRecords.sections.diagnoses", "Diagnoses")}</th>
                    <th className="px-5 py-3 text-xs font-bold text-secondary uppercase tracking-wider font-sans text-start">{t("medicalRecords.sections.medications", "Treatments")}</th>
                    <th className="px-5 py-3 text-xs font-bold text-secondary uppercase tracking-wider font-sans text-start">{t("appointments.table.doctor", "Physician")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant font-sans text-xs">
                  
                  {/* تكرار (Loop) عبر السجلات الطبية لرسم كل سطر مستقل بالجدول */}
                  {records.map((item) => (
                    <tr key={item.id} className="hover:bg-primary/5 transition-colors cursor-pointer">
                      <td className="px-5 py-4 text-start">
                        <span className="font-mono text-[10px] font-semibold text-secondary bg-slate-50 py-0.5 px-1.5 rounded border border-outline-variant">
                          {item.id}
                        </span>
                        <p className="font-bold text-on-surface mt-1.5">{item.patientName}</p>
                      </td>
                      <td className="px-5 py-4 font-semibold text-on-surface max-w-xs leading-relaxed text-start">
                        {item.diagnosis}
                      </td>
                      <td className="px-5 py-4 text-xs text-on-surface-variant max-w-xs leading-relaxed text-start">
                        {item.treatment}
                      </td>
                      <td className="px-5 py-4 font-semibold text-secondary text-start">
                        {item.physician}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* تذييل حماية البيانات والخصوصية القانونية بأسفل الجدول */}
          <div className="px-6 py-4 bg-slate-50 border-t border-outline-variant text-[11px] text-secondary font-bold flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-secondary scale-90" />
            <span>{t("patients.table.loading", "Secure repository view subject to internal auditing protocols.")}</span>
          </div>
        </div>

      </div>

    </div>
  );
}