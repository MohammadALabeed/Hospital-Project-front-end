import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Pencil, Plus, ShieldAlert, Trash2, Users } from "lucide-react";
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

interface PersonalInfoRecord {
  PersonalInfoID: number | string;
  UserID: number | string;
  FullName?: string | null;
  Email?: string | null;
  Address?: string | null;
  DateOfBirth?: string | null;
  Gender?: string | null;
}

const isPersonalInfoRecord = (value: unknown): value is PersonalInfoRecord => {
  if (!value || typeof value !== "object") return false;
  const personalInfo = value as Record<string, unknown>;
  const optionalStringFields = [
    "FullName",
    "Email",
    "Address",
    "DateOfBirth",
    "Gender",
  ];
  return (
    (typeof personalInfo.PersonalInfoID === "number" ||
      typeof personalInfo.PersonalInfoID === "string") &&
    (typeof personalInfo.UserID === "number" || typeof personalInfo.UserID === "string") &&
    optionalStringFields.every(
      (field) =>
        personalInfo[field] === undefined ||
        personalInfo[field] === null ||
        typeof personalInfo[field] === "string",
    )
  );
};

export default function Patients({ user, searchTerm }: PatientsProps) {
  const { t, i18n } = useTranslation();
  const isAdmin = user.roleId === RoleID.Admin;
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientRecord | null>(null);
  const [editingPersonalInfoId, setEditingPersonalInfoId] = useState<string | null>(null);
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
    const sortedPatients = [...patients].sort(
      (firstPatient, secondPatient) =>
        Number(firstPatient.PatientID) - Number(secondPatient.PatientID),
    );
    const query = typeof searchTerm === "string" ? searchTerm.trim().toLocaleLowerCase() : "";
    if (!query) return sortedPatients;
    return sortedPatients.filter((patient) =>
      [patient.PatientID, patient.UserID, patient.BloodType, ...Object.values(patient)]
        .some((value) => String(value ?? "").toLocaleLowerCase().includes(query)),
    );
  }, [patients, searchTerm]);

  const getPatientName = (patient: PatientRecord) => {
    const firstAndLastName = [patient.FirstName, patient.LastName]
      .filter((name): name is string => typeof name === "string" && name.trim() !== "")
      .join(" ");
    return patient.PatientName?.trim() || firstAndLastName;
  };

  const showNotification = (messageKey: string) => {
    setNotification(messageKey);
    window.setTimeout(() => setNotification(null), 4000);
  };

  const handlePatientSaved = (patient: PatientRecord | null) => {
    if (patient) {
      setPatients((previousPatients) => {
        const patientExists = previousPatients.some(
          (existingPatient) =>
            getPatientKey(existingPatient.PatientID) === getPatientKey(patient.PatientID),
        );
        return patientExists
          ? previousPatients.map((existingPatient) =>
              getPatientKey(existingPatient.PatientID) === getPatientKey(patient.PatientID)
                ? patient
                : existingPatient,
            )
          : [patient, ...previousPatients];
      });
    } else {
      void fetchPatients();
    }
    setShowModal(false);
    setEditingPatient(null);
    setEditingPersonalInfoId(null);
    showNotification(editingPatient ? "patients.notifications.updated" : "patients.notifications.created");
  };

  const beginEditing = async (patient: PatientRecord) => {
    const patientKey = getPatientKey(patient.PatientID);
    setWorkingPatientId(patientKey);
    setActionError(null);
    try {
      const response = await apiClient.get("/personal-info");
      const personalInfoRecords: unknown = response.data;
      if (
        !Array.isArray(personalInfoRecords) ||
        !personalInfoRecords.every(isPersonalInfoRecord)
      ) {
        throw new Error("The server returned an unexpected personal information format.");
      }

      const personalInfo = personalInfoRecords.find(
        (record) => String(record.UserID) === String(patient.UserID),
      );
      if (!personalInfo) {
        throw new Error("No personal information record exists for this patient.");
      }

      const fullName = personalInfo.FullName ?? patient.FullName ?? patient.PatientName ?? "";
      setEditingPatient({
        ...patient,
        PersonalInfoID: personalInfo.PersonalInfoID,
        FullName: fullName,
        PatientName: fullName,
        Email: personalInfo.Email ?? patient.Email ?? "",
        Address: personalInfo.Address ?? patient.Address ?? "",
        DateOfBirth: personalInfo.DateOfBirth ?? patient.DateOfBirth ?? "",
        Gender: personalInfo.Gender ?? patient.Gender ?? "",
      });
      setEditingPersonalInfoId(String(personalInfo.PersonalInfoID));
      setShowModal(true);
    } catch (error) {
      console.error("Failed to retrieve patient personal information:", error);
      setActionError("patients.errors.personalInfoLookupFailed");
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
      if (editingPatient && getPatientKey(editingPatient.PatientID) === patientKey) {
        setEditingPatient(null);
        setEditingPersonalInfoId(null);
        setShowModal(false);
      }
      showNotification("patients.notifications.deleted");
    } catch (error) {
      console.error("Failed to delete patient:", error);
      setActionError("patients.errors.deleteFailed");
    } finally {
      setWorkingPatientId(null);
    }
  };

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
          onClick={() => {
            setEditingPatient(null);
            setEditingPersonalInfoId(null);
            setShowModal(true);
          }}
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
                    {t("patients.table.cols.email")}
                  </th>
                  <th className="px-6 py-4 text-start text-xs font-bold uppercase tracking-wider text-secondary">
                    {t("patients.table.cols.address")}
                  </th>
                  <th className="px-6 py-4 text-start text-xs font-bold uppercase tracking-wider text-secondary">
                    {t("patients.table.cols.dateOfBirth")}
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
                {filteredPatients.map((patient, index) => {
                  const patientKey = getPatientKey(patient.PatientID);
                  const isWorking = workingPatientId === patientKey;
                  return (
                    <tr key={patientKey} className="transition-colors hover:bg-primary/5">
                      <td className="px-6 py-4 text-start font-mono text-sm font-bold text-primary">
                        {getPatientName(patient) ? (
                          <span className="inline-flex flex-wrap items-baseline gap-1.5">
                            <span dir="auto" className="font-sans text-on-surface">
                              {getPatientName(patient)}
                            </span>
                            <span>#{index + 1}</span>
                          </span>
                        ) : (
                          `#${index + 1}`
                        )}
                      </td>
                      <td className="px-6 py-4 text-start font-semibold text-on-surface">
                        <span dir="auto">{patient.Email || t("patients.table.notProvided")}</span>
                      </td>
                      <td className="px-6 py-4 text-start font-semibold text-on-surface">
                        <span dir="auto">
                          {typeof patient.Address === "string" && patient.Address.trim()
                            ? patient.Address
                            : t("patients.table.notProvided")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-start font-semibold text-on-surface">
                        {patient.DateOfBirth || t("patients.table.notProvided")}
                      </td>
                      <td className="px-6 py-4 text-start">
                        <span className="inline-flex rounded-full border border-rose-500/15 bg-rose-50 px-3 py-1 text-sm font-bold text-rose-800">
                          {patient.BloodType || t("patients.table.unknownBloodType")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-start">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void beginEditing(patient)}
                            disabled={Boolean(workingPatientId)}
                            aria-label={t("patients.actions.editPatient")}
                            className="rounded-lg p-2 text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
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
          onSaveSuccess={handlePatientSaved}
          patient={editingPatient ?? undefined}
          personalInfoId={editingPersonalInfoId ?? undefined}
        />
      )}
    </div>
  );
}
