import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Plus, ShieldAlert, Stethoscope } from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../api.js";
import { RoleID, type UserSession } from "../types.js";
import DoctorModal from "./DoctorModal.jsx";

interface DoctorRecord {
  DoctorID: number | string;
  UserID: number | string;
  DoctorName?: string | null;
  Specialization: string;
  Specialty?: string | null;
}

interface PersonalInfoRecord {
  UserID: number | string;
  FullName?: string | null;
  Email?: string | null;
  Address?: string | null;
}

interface DoctorDirectoryEntry extends DoctorRecord {
  FullName: string;
  Email: string;
  Address: string;
}

interface DoctorsProps {
  user: UserSession;
  searchTerm: string;
}

const isDoctorRecord = (value: unknown): value is DoctorRecord => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    (typeof record.DoctorID === "number" || typeof record.DoctorID === "string") &&
    (typeof record.UserID === "number" || typeof record.UserID === "string") &&
    typeof (record.Specialization ?? record.Specialty) === "string" &&
    (record.DoctorName === undefined ||
      typeof record.DoctorName === "string" ||
      record.DoctorName === null)
  );
};

const isPersonalInfoRecord = (value: unknown): value is PersonalInfoRecord => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    (typeof record.UserID === "number" || typeof record.UserID === "string") &&
    ["FullName", "Email", "Address"].every(
      (field) =>
        record[field] === undefined ||
        record[field] === null ||
        typeof record[field] === "string",
    )
  );
};

export default function Doctors({ user, searchTerm }: DoctorsProps) {
  const { t, i18n } = useTranslation();
  const [doctors, setDoctors] = useState<DoctorDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const fetchDoctors = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [doctorsResponse, personalInfoResponse] = await Promise.all([
        apiClient.get("/doctors"),
        apiClient.get("/personal-info"),
      ]);
      const doctorRecords: unknown = doctorsResponse.data;
      const personalInfoRecords: unknown = personalInfoResponse.data;
      if (
        !Array.isArray(doctorRecords) ||
        !doctorRecords.every(isDoctorRecord) ||
        !Array.isArray(personalInfoRecords) ||
        !personalInfoRecords.every(isPersonalInfoRecord)
      ) {
        setErrorMsg("doctors.errors.schemaError");
        return;
      }

      const personalInfoByUserId = new Map(
        personalInfoRecords.map((record) => [String(record.UserID), record]),
      );
      setDoctors(
        doctorRecords.map((doctor) => {
          const personalInfo = personalInfoByUserId.get(String(doctor.UserID));
          return {
            ...doctor,
            Specialization: doctor.Specialization ?? doctor.Specialty ?? "",
            FullName: personalInfo?.FullName?.trim() || doctor.DoctorName?.trim() || "",
            Email: personalInfo?.Email ?? "",
            Address: personalInfo?.Address ?? "",
          };
        }),
      );
    } catch (error) {
      console.error("Failed to retrieve doctor directory:", error);
      setErrorMsg("doctors.errors.fetchFailed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user.roleId === RoleID.Admin) void fetchDoctors();
  }, [user.roleId]);

  const sortedDoctors = useMemo(
    () =>
      [...doctors].sort(
        (firstDoctor, secondDoctor) =>
          Number(firstDoctor.DoctorID) - Number(secondDoctor.DoctorID),
      ),
    [doctors],
  );
  const filteredDoctors = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase();
    if (!query) return sortedDoctors;
    return sortedDoctors.filter((doctor) =>
      [
        doctor.DoctorID,
        doctor.UserID,
        doctor.FullName,
        doctor.Specialization,
        doctor.Email,
        doctor.Address,
      ].some((value) => String(value ?? "").toLocaleLowerCase().includes(query)),
    );
  }, [searchTerm, sortedDoctors]);

  const handleDoctorCreated = () => {
    setShowModal(false);
    setNotification("doctors.notifications.created");
    window.setTimeout(() => setNotification(null), 4000);
    void fetchDoctors();
  };

  if (user.roleId !== RoleID.Admin) return null;

  return (
    <div
      dir={i18n.language.startsWith("ar") ? "rtl" : "ltr"}
      className="space-y-8 animate-in fade-in duration-300"
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">
            {t("doctors.header.title")}
          </h2>
          <p className="mt-1 text-sm text-secondary">{t("doctors.header.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-xs font-bold text-white shadow-md transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          {t("doctors.header.addButton")}
        </button>
      </header>

      {notification && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <span>{t(notification)}</span>
        </div>
      )}

      {errorMsg && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-50 p-4 text-sm font-semibold text-rose-800">
          <ShieldAlert className="h-5 w-5 shrink-0 text-rose-600" />
          <span>{t(errorMsg)}</span>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-outline-variant bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-outline-variant bg-slate-50/50 px-6 py-4">
          <h3 className="flex items-center gap-2 text-base font-bold text-on-surface">
            <Stethoscope className="h-5 w-5 text-primary" />
            {t("doctors.table.title")}
          </h3>
          <span className="text-xs font-bold text-secondary">
            {t("doctors.table.total", { count: filteredDoctors.length })}
          </span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div role="status" className="p-16 text-center text-sm font-semibold text-secondary">
              {t("doctors.table.loading")}
            </div>
          ) : errorMsg ? (
            <div className="p-16 text-center">
              <button
                type="button"
                onClick={() => void fetchDoctors()}
                className="text-sm font-bold text-primary underline"
              >
                {t("doctors.table.retry")}
              </button>
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="p-16 text-center text-sm font-semibold text-secondary">
              {searchTerm.trim()
                ? t("doctors.table.noSearchResults", { term: searchTerm })
                : t("doctors.table.empty")}
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead className="border-b border-outline-variant bg-slate-50">
                <tr>
                  {["name", "specialization", "email", "address"].map((column) => (
                    <th
                      key={column}
                      className="px-6 py-4 text-start text-xs font-bold uppercase tracking-wider text-secondary"
                    >
                      {t(`doctors.table.${column}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredDoctors.map((doctor) => (
                  <tr key={String(doctor.DoctorID)} className="transition-colors hover:bg-primary/5">
                    <td className="px-6 py-4 text-start font-semibold text-on-surface">
                      <span dir="auto">{doctor.FullName || `#${doctor.DoctorID}`}</span>
                    </td>
                    <td className="px-6 py-4 text-start font-semibold text-on-surface">
                      <span dir="auto">{doctor.Specialization}</span>
                    </td>
                    <td className="px-6 py-4 text-start font-semibold text-on-surface">
                      <span dir="auto">{doctor.Email || t("doctors.table.notProvided")}</span>
                    </td>
                    <td className="px-6 py-4 text-start font-semibold text-on-surface">
                      <span dir="auto">{doctor.Address || t("doctors.table.notProvided")}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {showModal && (
        <DoctorModal
          onClose={() => setShowModal(false)}
          onCreated={handleDoctorCreated}
        />
      )}
    </div>
  );
}
