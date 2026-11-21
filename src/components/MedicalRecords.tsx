import React, { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle,
  ClipboardList,
  Crown,
  FileSignature,
  Loader2,
  Pill,
  Save,
  ShieldAlert,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { isAxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { apiClient } from "../api.js";

interface MedicalRecord {
  RecordID: number | string;
  PatientID: number | string;
  DoctorID: number | string;
  Diagnosis: string;
  TreatmentPlan: string;
  XRayImagePath: string | null;
}

interface MedicalRecordPayload {
  PatientID: number;
  DoctorID: number;
  Diagnosis: string;
  TreatmentPlan: string;
  XRayImagePath?: string;
}

interface MedicalBoardDetails {
  deliberation: {
    agent1_diagnostician: {
      name: string;
      role: string;
      analysis: string;
      differentials: string[];
    };
    agent2_safetyAuditor: {
      name: string;
      role: string;
      analysis: string;
      drugWarnings: string[];
    };
    agent3_chiefOfBoard: {
      name: string;
      role: string;
      synthesis: string;
      agreementScore: number;
    };
  };
  consensusSummary: {
    finalRecommendation: string;
    suggestedLabTests: string[];
  };
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isMedicalBoardDetails = (value: unknown): value is MedicalBoardDetails => {
  if (!value || typeof value !== "object") return false;
  const details = value as Record<string, unknown>;
  const deliberation = details.deliberation;
  const consensusSummary = details.consensusSummary;
  if (!deliberation || typeof deliberation !== "object") return false;
  if (!consensusSummary || typeof consensusSummary !== "object") return false;

  const agents = deliberation as Record<string, unknown>;
  const diagnostician = agents.agent1_diagnostician;
  const safetyAuditor = agents.agent2_safetyAuditor;
  const chiefOfBoard = agents.agent3_chiefOfBoard;
  if (!diagnostician || typeof diagnostician !== "object") return false;
  if (!safetyAuditor || typeof safetyAuditor !== "object") return false;
  if (!chiefOfBoard || typeof chiefOfBoard !== "object") return false;

  const diagnosticianData = diagnostician as Record<string, unknown>;
  const safetyAuditorData = safetyAuditor as Record<string, unknown>;
  const chiefData = chiefOfBoard as Record<string, unknown>;
  const summaryData = consensusSummary as Record<string, unknown>;

  return (
    typeof diagnosticianData.name === "string" &&
    typeof diagnosticianData.role === "string" &&
    typeof diagnosticianData.analysis === "string" &&
    isStringArray(diagnosticianData.differentials) &&
    typeof safetyAuditorData.name === "string" &&
    typeof safetyAuditorData.role === "string" &&
    typeof safetyAuditorData.analysis === "string" &&
    isStringArray(safetyAuditorData.drugWarnings) &&
    typeof chiefData.name === "string" &&
    typeof chiefData.role === "string" &&
    typeof chiefData.synthesis === "string" &&
    typeof chiefData.agreementScore === "number" &&
    Number.isFinite(chiefData.agreementScore) &&
    typeof summaryData.finalRecommendation === "string" &&
    isStringArray(summaryData.suggestedLabTests)
  );
};

const isMedicalRecord = (value: unknown): value is MedicalRecord => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    (typeof record.RecordID === "number" || typeof record.RecordID === "string") &&
    (typeof record.PatientID === "number" || typeof record.PatientID === "string") &&
    (typeof record.DoctorID === "number" || typeof record.DoctorID === "string") &&
    typeof record.Diagnosis === "string" &&
    typeof record.TreatmentPlan === "string" &&
    (typeof record.XRayImagePath === "string" || record.XRayImagePath === null)
  );
};

const getRecordKey = (recordId: MedicalRecord["RecordID"]) => String(recordId);

const formatErrorDetail = (value: unknown): string | null => {
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value)) {
    return value.map(formatErrorDetail).filter((item): item is string => Boolean(item)).join("; ") || null;
  }
  if (!value || typeof value !== "object") return null;

  const detail = value as Record<string, unknown>;
  if (typeof detail.message === "string" && detail.message.trim()) {
    const path = Array.isArray(detail.path) ? detail.path.join(".") : "";
    return path ? `${path}: ${detail.message.trim()}` : detail.message.trim();
  }

  return Object.entries(detail)
    .map(([key, item]) => {
      const message = formatErrorDetail(item);
      return message ? `${key}: ${message}` : null;
    })
    .filter((item): item is string => Boolean(item))
    .join("; ") || null;
};

const getBackendErrorMessage = (error: unknown): string | null => {
  if (!isAxiosError(error)) return null;
  const data: unknown = error.response?.data;
  if (!data || typeof data !== "object") return null;

  const responseData = data as Record<string, unknown>;
  for (const key of ["message", "errors", "error"]) {
    const message = formatErrorDetail(responseData[key]);
    if (message) return message;
  }
  return null;
};

export default function MedicalRecords() {
  const { t, i18n } = useTranslation();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [treatmentPlan, setTreatmentPlan] = useState("");
  const [xRayImagePath, setXRayImagePath] = useState("");
  const [notif, setNotif] = useState<string | null>(null);
  const [consultingRecordId, setConsultingRecordId] = useState<string | null>(null);
  const [approvingRecordId, setApprovingRecordId] = useState<string | null>(null);
  const [approvedRecords, setApprovedRecords] = useState<Record<string, boolean>>({});
  const [boardDetails, setBoardDetails] = useState<Record<string, MedicalBoardDetails>>({});
  const [boardErrors, setBoardErrors] = useState<Record<string, string>>({});

  const fetchRecords = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await apiClient.get("/medical-records");
      if (!Array.isArray(response.data) || !response.data.every(isMedicalRecord)) {
        setErrorMsg(t("medicalRecords.errors.schemaError"));
        return;
      }
      setRecords(response.data);
    } catch (error) {
      console.error("Failed to retrieve medical records:", error);
      setErrorMsg(t("medicalRecords.errors.fetchFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRecords();
  }, []);

  const showNotification = (message: string) => {
    setNotif(message);
    window.setTimeout(() => setNotif(null), 4000);
  };

  const handleCreateRecord = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedPatientId = Number(patientId);
    const parsedDoctorId = Number(doctorId);
    if (
      !Number.isInteger(parsedPatientId) ||
      parsedPatientId <= 0 ||
      !Number.isInteger(parsedDoctorId) ||
      parsedDoctorId <= 0
    ) {
      setErrorMsg(t("medicalRecords.errors.invalidIds"));
      return;
    }

    const payload: MedicalRecordPayload = {
      PatientID: parsedPatientId,
      DoctorID: parsedDoctorId,
      Diagnosis: diagnosis.trim(),
      TreatmentPlan: treatmentPlan.trim(),
      XRayImagePath: xRayImagePath.trim(),
    };

    setErrorMsg(null);
    try {
      const response = await apiClient.post("/medical-records", payload);
      const createdRecord: unknown = response.data?.data;
      if (isMedicalRecord(createdRecord)) {
        setRecords((previousRecords) => [createdRecord, ...previousRecords]);
      } else {
        await fetchRecords();
      }
      setPatientId("");
      setDoctorId("");
      setDiagnosis("");
      setTreatmentPlan("");
      setXRayImagePath("");
      showNotification(t("medicalRecords.notifications.recordSaved"));
    } catch (error) {
      console.error("Failed to save medical record:", error);
      setErrorMsg(t("medicalRecords.errors.saveFailed"));
    }
  };

  const handleConsult = async (record: MedicalRecord) => {
    const recordKey = getRecordKey(record.RecordID);
    setConsultingRecordId(recordKey);
    setBoardErrors((previousErrors) => ({ ...previousErrors, [recordKey]: "" }));
    try {
      const response = await apiClient.post(`/ai-reports/consult/${record.RecordID}`, {
        lang: i18n.language,
      });
      if (response.status !== 201 || !isMedicalBoardDetails(response.data?.boardDetails)) {
        throw new Error("The medical board response did not contain a report.");
      }
      setBoardDetails((previousDetails) => ({
        ...previousDetails,
        [recordKey]: response.data.boardDetails,
      }));
    } catch (error) {
      console.error("Medical board consultation failed:", error);
      setBoardErrors((previousErrors) => ({
        ...previousErrors,
        [recordKey]: t("medicalRecords.errors.consultFailed"),
      }));
    } finally {
      setConsultingRecordId(null);
    }
  };

  const handleApproveReport = async (record: MedicalRecord, report: MedicalBoardDetails) => {
    const recordKey = getRecordKey(record.RecordID);
    const finalRecommendation = report.consensusSummary.finalRecommendation.trim();
    if (!finalRecommendation) {
      setBoardErrors((previousErrors) => ({
        ...previousErrors,
        [recordKey]: t("medicalRecords.errors.reportMissing"),
      }));
      return;
    }

    const currentTreatment = record.TreatmentPlan.trim();
    const updatedTreatmentPlan = currentTreatment.includes(finalRecommendation)
      ? currentTreatment
      : currentTreatment
        ? `${currentTreatment}\n\n${finalRecommendation}`
        : finalRecommendation;
    const payload: Omit<MedicalRecordPayload, "PatientID" | "DoctorID"> = {
      Diagnosis: record.Diagnosis,
      TreatmentPlan: updatedTreatmentPlan,
    };
    const xRayImagePath = record.XRayImagePath?.trim();
    if (xRayImagePath) payload.XRayImagePath = xRayImagePath;

    setApprovingRecordId(recordKey);
    setBoardErrors((previousErrors) => ({ ...previousErrors, [recordKey]: "" }));
    try {
      await apiClient.put(`/medical-records/${record.RecordID}`, payload);
      setRecords((previousRecords) =>
        previousRecords.map((currentRecord) =>
          getRecordKey(currentRecord.RecordID) === recordKey
            ? { ...currentRecord, TreatmentPlan: updatedTreatmentPlan }
            : currentRecord,
        ),
      );
      setApprovedRecords((previousApprovedRecords) => ({
        ...previousApprovedRecords,
        [recordKey]: true,
      }));
      showNotification(t("medicalRecords.notifications.reportApproved"));
    } catch (error) {
      console.error("Failed to approve medical board report:", error);
      setBoardErrors((previousErrors) => ({
        ...previousErrors,
        [recordKey]:
          getBackendErrorMessage(error) ?? t("medicalRecords.errors.approveFailed"),
      }));
    } finally {
      setApprovingRecordId(null);
    }
  };

  const renderList = (items: string[]) =>
    items.length > 0 ? (
      <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-on-surface-variant">
        {items.map((item, index) => (
          <li dir="auto" key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    ) : (
      <p className="mt-2 text-sm text-secondary">{t("medicalRecords.board.noItems")}</p>
    );

  return (
    <div
      dir={i18n.language === "ar" ? "rtl" : "ltr"}
      className="space-y-8 animate-in fade-in duration-300"
    >
      <div>
        <h2 className="text-3xl font-bold text-primary tracking-tight font-sans">
          {t("medicalRecords.title")}
        </h2>
        <p className="text-sm text-secondary mt-1">{t("medicalRecords.subtitle")}</p>
      </div>

      {notif && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-500/20 text-emerald-800 text-sm font-semibold flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{notif}</span>
        </div>
      )}

      {errorMsg && (
        <div role="alert" className="p-4 rounded-xl bg-rose-50 border border-rose-500/20 text-rose-800 text-sm font-semibold flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-outline-variant h-fit">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary border-b border-slate-100 pb-3.5 mb-5 flex items-center gap-2">
            <FileSignature className="w-4.5 h-4.5" />
            <span>{t("medicalRecords.form.title")}</span>
          </h3>

          <form onSubmit={handleCreateRecord} className="space-y-4 font-sans text-xs">
            <div className="space-y-1">
              <label htmlFor="record-patient-id" className="text-xs font-semibold text-on-surface-variant block text-start">
                {t("medicalRecords.form.patientId")}
              </label>
              <input
                id="record-patient-id"
                type="number"
                min="1"
                step="1"
                required
                value={patientId}
                onChange={(event) => setPatientId(event.target.value)}
                placeholder={t("medicalRecords.form.patientIdPlaceholder")}
                className="w-full px-3.5 py-2.5 bg-surface border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm font-sans text-start"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="record-doctor-id" className="text-xs font-semibold text-on-surface-variant block text-start">
                {t("medicalRecords.form.doctorId")}
              </label>
              <input
                id="record-doctor-id"
                type="number"
                min="1"
                step="1"
                required
                value={doctorId}
                onChange={(event) => setDoctorId(event.target.value)}
                placeholder={t("medicalRecords.form.doctorIdPlaceholder")}
                className="w-full px-3.5 py-2.5 bg-surface border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm font-sans text-start"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="record-diagnosis" className="text-xs font-semibold text-on-surface-variant block text-start">
                {t("medicalRecords.form.diagnosis")}
              </label>
              <textarea
                id="record-diagnosis"
                required
                value={diagnosis}
                onChange={(event) => setDiagnosis(event.target.value)}
                rows={3}
                placeholder={t("medicalRecords.form.diagnosisPlaceholder")}
                className="w-full px-3.5 py-2.5 bg-surface border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-xs font-sans resize-none text-start"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="record-treatment-plan" className="text-xs font-semibold text-on-surface-variant block text-start">
                {t("medicalRecords.form.treatmentPlan")}
              </label>
              <textarea
                id="record-treatment-plan"
                value={treatmentPlan}
                onChange={(event) => setTreatmentPlan(event.target.value)}
                rows={3}
                placeholder={t("medicalRecords.form.treatmentPlanPlaceholder")}
                className="w-full px-3.5 py-2.5 bg-surface border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-xs font-sans resize-none text-start"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="record-xray-path" className="text-xs font-semibold text-on-surface-variant block text-start">
                {t("medicalRecords.form.xRayImagePath")}
              </label>
              <input
                id="record-xray-path"
                type="text"
                value={xRayImagePath}
                onChange={(event) => setXRayImagePath(event.target.value)}
                placeholder={t("medicalRecords.form.xRayImagePathPlaceholder")}
                className="w-full px-3.5 py-2.5 bg-surface border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm font-sans text-start"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-primary text-white py-3 rounded-lg font-bold text-xs hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{t("medicalRecords.form.save")}</span>
            </button>
          </form>
        </div>

        <div className="lg:col-span-8 bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-slate-50">
            <h4 className="text-base font-bold text-primary flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              <span>{t("medicalRecords.table.title")}</span>
            </h4>
            <span className="text-xs text-secondary font-bold">
              {t("medicalRecords.table.total")}: {records.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-16 text-center text-secondary text-xs uppercase tracking-widest font-semibold">
                {t("medicalRecords.table.loading")}
              </div>
            ) : records.length === 0 ? (
              <div className="p-16 text-center text-secondary font-semibold">
                {t("medicalRecords.table.noRecords")}
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead className="bg-[#f8fafc] border-b border-outline-variant">
                  <tr className="select-none">
                    <th className="px-5 py-3 text-xs font-bold text-secondary uppercase tracking-wider font-sans text-start">{t("medicalRecords.table.recordId")}</th>
                    <th className="px-5 py-3 text-xs font-bold text-secondary uppercase tracking-wider font-sans text-start">{t("medicalRecords.table.patientId")}</th>
                    <th className="px-5 py-3 text-xs font-bold text-secondary uppercase tracking-wider font-sans text-start">{t("medicalRecords.table.doctorId")}</th>
                    <th className="px-5 py-3 text-xs font-bold text-secondary uppercase tracking-wider font-sans text-start">{t("medicalRecords.form.diagnosis")}</th>
                    <th className="px-5 py-3 text-xs font-bold text-secondary uppercase tracking-wider font-sans text-start">{t("medicalRecords.form.treatmentPlan")}</th>
                    <th className="px-5 py-3 text-xs font-bold text-secondary uppercase tracking-wider font-sans text-start">{t("medicalRecords.table.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant font-sans text-xs">
                  {records.map((record) => {
                    const recordKey = getRecordKey(record.RecordID);
                    const report = boardDetails[recordKey];
                    const isConsulting = consultingRecordId === recordKey;
                    const isApproving = approvingRecordId === recordKey;
                    const isApproved = Boolean(approvedRecords[recordKey]);
                    return (
                      <React.Fragment key={recordKey}>
                        <tr className="hover:bg-primary/5 transition-colors">
                          <td className="px-5 py-4 text-start">
                            <span className="inline-flex items-center rounded-lg border border-primary/15 bg-primary/5 px-3 py-1.5 font-mono text-sm font-bold tracking-wide text-primary">
                              #{record.RecordID}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-semibold text-on-surface text-start">{record.PatientID}</td>
                          <td className="px-5 py-4 font-semibold text-on-surface text-start">{record.DoctorID}</td>
                          <td dir="auto" className="px-5 py-4 font-semibold text-on-surface max-w-xs leading-relaxed text-start">{record.Diagnosis}</td>
                          <td dir="auto" className="px-5 py-4 text-xs text-on-surface-variant max-w-xs leading-relaxed text-start whitespace-pre-line">{record.TreatmentPlan}</td>
                          <td className="px-5 py-4 text-start min-w-48">
                            <button
                              type="button"
                              onClick={() => void handleConsult(record)}
                              disabled={Boolean(consultingRecordId) || Boolean(approvingRecordId)}
                              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isConsulting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                              {t("medicalRecords.board.consult")}
                            </button>
                          </td>
                        </tr>
                        {isConsulting && (
                          <tr>
                            <td colSpan={6} className="px-5 py-5">
                              <div role="status" className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm font-semibold text-sky-900">
                                <Activity className="h-5 w-5 animate-pulse text-sky-700" />
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>{t("medicalRecords.board.clinicalLoading")}</span>
                              </div>
                            </td>
                          </tr>
                        )}
                        {boardErrors[recordKey] && (
                          <tr>
                            <td colSpan={6} className="px-5 py-3 text-sm font-semibold text-rose-700" role="alert">
                              {boardErrors[recordKey]}
                            </td>
                          </tr>
                        )}
                        {report && (
                          <tr>
                            <td colSpan={6} className="p-5">
                              <section className="space-y-4 rounded-2xl border border-primary/15 bg-slate-50 p-4">
                                <h5 className="text-base font-bold text-primary">{t("medicalRecords.board.title")}</h5>
                                <div className="grid gap-4 xl:grid-cols-3">
                                  <article className="rounded-xl border border-sky-200 bg-white p-4">
                                    <div className="flex items-center gap-2 text-sky-800">
                                      <Stethoscope className="h-5 w-5" />
                                      <h6 className="font-bold">{t("medicalRecords.board.diagnostician")}</h6>
                                    </div>
                                    <p dir="auto" className="mt-3 font-semibold text-on-surface">{report.deliberation.agent1_diagnostician.name}</p>
                                    <p dir="auto" className="text-xs text-secondary">{report.deliberation.agent1_diagnostician.role}</p>
                                    <p dir="auto" className="mt-3 whitespace-pre-line text-sm text-on-surface-variant">{report.deliberation.agent1_diagnostician.analysis}</p>
                                    <h6 className="mt-4 text-xs font-bold text-on-surface">{t("medicalRecords.board.differentials")}</h6>
                                    {renderList(report.deliberation.agent1_diagnostician.differentials)}
                                  </article>

                                  <article className="rounded-xl border border-amber-200 bg-white p-4">
                                    <div className="flex items-center gap-2 text-amber-800">
                                      <Pill className="h-5 w-5" />
                                      <h6 className="font-bold">{t("medicalRecords.board.safetyAuditor")}</h6>
                                    </div>
                                    <p dir="auto" className="mt-3 font-semibold text-on-surface">{report.deliberation.agent2_safetyAuditor.name}</p>
                                    <p dir="auto" className="text-xs text-secondary">{report.deliberation.agent2_safetyAuditor.role}</p>
                                    <p dir="auto" className="mt-3 whitespace-pre-line text-sm text-on-surface-variant">{report.deliberation.agent2_safetyAuditor.analysis}</p>
                                    <h6 className="mt-4 text-xs font-bold text-on-surface">{t("medicalRecords.board.drugWarnings")}</h6>
                                    {renderList(report.deliberation.agent2_safetyAuditor.drugWarnings)}
                                  </article>

                                  <article className="rounded-xl border border-violet-200 bg-white p-4">
                                    <div className="flex items-center gap-2 text-violet-800">
                                      <Crown className="h-5 w-5" />
                                      <h6 className="font-bold">{t("medicalRecords.board.chiefOfBoard")}</h6>
                                    </div>
                                    <p dir="auto" className="mt-3 font-semibold text-on-surface">{report.deliberation.agent3_chiefOfBoard.name}</p>
                                    <p dir="auto" className="text-xs text-secondary">{report.deliberation.agent3_chiefOfBoard.role}</p>
                                    <p dir="auto" className="mt-3 whitespace-pre-line text-sm text-on-surface-variant">{report.deliberation.agent3_chiefOfBoard.synthesis}</p>
                                    <p className="mt-4 text-sm font-bold text-violet-800">
                                      {t("medicalRecords.board.agreementScore")}:{" "}
                                      {Math.round(
                                        report.deliberation.agent3_chiefOfBoard.agreementScore <= 1
                                          ? report.deliberation.agent3_chiefOfBoard.agreementScore * 100
                                          : report.deliberation.agent3_chiefOfBoard.agreementScore,
                                      )}
                                      %
                                    </p>
                                  </article>
                                </div>

                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                                  <h6 className="font-bold text-emerald-900">{t("medicalRecords.board.consensusSummary")}</h6>
                                  <p className="mt-3 text-xs font-bold text-emerald-900">
                                    {t("medicalRecords.board.finalRecommendation")}
                                  </p>
                                  <p dir="auto" className="mt-2 whitespace-pre-line text-sm text-emerald-950">
                                    {report.consensusSummary.finalRecommendation}
                                  </p>
                                  <h6 className="mt-4 text-xs font-bold text-emerald-900">{t("medicalRecords.board.suggestedLabTests")}</h6>
                                  {renderList(report.consensusSummary.suggestedLabTests)}
                                  <button
                                    type="button"
                                    onClick={() => void handleApproveReport(record, report)}
                                    disabled={isApproved || Boolean(approvingRecordId) || Boolean(consultingRecordId)}
                                    className={`mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
                                      isApproved
                                        ? "bg-emerald-600"
                                        : "bg-emerald-700 hover:bg-emerald-800"
                                    }`}
                                  >
                                    {isApproving ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <CheckCircle className="h-4 w-4" />
                                    )}
                                    {isApproved
                                      ? t("medicalRecords.board.approved")
                                      : t("medicalRecords.board.approveReport")}
                                  </button>
                                </div>
                              </section>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="px-6 py-4 bg-slate-50 border-t border-outline-variant text-[11px] text-secondary font-bold flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-secondary scale-90" />
            <span>{t("medicalRecords.table.privacyNotice")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
