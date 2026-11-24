import React, { useState } from "react";
import { isAxiosError } from "axios";
import { Loader2, Save, ShieldAlert, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../api.js";
import { RoleID } from "../types.js";

interface DoctorModalProps {
  onClose: () => void;
  onCreated: () => void;
}

interface DoctorFormData {
  Username: string;
  Password: string;
  FullName: string;
  Email: string;
  Address: string;
  DateOfBirth: string;
  Gender: "Male" | "Female" | "";
  Specialization: string;
  ClinicNumber: string;
}

const getValidationError = (formData: DoctorFormData): string | null => {
  const username = formData.Username.trim();
  if (username.length < 3 || username.length > 50 || !/^[A-Za-z0-9]+$/.test(username)) {
    return "doctors.errors.usernameInvalid";
  }
  if (formData.Password.length < 8) return "doctors.errors.passwordTooShort";

  const fullName = formData.FullName.trim();
  if (!fullName || fullName.length > 100) return "doctors.errors.fullNameInvalid";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.Email.trim())) {
    return "doctors.errors.emailInvalid";
  }
  if (!formData.DateOfBirth || Number.isNaN(Date.parse(formData.DateOfBirth))) {
    return "doctors.errors.dateOfBirthInvalid";
  }
  if (formData.Gender !== "Male" && formData.Gender !== "Female") {
    return "doctors.errors.genderInvalid";
  }

  const specialization = formData.Specialization.trim();
  if (!specialization || specialization.length > 100) {
    return "doctors.errors.specializationInvalid";
  }
  const clinicNumber = formData.ClinicNumber.trim();
  if (!clinicNumber || clinicNumber.length > 20) {
    return "doctors.errors.clinicNumberInvalid";
  }
  return null;
};

const initialFormData: DoctorFormData = {
  Username: "",
  Password: "",
  FullName: "",
  Email: "",
  Address: "",
  DateOfBirth: "",
  Gender: "",
  Specialization: "",
  ClinicNumber: "",
};

const inputClassName =
  "w-full rounded-lg border border-outline-variant bg-surface px-3.5 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary";

const getCreatedUserId = (value: unknown): number | null => {
  if (!value || typeof value !== "object") return null;
  const data = (value as Record<string, unknown>).data;
  if (!data || typeof data !== "object") return null;
  const userId = (data as Record<string, unknown>).UserID;
  return typeof userId === "number" && Number.isInteger(userId) && userId > 0
    ? userId
    : null;
};

export default function DoctorModal({ onClose, onCreated }: DoctorModalProps) {
  const { t, i18n } = useTranslation();
  const [formData, setFormData] = useState(initialFormData);
  const [createdUserId, setCreatedUserId] = useState<number | null>(null);
  const [personalInfoCreated, setPersonalInfoCreated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const updateField = <K extends keyof DoctorFormData>(
    field: K,
    value: DoctorFormData[K],
  ) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = getValidationError(formData);
    if (validationError) {
      setErrorMsg(t(validationError));
      return;
    }

    let failedStep: "user" | "personalInfo" | "doctor" = "user";
    setLoading(true);
    setErrorMsg(null);
    try {
      let userId = createdUserId;
      if (userId === null) {
        const userResponse = await apiClient.post("/users", {
          Username: formData.Username.trim(),
          Password: formData.Password,
          RoleID: RoleID.Doctor,
        });
        userId = getCreatedUserId(userResponse.data);
        if (userId === null) {
          throw new Error("The server did not return the created user's ID.");
        }
        setCreatedUserId(userId);
      }

      if (!personalInfoCreated) {
        failedStep = "personalInfo";
        await apiClient.post("/personal-info", {
          UserID: userId,
          FullName: formData.FullName.trim(),
          Email: formData.Email.trim(),
          Address: formData.Address.trim(),
          DateOfBirth: formData.DateOfBirth,
          Gender: formData.Gender,
        });
        setPersonalInfoCreated(true);
      }

      failedStep = "doctor";
      await apiClient.post("/doctors", {
        UserID: userId,
        Specialization: formData.Specialization.trim(),
        ClinicNumber: formData.ClinicNumber.trim(),
      });
      onCreated();
    } catch (error) {
      console.error(`Failed to create doctor during ${failedStep} step:`, error);
      const serverMessage = isAxiosError(error)
        ? error.response?.data?.message || error.response?.data?.error
        : null;
      if (typeof serverMessage === "string" && serverMessage.trim()) {
        setErrorMsg(serverMessage);
      } else if (error instanceof Error && error.message) {
        setErrorMsg(error.message);
      } else {
        setErrorMsg(t(`doctors.errors.${failedStep}CreateFailed`));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="doctor-modal-title"
        dir={i18n.language.startsWith("ar") ? "rtl" : "ltr"}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-outline-variant bg-white shadow-2xl"
      >
        <header className="sticky top-0 flex items-center justify-between gap-4 border-b border-outline-variant bg-slate-50 px-6 py-5">
          <div>
            <h2 id="doctor-modal-title" className="text-xl font-bold text-primary">
              {t("doctors.form.title")}
            </h2>
            <p className="mt-1 text-sm text-secondary">{t("doctors.form.subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label={t("doctors.form.close")}
            className="shrink-0 rounded-lg p-2 text-secondary transition-colors hover:bg-slate-200 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <form noValidate onSubmit={handleSubmit} className="space-y-5 p-6">
          {errorMsg && (
            <div role="alert" className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-50 p-3 text-sm font-semibold text-rose-800">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {([
              ["Username", "text", 50],
              ["Password", "password", undefined],
              ["FullName", "text", 100],
              ["Email", "email", undefined],
              ["Address", "text", undefined],
              ["DateOfBirth", "date", undefined],
              ["Specialization", "text", 100],
              ["ClinicNumber", "text", 20],
            ] as const).map(([field, type, maxLength]) => (
              <div key={field} className="space-y-1.5">
                <label
                  htmlFor={`doctor-${field}`}
                  className="block text-sm font-semibold text-on-surface-variant"
                >
                  {t(`doctors.form.${field}`)}
                </label>
                <input
                  id={`doctor-${field}`}
                  name={field}
                  type={type}
                  required={field !== "Address"}
                  maxLength={maxLength}
                  pattern={field === "Username" ? "[A-Za-z0-9]+" : undefined}
                  disabled={
                    loading ||
                    (createdUserId !== null &&
                      (field === "Username" || field === "Password"))
                  }
                  autoComplete={
                    field === "Password"
                      ? "new-password"
                      : field === "Username"
                        ? "username"
                        : undefined
                  }
                  value={formData[field]}
                  onChange={(event) => updateField(field, event.target.value)}
                  placeholder={t(`doctors.form.${field}Placeholder`)}
                  className={inputClassName}
                />
              </div>
            ))}

            <div className="space-y-1.5">
              <label htmlFor="doctor-Gender" className="block text-sm font-semibold text-on-surface-variant">
                {t("doctors.form.Gender")}
              </label>
              <select
                id="doctor-Gender"
                required
                disabled={loading}
                value={formData.Gender}
                onChange={(event) => {
                  if (event.target.value === "Male" || event.target.value === "Female") {
                    updateField("Gender", event.target.value);
                  }
                }}
                className={inputClassName}
              >
                <option value="">{t("doctors.form.genderPlaceholder")}</option>
                <option value="Male">{t("patientModal.gender.male")}</option>
                <option value="Female">{t("patientModal.gender.female")}</option>
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
              {t("doctors.form.cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t("doctors.form.save")}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
