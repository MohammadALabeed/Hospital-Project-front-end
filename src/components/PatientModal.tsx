//نافذة المودال لإدخال بيانات المريض الجديدة وفتح ملفه الطبي في المستشفى

import React, { useState } from "react";
// استيراد الأيقونات اللازمة لواجهات الإدخال والتحذيرات وحفظ البيانات
import {
  X,
  User,
  Lock,
  Mail,
  Calendar,
  MapPin,
  Database,
  Save,
  Heart,
  ShieldAlert,
} from "lucide-react";
// أداة الترجمة لتهيئة الواجهة للغتين العربية والإنجليزية
import { useTranslation } from "react-i18next";
// عميل الـ API لإرسال الطلبات للباك اند
import { apiClient } from "../api.js";
// استيراد واجهة المريض (TypeScript Type)
import { Patient } from "../types.js";

/* تعريف الـ Props المستقبلة من المكون الأب للتحكم بفتح وإغلاق النافذة وتحديث البيانات */
interface PatientModalProps {
  onClose: () => void; // دالة إغلاق المودال
  onSaveSuccess: (patient: Patient) => void; // دالة تحديث قائمة المرضى بعد الحفظ الموفق
}

export default function PatientModal({
  onClose,
  onSaveSuccess,
}: PatientModalProps) {
  const { t, i18n } = useTranslation();

  /* 1. حالات الذاكرة لبيانات الحساب الاختيارية */
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  /* 2. حالات الذاكرة للبيانات الشخصية والديموغرافية للمريض */
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [gender, setGender] = useState<"Male" | "Female" | "Other">("Male");

  /* 3. حالات الذاكرة للبيانات الطبية الحيوية */
  const [bloodType, setBloodType] = useState("");

  // حالات إدارة التحميل وعرض الأخطاء
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* دالة معالجة النموذج وإرسال ملف المريض الجديد للسيرفر */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // منع السلوك الافتراضي لإرسال النموذج

    // التحقق من تعبئة كافة الحقول الإلزامية والمطلوبة طبياً
    if (!fullName || !email || !dob || !address || !gender || !bloodType) {
      setErrorMsg(
        t(
          "patientModal.errors.requiredFields",
          "Please complete all required demographic and clinical fields.",
        ),
      );
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    // تجهيز كائن البيانات (Payload) مع معالجة الحقول الاختيارية لتجنب إرسال نصوص فارغة
    const payload = {
      username: username || undefined,
      password: password || undefined,
      fullName,
      email,
      address,
      dob,
      gender,
      bloodType,
    };

    try {
      // إرسال البيانات عبر طلب POST لمسار المرضى
      const response = await apiClient.post("/patients", payload);
      if (response.data && response.data.success) {
        onSaveSuccess(response.data.patient); // تمرير المريض الجديد للمكون الأب لتحديث الجدول فوراً
        onClose(); // إغلاق النافذة المنبثقة
      } else {
        setErrorMsg(
          t(
            "patientModal.errors.saveFailed",
            "Failed to commit patient file to the directory.",
          ),
        );
      }
    } catch (err: any) {
      console.error("Clinical record write error:", err);
      // استخلاص رسالة الخطأ المحددة من السيرفر إن وجدت، أو عرض رسالة شبكة عامة
      if (err.response && err.response.data && err.response.data.error) {
        setErrorMsg(err.response.data.error);
      } else {
        setErrorMsg(
          t(
            "patientModal.errors.networkError",
            "Service unavailable. Unable to reach backend repository.",
          ),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const isRtl = i18n.language === "ar";

  return (
    // الخلفية المظلمة الشفافة للمودال مع تأثير الضباب (backdrop-blur)
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        dir={isRtl ? "rtl" : "ltr"}
        className="bg-white w-full sm:max-w-xl md:max-w-2xl max-h-[92%] flex flex-col shadow-2xl rounded-2xl overflow-hidden border border-outline-variant animate-in fade-in zoom-in-95 duration-200"
      >
        {/* هيدر المودال ويحتوي على العناوين وزر الإغلاق X */}
        <div className="px-8 py-5 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
          <div>
            <h2 className="text-xl font-bold text-primary">
              {t("patientModal.title", "Admission & Registration")}
            </h2>
            <p className="text-xs text-secondary mt-0.5">
              {t(
                "patientModal.subtitle",
                "Open a new hospital file and populate clinical attributes.",
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error-container/25 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* نموذج الإدخال (Form) */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 overflow-hidden"
        >
          {/* حاوية المدخلات القابلة للتمرير العمودي (Scrollable) */}
          <div className="overflow-y-auto px-8 py-7 space-y-8 flex-1">
            {/* عرض شريط الأخطاء في حال وجود مشكلة بالشبكة أو البيانات */}
            {errorMsg && (
              <div className="p-4 rounded-lg bg-error-container border border-error/20 flex gap-3 text-sm text-error items-center">
                <ShieldAlert className="w-5 h-5 text-error shrink-0" />
                <span className="font-semibold leading-relaxed">
                  {errorMsg}
                </span>
              </div>
            )}

            {/* القسم الأول: بيانات حساب البوابة الإلكترونية للمريض (اختياري) */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-primary border-b border-slate-100 pb-2">
                <Database className="w-4.5 h-4.5 text-primary-container" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                  {t(
                    "patientModal.sections.account",
                    "Portal Credentials (Optional)",
                  )}
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface-variant block">
                    {t("patientModal.form.usernameLabel", "Account Username")}
                  </label>
                  <div className="relative group">
                    <span className="absolute inset-y-0 inset-s-0 flex items-center pointer-events-none text-outline ps-3">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={t(
                        "patientModal.form.usernamePlaceholder",
                        "e.g. jdoe99",
                      )}
                      className="w-full py-2 bg-surface text-sm border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none ps-9 pe-3.5"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface-variant block">
                    {t("patientModal.form.passwordLabel", "Temporary Password")}
                  </label>
                  <div className="relative group">
                    <span className="absolute inset-y-0 inset-s-0 flex items-center pointer-events-none text-outline ps-3">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t(
                        "patientModal.form.passwordPlaceholder",
                        "••••••••",
                      )}
                      className="w-full py-2 bg-surface text-sm border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none ps-9 pe-3.5"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* القسم الثاني: البيانات الديموغرافية والشخصية للمريض (إلزامية) */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-primary border-b border-slate-100 pb-2">
                <User className="w-4.5 h-4.5 text-primary-container" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                  {t(
                    "patientModal.sections.demographics",
                    "Demographic Particulars",
                  )}
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* حقل الاسم الكامل */}
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-on-surface-variant block">
                    {t("patientModal.form.fullNameLabel", "Full Name")}{" "}
                    <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t(
                      "patientModal.form.fullNamePlaceholder",
                      "Jane Doe",
                    )}
                    className="w-full px-3.5 py-2 bg-surface text-sm border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                  />
                </div>

                {/* حقل البريد الإلكتروني */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface-variant block">
                    {t("patientModal.form.emailLabel", "Email Address")}{" "}
                    <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 inset-s-0 flex items-center pointer-events-none text-outline ps-3">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t(
                        "patientModal.form.emailPlaceholder",
                        "example@domain.com",
                      )}
                      className="w-full py-2 bg-surface text-sm border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none ps-9 pe-3.5"
                    />
                  </div>
                </div>

                {/* حقل تاريخ الميلاد */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface-variant block">
                    {t("patientModal.form.dobLabel", "Date of Birth")}{" "}
                    <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 inset-s-0 flex items-center pointer-events-none text-outline pe-3">
                      <Calendar className="w-4 h-4" />
                    </span>
                    <input
                      type="date"
                      required
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full py-2 bg-surface text-sm border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all cursor-pointer outline-none pe-9 ps-3.5"
                    />
                  </div>
                </div>

                {/* حقل السكن والإقامة الداعمة للغات (RTL/LTR) */}
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-on-surface-variant block">
                    {t("patientModal.form.addressLabel", "Permanent Residence")}{" "}
                    <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 inset-s-0 flex items-center pointer-events-none text-outline ps-3">
                      <MapPin className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder={t(
                        "patientModal.form.addressPlaceholder",
                        "Street Address, City, Region",
                      )}
                      className="w-full py-2 bg-surface text-sm border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none ps-9 pe-3.5"
                    />
                  </div>
                </div>

                {/* حقل أزرار الاختيار المخصصة لتحديد الجنس (Gender Radio Grid) */}
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-on-surface-variant block">
                    {t("patientModal.form.genderLabel", "Gender Designation")}{" "}
                    <span className="text-error">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(["Male", "Female", "Other"] as const).map((g) => {
                      const isChecked = gender === g;
                      return (
                        <label key={g} className="cursor-pointer">
                          <input
                            type="radio"
                            name="gender"
                            value={g}
                            checked={isChecked}
                            onChange={() => setGender(g)}
                            className="sr-only" // إخفاء زر الراديو الافتراضي من المتصفح لجمالية التصميم
                          />
                          {/* تصميم مخصص للراديو بناءً على ما إذا كان محدداً أم لا */}
                          <div
                            className={`p-3.5 border rounded-xl flex flex-col items-center justify-center transition-all ${
                              isChecked
                                ? "border-primary bg-primary/5 ring-2 ring-primary/20 text-primary"
                                : "border-outline-variant bg-surface text-secondary hover:bg-surface-container"
                            }`}
                          >
                            <span className="text-sm font-semibold tracking-wide">
                              {g === "Male"
                                ? t("patientModal.gender.male", "Male")
                                : g === "Female"
                                  ? t("patientModal.gender.female", "Female")
                                  : t("patientModal.gender.other", "Other")}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            {/* القسم الثالث: الفصيلة والمعلومات الطبية الحيوية */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-primary border-b border-slate-100 pb-2">
                <Heart className="w-4.5 h-4.5 text-primary-container" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                  {t("patientModal.sections.medical", "Vital Information")}
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* حقل فصيلة الدم */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface-variant block">
                    {t("patientModal.form.bloodTypeLabel", "Blood Group")}{" "}
                    <span className="text-error">*</span>
                  </label>
                  <select
                    required
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-surface text-sm border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none cursor-pointer"
                  >
                    <option value="" disabled>
                      {t(
                        "patientModal.form.bloodTypePlaceholder",
                        "Select Blood Type",
                      )}
                    </option>
                    <option value="A+">
                      {t("patientModal.bloodTypes.APlus", "A+ (A Positive)")}
                    </option>
                    <option value="A-">
                      {t("patientModal.bloodTypes.AMinus", "A- (A Negative)")}
                    </option>
                    <option value="B+">
                      {t("patientModal.bloodTypes.BPlus", "B+ (B Positive)")}
                    </option>
                    <option value="B-">
                      {t("patientModal.bloodTypes.BMinus", "B- (B Negative)")}
                    </option>
                    <option value="O+">
                      {t("patientModal.bloodTypes.OPlus", "O+ (O Positive)")}
                    </option>
                    <option value="O-">
                      {t("patientModal.bloodTypes.OMinus", "O- (O Negative)")}
                    </option>
                    <option value="AB+">
                      {t("patientModal.bloodTypes.ABPlus", "AB+ (AB Positive)")}
                    </option>
                    <option value="AB-">
                      {t(
                        "patientModal.bloodTypes.ABMinus",
                        "AB- (AB Negative)",
                      )}
                    </option>
                  </select>
                </div>
              </div>
            </section>
          </div>

          {/*(Footer) ويحتوي على أزرار التفاعل والإرسال */}
          <div className="px-8 py-5 border-t border-outline-variant bg-surface-container-low flex justify-end items-center gap-4">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-5 py-2 border border-outline text-secondary font-semibold text-sm rounded-lg hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50"
            >
              {t("patientModal.buttons.cancel", "Cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary text-white font-bold text-sm rounded-lg shadow-md hover:bg-primary/90 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{t("patientModal.buttons.save", "Commit File")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
