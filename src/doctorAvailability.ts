export interface DoctorAppointmentStatus {
  DoctorID: number | string;
  Status: string;
}

const activeAppointmentStatuses = new Set([
  "scheduled",
  "pending",
  "confirmed",
  "in progress",
  "مجدول",
  "محجوز",
  "قيد الانتظار",
  "مؤكد",
  "قيد التنفيذ",
]);

export const getUnavailableDoctorIds = (
  appointments: readonly DoctorAppointmentStatus[],
): Set<string> =>
  new Set(
    appointments
      .filter((appointment) =>
        activeAppointmentStatuses.has(appointment.Status.trim().toLowerCase()),
      )
      .map((appointment) => String(appointment.DoctorID)),
  );
