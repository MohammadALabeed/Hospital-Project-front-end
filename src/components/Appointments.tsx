import React, { useEffect, useState } from "react";
import { Calendar, CheckCircle2, Clock, Loader2, Plus, Save, ShieldAlert, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../api.js";

interface AppointmentRecord {
  AppointmentID: number | string;
  PatientID: number | string;
  DoctorID: number | string;
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
];

export default function Appointments() {
  const { t, i18n } = useTranslation();
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
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
        setErrorMsg(t("appointments.errors.schemaError"));
        return;
      }
      setAppointments(response.data);
    } catch (error) {
      console.error("Failed to retrieve appointments:", error);
      setErrorMsg(t("appointments.errors.fetchFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAppointments();
  }, []);

  const showNotification = (message: string) => {
    setNotification(message);
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
      setActionError(t("appointments.errors.requiredFields"));
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
      showNotification(t("appointments.notifications.saved"));
    } catch (error) {
      console.error("Failed to create appointment:", error);
      setActionError(t("appointments.errors.saveFailed"));
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
      showNotification(t("appointments.notifications.updated"));
    } catch (error) {
      console.error("Failed to update appointment status:", error);
      setActionError(t("appointments.errors.updateFailed"));
    } finally {
      setWorkingAppointmentId(null);
    }
  };

  const handleDeleteAppointment = async (appointment: AppointmentRecord) => {
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
      showNotification(t("appointments.notifications.deleted"));
    } catch (error) {
      console.error("Failed to delete appointment:", error);
      setActionError(t("appointments.errors.deleteFailed"));
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
      ? t(`appointments.status.${statusKey.toLowerCase()}`)
      : appointmentStatus;
  };

  return (
    <div
      dir={i18n.language === "ar" ? "rtl" : "ltr"}
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
          <span>{notification}</span>
        </div>
      )}
      {(errorMsg || actionError) && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-50 p-4 text-sm font-semibold text-rose-800">
          <ShieldAlert className="h-5 w-5 shrink-0 text-rose-600" />
          <span>{actionError ?? errorMsg}</span>
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
              <input
                id="appointment-patient-id"
                type="number"
                min="1"
                step="1"
                required
                value={patientId}
                onChange={(event) => setPatientId(event.target.value)}
                placeholder={t("appointments.form.patientIdPlaceholder")}
                className="w-full rounded-lg border border-outline-variant bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="appointment-doctor-id" className="block text-xs font-semibold text-on-surface-variant">
                {t("appointments.form.doctorIdLabel")}
              </label>
              <input
                id="appointment-doctor-id"
                type="number"
                min="1"
                step="1"
                required
                value={doctorId}
                onChange={(event) => setDoctorId(event.target.value)}
                placeholder={t("appointments.form.doctorIdPlaceholder")}
                className="w-full rounded-lg border border-outline-variant bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary"
              />
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
                      {t("appointments.table.patientId")}
                    </th>
                    <th className="px-5 py-3 text-start text-xs font-bold uppercase tracking-wider text-secondary">
                      {t("appointments.table.doctorId")}
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
                          {appointment.PatientID}
                        </td>
                        <td className="px-5 py-4 text-start font-semibold text-on-surface">
                          {appointment.DoctorID}
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
