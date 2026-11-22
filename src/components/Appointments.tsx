import React, { useEffect, useState } from "react";
import { Calendar, CheckCircle2, Clock, Loader2, Plus, Save, ShieldAlert, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../api.js";
import {
  getPersonLabel,
  parseDirectoryPeople,
  type DirectoryPerson,
} from "../personDirectory.js";
import { RoleID, type UserSession } from "../types.js";

interface AppointmentsProps {
  user: UserSession;
}

interface AppointmentRecord {
  AppointmentID: number | string;
  PatientID: number | string;
  DoctorID: number | string;
  PatientName?: string | null;
  DoctorName?: string | null;
  AppointmentDate: string;
  Status: string;
}

interface AppointmentPayload {
  PatientID: number;
  DoctorID: number;
  AppointmentDate: string;
  Status: string;
}

const isAppointmentRecord = (value: unknown): value is AppointmentRecord => {
  if (!value || typeof value !== "object") return false;
  const appointment = value as Record<string, unknown>;
  return (
    (typeof appointment.AppointmentID === "number" ||
      typeof appointment.AppointmentID === "string") &&
    (typeof appointment.PatientID === "number" || typeof appointment.PatientID === "string") &&
    (typeof appointment.DoctorID === "number" || typeof appointment.DoctorID === "string") &&
    (appointment.PatientName === undefined ||
      typeof appointment.PatientName === "string" ||
      appointment.PatientName === null) &&
    (appointment.DoctorName === undefined ||
      typeof appointment.DoctorName === "string" ||
      appointment.DoctorName === null) &&
    typeof appointment.AppointmentDate === "string" &&
    typeof appointment.Status === "string"
  );
};

const getAppointmentKey = (appointmentId: AppointmentRecord["AppointmentID"]) =>
  String(appointmentId);

const appointmentStatuses = [
  "Scheduled",
  "Pending",
  "Confirmed",
  "Completed",
  "Cancelled",
  "In Progress",
];

export default function Appointments({ user }: AppointmentsProps) {
  const { t, i18n } = useTranslation();
  const isAdmin = user.roleId === RoleID.Admin;
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [patientOptions, setPatientOptions] = useState<DirectoryPerson[]>([]);
  const [doctorOptions, setDoctorOptions] = useState<DirectoryPerson[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [status, setStatus] = useState("Pending");
  const [workingAppointmentId, setWorkingAppointmentId] = useState<string | null>(null);

  const fetchAppointments = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await apiClient.get("/appointments");
      if (!Array.isArray(response.data) || !response.data.every(isAppointmentRecord)) {
        setErrorMsg("appointments.errors.schemaError");
        return;
      }
      setAppointments(response.data);
    } catch (error) {
      console.error("Failed to retrieve appointments:", error);
      setErrorMsg("appointments.errors.fetchFailed");
    } finally {
      setLoading(false);
    }
  };

  const fetchDirectoryOptions = async () => {
    setDirectoryLoading(true);
    try {
      const [patientsResponse, doctorsResponse] = await Promise.all([
        apiClient.get("/patients"),
        apiClient.get("/doctors"),
      ]);
      const patients = parseDirectoryPeople(
        patientsResponse.data,
        "PatientID",
        "PatientName",
      );
      const doctors = parseDirectoryPeople(
        doctorsResponse.data,
        "DoctorID",
        "DoctorName",
      );
      if (!patients || !doctors) {
        throw new Error("The server returned an unexpected directory format.");
      }
      setPatientOptions(patients);
      setDoctorOptions(doctors);
    } catch (error) {
      console.error("Failed to retrieve patient and doctor directories:", error);
      setActionError("appointments.errors.directoryFetchFailed");
    } finally {
      setDirectoryLoading(false);
    }
  };

  useEffect(() => {
    void fetchAppointments();
    void fetchDirectoryOptions();
  }, []);

  const showNotification = (messageKey: string) => {
    setNotification(messageKey);
    window.setTimeout(() => setNotification(null), 4000);
  };

  const handleScheduleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedPatientId = Number(patientId);
    const parsedDoctorId = Number(doctorId);
    if (
      !Number.isInteger(parsedPatientId) ||
      parsedPatientId <= 0 ||
      !Number.isInteger(parsedDoctorId) ||
      parsedDoctorId <= 0 ||
      !appointmentDate
    ) {
      setActionError("appointments.errors.requiredFields");
      return;
    }

    const payload: AppointmentPayload = {
      PatientID: parsedPatientId,
      DoctorID: parsedDoctorId,
      AppointmentDate: new Date(appointmentDate).toISOString(),
      Status: status,
    };

    setActionError(null);
    try {
      const response = await apiClient.post("/appointments", payload);
      const createdAppointment: unknown = response.data?.data;
      if (isAppointmentRecord(createdAppointment)) {
        setAppointments((previousAppointments) => [
          createdAppointment,
          ...previousAppointments,
        ]);
      } else {
        await fetchAppointments();
      }
      setPatientId("");
      setDoctorId("");
      setAppointmentDate("");
      setStatus("Pending");
      showNotification("appointments.notifications.saved");
    } catch (error) {
      console.error("Failed to create appointment:", error);
      setActionError("appointments.errors.saveFailed");
    }
  };

  const handleStatusChange = async (
    appointment: AppointmentRecord,
    nextStatus: string,
  ) => {
    const appointmentKey = getAppointmentKey(appointment.AppointmentID);
    const payload: AppointmentPayload = {
      PatientID: Number(appointment.PatientID),
      DoctorID: Number(appointment.DoctorID),
      AppointmentDate: appointment.AppointmentDate,
      Status: nextStatus,
    };

    setWorkingAppointmentId(appointmentKey);
    setActionError(null);
    try {
      const response = await apiClient.put(
        `/appointments/${appointment.AppointmentID}`,
        payload,
      );
      const updatedAppointment: unknown = response.data?.data;
      setAppointments((previousAppointments) =>
        previousAppointments.map((currentAppointment) =>
          getAppointmentKey(currentAppointment.AppointmentID) === appointmentKey
            ? isAppointmentRecord(updatedAppointment)
              ? updatedAppointment
              : { ...currentAppointment, Status: nextStatus }
            : currentAppointment,
        ),
      );
      showNotification("appointments.notifications.updated");
    } catch (error) {
      console.error("Failed to update appointment status:", error);
      setActionError("appointments.errors.updateFailed");
    } finally {
      setWorkingAppointmentId(null);
    }
  };

  const handleDeleteAppointment = async (appointment: AppointmentRecord) => {
    if (!isAdmin) return;
    const appointmentKey = getAppointmentKey(appointment.AppointmentID);
    setWorkingAppointmentId(appointmentKey);
    setActionError(null);
    try {
      await apiClient.delete(`/appointments/${appointment.AppointmentID}`);
      setAppointments((previousAppointments) =>
        previousAppointments.filter(
          (currentAppointment) =>
            getAppointmentKey(currentAppointment.AppointmentID) !== appointmentKey,
        ),
      );
      showNotification("appointments.notifications.deleted");
    } catch (error) {
      console.error("Failed to delete appointment:", error);
      setActionError("appointments.errors.deleteFailed");
    } finally {
      setWorkingAppointmentId(null);
    }
  };

  const formatAppointmentDate = (date: string) => {
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return t("appointments.table.invalidDate");
    return new Intl.DateTimeFormat(i18n.language, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(parsedDate);
  };

  const getStatusStyle = (appointmentStatus: string) => {
    switch (appointmentStatus.trim().toLowerCase()) {
      case "confirmed":
      case "completed":
        return "border-emerald-400/20 bg-emerald-50 text-emerald-800";
      case "cancelled":
        return "border-rose-400/20 bg-rose-50 text-rose-800";
      case "pending":
        return "border-amber-400/20 bg-amber-50 text-amber-800";
      case "scheduled":
        return "border-sky-400/20 bg-sky-50 text-sky-800";
      default:
        return "border-sky-400/20 bg-sky-50 text-sky-800";
    }
  };

  const getStatusLabel = (appointmentStatus: string) => {
    const statusKey = appointmentStatuses.find(
      (knownStatus) => knownStatus.toLowerCase() === appointmentStatus.trim().toLowerCase(),
    );
    return statusKey
      ? t(`appointments.status.${statusKey.toLowerCase().replace(/\s+/g, "")}`)
      : appointmentStatus;
  };

  return (
    <div
      dir={i18n.language.startsWith("ar") ? "rtl" : "ltr"}
      className="space-y-8 animate-in fade-in duration-300"
    >
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-primary">
          {t("appointments.title")}
        </h2>
        <p className="mt-1 text-sm text-secondary">{t("appointments.subtitle")}</p>
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
          <span>{t(actionError ?? errorMsg ?? "appointments.errors.fetchFailed")}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <section className="h-fit rounded-2xl border border-outline-variant bg-white p-6 lg:col-span-4">
          <h3 className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-3.5 text-sm font-bold uppercase tracking-wider text-primary">
            <Plus className="h-4 w-4" />
            {t("appointments.form.title")}
          </h3>
          <form onSubmit={handleScheduleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="appointment-patient-id" className="block text-xs font-semibold text-on-surface-variant">
                {t("appointments.form.patientIdLabel")}
              </label>
              <select
                id="appointment-patient-id"
                required
                disabled={directoryLoading || patientOptions.length === 0}
                value={patientId}
                onChange={(event) => setPatientId(event.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary"
              >
                <option value="">
                  {directoryLoading
                    ? t("appointments.form.loadingPatients")
                    : patientOptions.length
                      ? t("appointments.form.selectPatientPlaceholder")
                      : t("appointments.form.noPatientsAvailable")}
                </option>
                {patientOptions.map((person) => (
                  <option key={person.id} value={person.id} dir="auto">
                    {person.name ? `${person.name} (#${person.id})` : `#${person.id}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="appointment-doctor-id" className="block text-xs font-semibold text-on-surface-variant">
                {t("appointments.form.doctorIdLabel")}
              </label>
              <select
                id="appointment-doctor-id"
                required
                disabled={directoryLoading || doctorOptions.length === 0}
                value={doctorId}
                onChange={(event) => setDoctorId(event.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary"
              >
                <option value="">
                  {directoryLoading
                    ? t("appointments.form.loadingDoctors")
                    : doctorOptions.length
                      ? t("appointments.form.selectDoctorPlaceholder")
                      : t("appointments.form.noDoctorsAvailable")}
                </option>
                {doctorOptions.map((person) => (
                  <option key={person.id} value={person.id} dir="auto">
                    {person.name ? `${person.name} (#${person.id})` : `#${person.id}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="appointment-date" className="block text-xs font-semibold text-on-surface-variant">
                {t("appointments.form.dateLabel")}
              </label>
              <input
                id="appointment-date"
                type="datetime-local"
                required
                value={appointmentDate}
                onChange={(event) => setAppointmentDate(event.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="appointment-status" className="block text-xs font-semibold text-on-surface-variant">
                {t("appointments.table.status")}
              </label>
              <select
                id="appointment-status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary"
              >
                {appointmentStatuses.map((appointmentStatus) => (
                  <option key={appointmentStatus} value={appointmentStatus}>
                    {getStatusLabel(appointmentStatus)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-xs font-bold text-white shadow-sm transition-colors hover:bg-primary/90"
            >
              <Save className="h-4 w-4" />
              {t("appointments.form.saveButton")}
            </button>
          </form>
        </section>

        <section className="flex flex-col overflow-hidden rounded-2xl border border-outline-variant bg-white shadow-sm lg:col-span-8">
          <div className="flex items-center justify-between border-b border-outline-variant bg-slate-50 px-6 py-4">
            <h3 className="flex items-center gap-2 text-base font-bold text-primary">
              <Calendar className="h-5 w-5" />
              {t("appointments.table.title")}
            </h3>
            <span className="text-xs font-bold text-secondary">
              {t("appointments.table.total", { count: appointments.length })}
            </span>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div role="status" className="p-16 text-center text-sm font-semibold text-secondary">
                {t("appointments.loading")}
              </div>
            ) : errorMsg ? (
              <div className="p-16 text-center">
                <button
                  type="button"
                  onClick={() => void fetchAppointments()}
                  className="text-sm font-bold text-primary underline"
                >
                  {t("appointments.table.retry")}
                </button>
              </div>
            ) : appointments.length === 0 ? (
              <div className="p-16 text-center text-sm font-semibold text-secondary">
                {t("appointments.noAppointments")}
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead className="border-b border-outline-variant bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-start text-xs font-bold uppercase tracking-wider text-secondary">
                      {t("appointments.table.appointmentId")}
                    </th>
                    <th className="px-5 py-3 text-start text-xs font-bold uppercase tracking-wider text-secondary">
                      {t("appointments.table.patientName")}
                    </th>
                    <th className="px-5 py-3 text-start text-xs font-bold uppercase tracking-wider text-secondary">
                      {t("appointments.table.doctor")}
                    </th>
                    <th className="px-5 py-3 text-start text-xs font-bold uppercase tracking-wider text-secondary">
                      {t("appointments.table.date")}
                    </th>
                    <th className="px-5 py-3 text-start text-xs font-bold uppercase tracking-wider text-secondary">
                      {t("appointments.table.status")}
                    </th>
                    <th className="px-5 py-3 text-start text-xs font-bold uppercase tracking-wider text-secondary">
                      {t("appointments.table.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant text-xs">
                  {appointments.map((appointment) => {
                    const appointmentKey = getAppointmentKey(appointment.AppointmentID);
                    const isWorking = workingAppointmentId === appointmentKey;
                    return (
                      <tr key={appointmentKey} className="transition-colors hover:bg-primary/5">
                        <td className="px-5 py-4 text-start font-mono text-sm font-bold text-primary">
                          #{appointment.AppointmentID}
                        </td>
                        <td className="px-5 py-4 text-start font-semibold text-on-surface">
                          <span dir="auto">
                            {getPersonLabel(
                              appointment.PatientName,
                              appointment.PatientID,
                              patientOptions,
                            )}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-start font-semibold text-on-surface">
                          <span dir="auto">
                            {getPersonLabel(
                              appointment.DoctorName,
                              appointment.DoctorID,
                              doctorOptions,
                            )}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-start font-semibold text-on-surface">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-secondary" />
                            {formatAppointmentDate(appointment.AppointmentDate)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-start">
                          <select
                            aria-label={t("appointments.table.editStatus", {
                              id: appointment.AppointmentID,
                            })}
                            value={appointment.Status}
                            disabled={isWorking || Boolean(workingAppointmentId)}
                            onChange={(event) =>
                              void handleStatusChange(appointment, event.target.value)
                            }
                            className={`rounded-full border px-3 py-1 text-xs font-bold outline-none disabled:opacity-60 ${getStatusStyle(appointment.Status)}`}
                          >
                            {!appointmentStatuses.some(
                              (knownStatus) =>
                                knownStatus.toLowerCase() === appointment.Status.trim().toLowerCase(),
                            ) && <option value={appointment.Status}>{appointment.Status}</option>}
                            {appointmentStatuses.map((appointmentStatus) => (
                              <option key={appointmentStatus} value={appointmentStatus}>
                                {getStatusLabel(appointmentStatus)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-5 py-4 text-start">
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => void handleDeleteAppointment(appointment)}
                              disabled={isWorking || Boolean(workingAppointmentId)}
                              aria-label={t("appointments.table.deleteAppointment", {
                                id: appointment.AppointmentID,
                              })}
                              className="rounded-lg p-2 text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-50"
                            >
                              {isWorking ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <footer className="border-t border-outline-variant bg-slate-50 px-6 py-4 text-[11px] font-bold text-secondary">
            {t("appointments.table.footer")}
          </footer>
        </section>
      </div>
    </div>
  );
}
