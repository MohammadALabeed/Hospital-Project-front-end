import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Pencil, Plus, ShieldAlert, Trash2, Users, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../api.js";
import { RoleID, type PatientRecord, type UserSession } from "../types.js";
import PatientModal from "./PatientModal.jsx";

interface PatientsProps {
  user: UserSession;
  searchTerm: string;
}

const isPatientRecord = (value: unknown): value is PatientRecord => {
  if (!value || typeof value !== "object") return false;
  const patient = value as Record<string, unknown>;
  return (
    (typeof patient.PatientID === "number" || typeof patient.PatientID === "string") &&
    (typeof patient.UserID === "number" || typeof patient.UserID === "string") &&
    (patient.PatientName === undefined ||
      typeof patient.PatientName === "string" ||
      patient.PatientName === null) &&
    (typeof patient.BloodType === "string" || patient.BloodType === null)
  );
};

const getPatientKey = (patientId: PatientRecord["PatientID"]) => String(patientId);

export default function Patients({ user, searchTerm }: PatientsProps) {
  const { t, i18n } = useTranslation();
  const isAdmin = user.roleId === RoleID.Admin;
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [editingBloodType, setEditingBloodType] = useState("");
  const [workingPatientId, setWorkingPatientId] = useState<string | null>(null);

  const fetchPatients = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await apiClient.get("/patients");
      if (!Array.isArray(response.data) || !response.data.every(isPatientRecord)) {
        setErrorMsg("patients.errors.schemaError");
        return;
      }
      setPatients(response.data);
    } catch (error) {
      console.error("Failed to retrieve patients:", error);
      setErrorMsg("patients.errors.fetchFailed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPatients();
  }, []);

  const filteredPatients = useMemo(() => {
    const query = typeof searchTerm === "string" ? searchTerm.trim().toLocaleLowerCase() : "";
    if (!query) return patients;
    return patients.filter((patient) =>
      [patient.PatientID, patient.UserID, patient.BloodType, ...Object.values(patient)]
        .some((value) => String(value ?? "").toLocaleLowerCase().includes(query)),
    );
  }, [patients, searchTerm]);

  const showNotification = (messageKey: string) => {
    setNotification(messageKey);
    window.setTimeout(() => setNotification(null), 4000);
  };

  const handlePatientCreated = (patient: PatientRecord | null) => {
    if (patient) {
      setPatients((previousPatients) => [
        patient,
        ...previousPatients.filter(
          (existingPatient) =>
            getPatientKey(existingPatient.PatientID) !== getPatientKey(patient.PatientID),
        ),
      ]);
    } else {
      void fetchPatients();
    }
    setShowModal(false);
    showNotification("patients.notifications.created");
  };

  const beginEditing = (patient: PatientRecord) => {
    setEditingPatientId(getPatientKey(patient.PatientID));
    setEditingBloodType(patient.BloodType ?? "");
    setActionError(null);
  };

  const handleUpdateBloodType = async (patient: PatientRecord) => {
    const patientKey = getPatientKey(patient.PatientID);
    const bloodType = editingBloodType.trim();
    if (!bloodType) {
      setActionError("patients.errors.bloodTypeRequired");
      return;
    }

    setWorkingPatientId(patientKey);
    setActionError(null);
    try {
      const response = await apiClient.put(`/patients/${patient.PatientID}`, {
        BloodType: bloodType,
      });
      const updatedPatient: unknown = response.data?.data;
      setPatients((previousPatients) =>
        previousPatients.map((currentPatient) =>
          getPatientKey(currentPatient.PatientID) === patientKey
            ? isPatientRecord(updatedPatient)
              ? updatedPatient
              : { ...currentPatient, BloodType: bloodType }
            : currentPatient,
        ),
      );
      setEditingPatientId(null);
      showNotification("patients.notifications.updated");
    } catch (error) {
      console.error("Failed to update patient blood type:", error);
      setActionError("patients.errors.updateFailed");
    } finally {
      setWorkingPatientId(null);
    }
  };

  const handleDeletePatient = async (patient: PatientRecord) => {
    if (!isAdmin) return;
    const patientKey = getPatientKey(patient.PatientID);
    setWorkingPatientId(patientKey);
    setActionError(null);
    try {
      await apiClient.delete(`/patients/${patient.PatientID}`);
      setPatients((previousPatients) =>
        previousPatients.filter(
          (currentPatient) => getPatientKey(currentPatient.PatientID) !== patientKey,
        ),
      );
      if (editingPatientId === patientKey) setEditingPatientId(null);
      showNotification("patients.notifications.deleted");
    } catch (error) {
      console.error("Failed to delete patient:", error);
      setActionError("patients.errors.deleteFailed");
    } finally {
      setWorkingPatientId(null);
    }
  };

  const bloodTypes = [
    "A+",
    "A-",
    "B+",
    "B-",
    "O+",
    "O-",
    "AB+",
    "AB-",
  ];

  return (
    <div
      dir={i18n.language.startsWith("ar") ? "rtl" : "ltr"}
      className="space-y-8 animate-in fade-in duration-300"
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">
            {t("patients.header.title")}
          </h2>
          <p className="mt-1 text-sm text-secondary">{t("patients.header.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-xs font-bold text-white shadow-md transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          {t("patients.header.registerButton")}
        </button>
      </header>

      {notification && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <span>{t(notification)}</span>
        </div>
      )}

      {(errorMsg || actionError) && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-50 p-4 text-sm font-semibold text-rose-800">
          <ShieldAlert className="h-5 w-5 shrink-0 text-rose-600" />
          <span>{t(actionError ?? errorMsg ?? "patients.errors.fetchFailed")}</span>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-outline-variant bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-outline-variant bg-slate-50/50 px-6 py-4">
          <h3 className="flex items-center gap-2 text-base font-bold text-on-surface">
            <Users className="h-5 w-5 text-primary" />
            {t("patients.table.directoryTitle")}
          </h3>
          <span className="text-xs font-bold text-secondary">
            {t("patients.table.total", { count: patients.length })}
          </span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div role="status" className="p-16 text-center text-sm font-semibold text-secondary">
              {t("patients.table.loading")}
            </div>
          ) : errorMsg ? (
            <div className="p-16 text-center">
              <button
                type="button"
                onClick={() => void fetchPatients()}
                className="text-sm font-bold text-primary underline"
              >
                {t("patients.table.retry")}
              </button>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-16 text-center text-sm font-semibold text-secondary">
              {t("patients.table.noResults", { term: typeof searchTerm === "string" ? searchTerm : "" })}
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead className="border-b border-outline-variant bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-start text-xs font-bold uppercase tracking-wider text-secondary">
                    {t("patients.table.cols.patientName")}
                  </th>
                  <th className="px-6 py-4 text-start text-xs font-bold uppercase tracking-wider text-secondary">
                    {t("patients.table.cols.userId")}
                  </th>
                  <th className="px-6 py-4 text-start text-xs font-bold uppercase tracking-wider text-secondary">
                    {t("patients.table.cols.bloodType")}
                  </th>
                  <th className="px-6 py-4 text-start text-xs font-bold uppercase tracking-wider text-secondary">
                    {t("patients.table.cols.action")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredPatients.map((patient) => {
                  const patientKey = getPatientKey(patient.PatientID);
                  const isEditing = editingPatientId === patientKey;
                  const isWorking = workingPatientId === patientKey;
                  return (
                    <tr key={patientKey} className="transition-colors hover:bg-primary/5">
                      <td className="px-6 py-4 text-start font-mono text-sm font-bold text-primary">
                        {patient.PatientName?.trim() ? (
                          <span className="inline-flex flex-wrap items-baseline gap-1.5">
                            <span dir="auto" className="font-sans text-on-surface">
                              {patient.PatientName}
                            </span>
                            <span>#{patient.PatientID}</span>
                          </span>
                        ) : (
                          `#${patient.PatientID}`
                        )}
                      </td>
                      <td className="px-6 py-4 text-start font-semibold text-on-surface">
                        {patient.UserID}
                      </td>
                      <td className="px-6 py-4 text-start">
                        {isEditing ? (
                          <select
                            aria-label={t("patients.actions.editBloodType")}
                            value={editingBloodType}
                            onChange={(event) => setEditingBloodType(event.target.value)}
                            className="rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="">{t("patientModal.form.bloodTypePlaceholder")}</option>
                            {bloodTypes.map((bloodType) => (
                              <option key={bloodType} value={bloodType}>
                                {bloodType}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="inline-flex rounded-full border border-rose-500/15 bg-rose-50 px-3 py-1 text-sm font-bold text-rose-800">
                            {patient.BloodType || t("patients.table.unknownBloodType")}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-start">
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => void handleUpdateBloodType(patient)}
                                disabled={isWorking}
                                aria-label={t("patients.actions.save")}
                                className="rounded-lg p-2 text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-50"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingPatientId(null)}
                                disabled={isWorking}
                                aria-label={t("patients.actions.cancel")}
                                className="rounded-lg p-2 text-secondary transition-colors hover:bg-slate-100 disabled:opacity-50"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => beginEditing(patient)}
                              disabled={Boolean(workingPatientId)}
                              aria-label={t("patients.actions.editBloodType")}
                              className="rounded-lg p-2 text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => void handleDeletePatient(patient)}
                              disabled={Boolean(workingPatientId)}
                              aria-label={t("patients.actions.delete")}
                              className="rounded-lg p-2 text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="border-t border-outline-variant bg-slate-50 px-6 py-4 text-xs font-semibold text-secondary">
          {t("patients.table.footerCount", {
            filtered: filteredPatients.length,
            total: patients.length,
          })}
        </div>
      </section>

      {showModal && (
        <PatientModal
          onClose={() => setShowModal(false)}
          onSaveSuccess={handlePatientCreated}
        />
      )}
    </div>
  );
}
