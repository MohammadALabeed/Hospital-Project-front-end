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

export default function PatientModal({
  onClose,
  onSaveSuccess,
}: PatientModalProps) {
  const { t, i18n } = useTranslation();
  const [userId, setUserId] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedUserId = Number(userId);
    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0 || !bloodType) {
      setErrorMsg(t("patientModal.errors.requiredFields"));
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await apiClient.post("/patients", {
        UserID: parsedUserId,
        BloodType: bloodType,
      });
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

          <div className="space-y-1.5">
            <label htmlFor="patient-user-id" className="block text-sm font-semibold text-on-surface-variant">
              {t("patientModal.form.userIdLabel")}
            </label>
            <input
              id="patient-user-id"
              type="number"
              min="1"
              step="1"
              required
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              placeholder={t("patientModal.form.userIdPlaceholder")}
              className="w-full rounded-lg border border-outline-variant bg-surface px-3.5 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="patient-blood-type" className="block text-sm font-semibold text-on-surface-variant">
              {t("patientModal.form.bloodTypeLabel")}
            </label>
            <select
              id="patient-blood-type"
              required
              value={bloodType}
              onChange={(event) => setBloodType(event.target.value)}
              className="w-full rounded-lg border border-outline-variant bg-surface px-3.5 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary"
            >
              <option value="">{t("patientModal.form.bloodTypePlaceholder")}</option>
              {bloodTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
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
