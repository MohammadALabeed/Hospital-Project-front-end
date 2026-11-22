import React, { useState } from "react";
import { isAxiosError } from "axios";
import { Loader2, Save, ShieldAlert, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../api.js";
import { PatientRecord } from "../types.js";

interface PatientModalProps {
  onClose: () => void;
  onSaveSuccess: (patient: PatientRecord | null) => void;
}

const isPatientRecord = (value: unknown): value is PatientRecord => {
  if (!value || typeof value !== "object") return false;
  const patient = value as Record<string, unknown>;
  return (
    (typeof patient.PatientID === "number" || typeof patient.PatientID === "string") &&
    (typeof patient.UserID === "number" || typeof patient.UserID === "string") &&
    (typeof patient.BloodType === "string" || patient.BloodType === null)
  );
};

const getApiError = (error: unknown): string | null => {
  if (!isAxiosError(error)) return null;
  const data: unknown = error.response?.data;
  if (!data || typeof data !== "object") return null;
  const responseData = data as Record<string, unknown>;
  const detail = responseData.message ?? responseData.errors ?? responseData.error;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "message" in item) {
          return String(item.message);
        }
        return "";
      })
      .filter(Boolean)
      .join("; ");
  }
  return null;
};

const bloodTypes = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const inputClassName =
  "w-full rounded-lg border border-outline-variant bg-surface px-3.5 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary";

interface PatientFormData {
  FirstName: string;
  LastName: string;
  Username: string;
  Email: string;
  Password: string;
  DateOfBirth: string;
  Gender: string;
  Address: string;
  BloodType: string;
}

interface PatientCreatePayload extends Omit<PatientFormData, "Gender"> {
  Gender: "Male" | "Female";
}

const initialFormData: PatientFormData = {
  FirstName: "",
  LastName: "",
  Username: "",
  Email: "",
  Password: "",
  DateOfBirth: "",
  Gender: "",
  Address: "",
  BloodType: "",
};

const patientTextFields: Array<{
  name: keyof PatientFormData;
  type: "text" | "email" | "password" | "date";
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}> = [
  { name: "FirstName", type: "text", maxLength: 74 },
  { name: "LastName", type: "text", maxLength: 75 },
  { name: "Username", type: "text", minLength: 3, maxLength: 50, pattern: "[A-Za-z0-9]+" },
  { name: "Email", type: "email", maxLength: 100 },
  { name: "Password", type: "password", minLength: 8 },
  { name: "DateOfBirth", type: "date" },
  { name: "Address", type: "text", maxLength: 255 },
];

export default function PatientModal({
  onClose,
  onSaveSuccess,
}: PatientModalProps) {
  const { t, i18n } = useTranslation();
  const [formData, setFormData] = useState<PatientFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const updateField = (field: keyof PatientFormData, value: string) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      Object.entries(formData).some(
        ([field, value]) => field !== "Address" && !value.trim(),
      ) ||
      (formData.Gender !== "Male" && formData.Gender !== "Female")
    ) {
      setErrorMsg(t("patientModal.errors.requiredFields"));
      return;
    }

    const payload: PatientCreatePayload = {
      FirstName: formData.FirstName.trim(),
      LastName: formData.LastName.trim(),
      Email: formData.Email,
      Username: formData.Username,
      Password: formData.Password,
      DateOfBirth: formData.DateOfBirth,
      Gender: formData.Gender,
      Address: formData.Address,
      BloodType: formData.BloodType,
    };

    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await apiClient.post("/patients", payload);
      const createdPatient: unknown = response.data?.data;
      onSaveSuccess(isPatientRecord(createdPatient) ? createdPatient : null);
    } catch (error) {
      console.error("Failed to create patient:", error);
      setErrorMsg(getApiError(error) ?? t("patientModal.errors.saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="patient-modal-title"
        dir={i18n.language === "ar" ? "rtl" : "ltr"}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-outline-variant bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-outline-variant bg-slate-50 px-6 py-5">
          <div>
            <h2 id="patient-modal-title" className="text-xl font-bold text-primary">
              {t("patientModal.title")}
            </h2>
            <p className="mt-1 text-sm text-secondary">{t("patientModal.subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("patientModal.buttons.cancel")}
            className="rounded-lg p-2 text-secondary transition-colors hover:bg-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {errorMsg && (
            <div role="alert" className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-50 p-3 text-sm font-semibold text-rose-800">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {patientTextFields.map(({ name, type, minLength, maxLength, pattern }) => (
              <div key={name} className="space-y-1.5">
                <label
                  htmlFor={`patient-${name}`}
                  className="block text-sm font-semibold text-on-surface-variant"
                >
                  {t(`patientModal.form.${name}Label`)}
                </label>
                <input
                  id={`patient-${name}`}
                  name={name}
                  type={type}
                  required={name !== "Address"}
                  minLength={minLength}
                  maxLength={maxLength}
                  pattern={pattern}
                  autoComplete={name === "Password" ? "new-password" : undefined}
                  value={formData[name]}
                  onChange={(event) => updateField(name, event.target.value)}
                  placeholder={t(`patientModal.form.${name}Placeholder`)}
                  className={inputClassName}
                />
              </div>
            ))}

            <div className="space-y-1.5">
              <label htmlFor="patient-Gender" className="block text-sm font-semibold text-on-surface-variant">
                {t("patientModal.form.GenderLabel")}
              </label>
              <select
                id="patient-Gender"
                name="Gender"
                required
                value={formData.Gender}
                onChange={(event) => updateField("Gender", event.target.value)}
                className={inputClassName}
              >
                <option value="">{t("patientModal.form.GenderPlaceholder")}</option>
                <option value="Male">{t("patientModal.gender.male")}</option>
                <option value="Female">{t("patientModal.gender.female")}</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="patient-BloodType" className="block text-sm font-semibold text-on-surface-variant">
                {t("patientModal.form.BloodTypeLabel")}
              </label>
              <select
                id="patient-BloodType"
                name="BloodType"
                required
                value={formData.BloodType}
                onChange={(event) => updateField("BloodType", event.target.value)}
                className={inputClassName}
              >
                <option value="">{t("patientModal.form.BloodTypePlaceholder")}</option>
                {bloodTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <footer className="flex justify-end gap-3 border-t border-outline-variant pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-bold text-secondary transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              {t("patientModal.buttons.cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t("patientModal.buttons.save")}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
