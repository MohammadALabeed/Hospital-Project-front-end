import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle,
  ClipboardList,
  Clock,
  Crown,
  FileSignature,
  Loader2,
  Pill,
  Save,
  ShieldAlert,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../api.js";
import { RoleID, type UserSession } from "../types.js";
import {
  getPersonLabel,
  parseDirectoryPeople,
  type DirectoryPerson,
} from "../personDirectory.js";
import SearchablePersonSelect from "./SearchablePersonSelect.jsx";

interface MedicalRecord {
  RecordID: number | string;
  PatientID: number | string;
  DoctorID: number | string;
  PatientName?: string | null;
  DoctorName?: string | null;
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

interface Prescription {
  PrescriptionID: number | string;
  RecordID: number | string;
  Medication: string;
  Dosage: string;
  Notes?: string | null;
}

interface PrescriptionPayload {
  RecordID: number;
  Medication: string;
  Dosage: string;
  Notes: string | null;
}

interface MedicalRecordsProps {
  user: UserSession;
  searchTerm: string;
}

interface MedicalBoardDetails {
  plainText?: string;
  deliberation: {
    agent1_diagnostician: {
      name: string;
      role: string;
      analysis: string;
      differentials: string[];
    };
    agent2_pharmacologist: {
      name: string;
      role: string;
      analysis: string;
      drugWarnings: string[];
    };
    agent3_consensus: {
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

interface MedicalReportHistoryItem {
  id: string;
  createdAt: string;
  boardDetails: MedicalBoardDetails;
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

const getResponseData = (response: unknown): unknown => {
  const responseObject = asObject(response);
  return responseObject && "data" in responseObject ? responseObject.data : response;
};

const parseJsonValue = (value: unknown): unknown => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const parseMedicalBoardDetails = (value: unknown): MedicalBoardDetails | null => {
  if (!value || typeof value !== "object") return null;
  const details = value as Record<string, unknown>;
  const agents = asObject(details.deliberation);
  const summaryData = asObject(details.consensusSummary);
  if (!agents || !summaryData) return null;

  const diagnostician = asObject(agents.agent1_diagnostician);
  const pharmacologist = asObject(agents.agent2_pharmacologist);
  const safetyAuditor = asObject(agents.agent2_safetyAuditor);
  const consensus = asObject(agents.agent3_consensus ?? agents.agent3_chiefOfBoard);
  if (!diagnostician || (!pharmacologist && !safetyAuditor) || !consensus) return null;

  const pharmacologistName = pharmacologist?.name ?? safetyAuditor?.name;
  const pharmacologistRole = pharmacologist?.role ?? safetyAuditor?.role;
  const pharmacologistAnalysis = pharmacologist?.analysis ?? safetyAuditor?.analysis;
  const pharmacologistWarnings = isStringArray(pharmacologist?.drugWarnings)
    ? pharmacologist.drugWarnings
    : safetyAuditor?.drugWarnings;

  if (
    typeof diagnostician.name !== "string" ||
    typeof diagnostician.role !== "string" ||
    typeof diagnostician.analysis !== "string" ||
    !isStringArray(diagnostician.differentials) ||
    typeof pharmacologistName !== "string" ||
    typeof pharmacologistRole !== "string" ||
    typeof pharmacologistAnalysis !== "string" ||
    !isStringArray(pharmacologistWarnings) ||
    typeof consensus.name !== "string" ||
    typeof consensus.role !== "string" ||
    typeof consensus.synthesis !== "string" ||
    typeof consensus.agreementScore !== "number" ||
    !Number.isFinite(consensus.agreementScore) ||
    typeof summaryData.finalRecommendation !== "string" ||
    !isStringArray(summaryData.suggestedLabTests)
  ) {
    return null;
  }

  return {
    deliberation: {
      agent1_diagnostician: {
        name: diagnostician.name,
        role: diagnostician.role,
        analysis: diagnostician.analysis,
        differentials: diagnostician.differentials,
      },
      agent2_pharmacologist: {
        name: pharmacologistName,
        role: pharmacologistRole,
        analysis: pharmacologistAnalysis,
        drugWarnings: pharmacologistWarnings,
      },
      agent3_consensus: {
        name: consensus.name,
        role: consensus.role,
        synthesis: consensus.synthesis,
        agreementScore: consensus.agreementScore,
      },
    },
    consensusSummary: {
      finalRecommendation: summaryData.finalRecommendation,
      suggestedLabTests: summaryData.suggestedLabTests,
    },
  };
};

const parseMedicalReportDetails = (value: unknown): MedicalBoardDetails | null => {
  const parsedValue = parseJsonValue(value);
  const sourceValue = parsedValue ?? value;
  const report = asObject(sourceValue);
  const details =
    report?.ReportText ??
    report?.boardDetails ??
    report?.BoardDetails ??
    sourceValue;
  const structuredDetails = parseMedicalBoardDetails(parseJsonValue(details));
  if (structuredDetails) return structuredDetails;

  const plainText =
    typeof details === "string"
      ? details.trim()
      : typeof sourceValue === "string"
        ? sourceValue.trim()
        : "";
  if (!plainText) return null;

  return {
    plainText,
    deliberation: {
      agent1_diagnostician: { name: "", role: "", analysis: "", differentials: [] },
      agent2_pharmacologist: {
        name: "",
        role: "",
        analysis: "",
        drugWarnings: [],
      },
      agent3_consensus: { name: "", role: "", synthesis: "", agreementScore: 0 },
    },
    consensusSummary: { finalRecommendation: "", suggestedLabTests: [] },
  };
};

const getHistoryEntries = (value: unknown, depth = 0): unknown[] | null => {
  if (Array.isArray(value)) return value;
  if (depth >= 3) return null;

  const object = asObject(value);
  if (!object) return null;
  for (const key of [
    "reports",
    "Reports",
    "history",
    "History",
    "items",
    "Items",
    "data",
    "Data",
  ]) {
    const entries = getHistoryEntries(object[key], depth + 1);
    if (entries) return entries;
  }
  return null;
};

const parseReportHistory = (value: unknown): MedicalReportHistoryItem[] | null => {
  const entries = getHistoryEntries(value);
  if (!entries) return null;

  const reports: MedicalReportHistoryItem[] = [];
  for (const [index, entry] of entries.entries()) {
    const item = asObject(entry);
    if (!item) return null;
    const details =
      item.ReportContent ??
      item.reportContent ??
      item.ReportText ??
      item.reportText ??
      item.boardDetails ??
      item.BoardDetails ??
      item.reportDetails ??
      item.ReportDetails ??
      item.reportData ??
      item.ReportData ??
      item.report ??
      item.details ??
      item;
    const boardDetails = parseMedicalReportDetails(details);
    if (!boardDetails) return null;
    const metadata = asObject(asObject(parseJsonValue(details))?.metadata);

    const id = item.ReportID ?? item.reportId ?? item.id ?? `${index}`;
    const createdAt =
      item.CreatedAt ??
      item.createdAt ??
      item.created_at ??
      item.consultedAt ??
      item.ConsultedAt ??
      item.createdDate ??
      item.CreatedDate ??
      metadata?.consultationTimestamp;
    reports.push({
      id: String(id),
      createdAt: typeof createdAt === "string" ? createdAt : "",
      boardDetails,
    });
  }

  return reports.sort((left, right) => {
    const leftTime = Date.parse(left.createdAt);
    const rightTime = Date.parse(right.createdAt);
    return (Number.isFinite(rightTime) ? rightTime : 0) -
      (Number.isFinite(leftTime) ? leftTime : 0);
  });
};

const isMedicalRecord = (value: unknown): value is MedicalRecord => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    (typeof record.RecordID === "number" || typeof record.RecordID === "string") &&
    (typeof record.PatientID === "number" || typeof record.PatientID === "string") &&
    (typeof record.DoctorID === "number" || typeof record.DoctorID === "string") &&
    (record.PatientName === undefined ||
      typeof record.PatientName === "string" ||
      record.PatientName === null) &&
    (record.DoctorName === undefined ||
      typeof record.DoctorName === "string" ||
      record.DoctorName === null) &&
    typeof record.Diagnosis === "string" &&
    typeof record.TreatmentPlan === "string" &&
    (typeof record.XRayImagePath === "string" || record.XRayImagePath === null)
  );
};

const isPrescription = (value: unknown): value is Prescription => {
  if (!value || typeof value !== "object") return false;
  const prescription = value as Record<string, unknown>;
  return (
    (typeof prescription.PrescriptionID === "number" ||
      typeof prescription.PrescriptionID === "string") &&
    (typeof prescription.RecordID === "number" ||
      typeof prescription.RecordID === "string") &&
    typeof prescription.Medication === "string" &&
    typeof prescription.Dosage === "string" &&
    (prescription.Notes === undefined ||
      typeof prescription.Notes === "string" ||
      prescription.Notes === null)
  );
};

const parsePrescriptionList = (value: unknown): Prescription[] | null => {
  const responseData = getResponseData(value);
  const responseObject = asObject(responseData);
  const entries = Array.isArray(responseData)
    ? responseData
    : Array.isArray(responseObject?.data)
      ? responseObject.data
      : null;
  return entries?.every(isPrescription) ? entries : null;
};

const getRecordKey = (recordId: MedicalRecord["RecordID"]) => String(recordId);

const getAgreementScorePercent = (score: number) =>
  score <= 1 ? score * 100 : score;

const getAgreementPercentage = (score: number) =>
  Math.round(getAgreementScorePercent(score));

export default function MedicalRecords({ user, searchTerm }: MedicalRecordsProps) {
  const { t, i18n } = useTranslation();
  const canManagePrescriptions =
    user.roleId === RoleID.Admin || user.roleId === RoleID.Doctor;
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [patientOptions, setPatientOptions] = useState<DirectoryPerson[]>([]);
  const [doctorOptions, setDoctorOptions] = useState<DirectoryPerson[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
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
  const [historyByRecord, setHistoryByRecord] = useState<
    Record<string, MedicalReportHistoryItem[]>
  >({});
  const [historyOpenRecordId, setHistoryOpenRecordId] = useState<string | null>(null);
  const [historyLoadingRecordId, setHistoryLoadingRecordId] = useState<string | null>(null);
  const [historyErrors, setHistoryErrors] = useState<Record<string, string>>({});
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Record<string, string>>({});
  const [prescriptionsByRecord, setPrescriptionsByRecord] = useState<
    Record<string, Prescription[]>
  >({});
  const [selectedPrescriptionRecordId, setSelectedPrescriptionRecordId] = useState<
    string | null
  >(null);
  const [prescriptionsLoadingRecordId, setPrescriptionsLoadingRecordId] = useState<
    string | null
  >(null);
  const [prescriptionSavingRecordId, setPrescriptionSavingRecordId] = useState<
    string | null
  >(null);
  const [prescriptionErrors, setPrescriptionErrors] = useState<Record<string, string>>({});
  const [prescriptionMedication, setPrescriptionMedication] = useState("");
  const [prescriptionDosage, setPrescriptionDosage] = useState("");
  const [prescriptionNotes, setPrescriptionNotes] = useState("");

  const sortedRecords = useMemo(
    () =>
      [...records].sort(
        (firstRecord, secondRecord) => Number(firstRecord.RecordID) - Number(secondRecord.RecordID),
      ),
    [records],
  );
  const filteredRecords = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase();
    if (!query) return sortedRecords;
    return sortedRecords.filter((record) =>
      [
        record.RecordID,
        record.PatientID,
        record.DoctorID,
        record.PatientName,
        record.DoctorName,
        record.Diagnosis,
        record.TreatmentPlan,
        getPersonLabel(record.PatientName, record.PatientID, patientOptions),
        getPersonLabel(record.DoctorName, record.DoctorID, doctorOptions),
      ].some((value) => String(value ?? "").toLocaleLowerCase().includes(query)),
    );
  }, [doctorOptions, patientOptions, searchTerm, sortedRecords]);

  const fetchRecords = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await apiClient.get("/medical-records");
      if (!Array.isArray(response.data) || !response.data.every(isMedicalRecord)) {
        setErrorMsg("medicalRecords.errors.schemaError");
        return;
      }
      setRecords(response.data);
    } catch (error) {
      console.error("Failed to retrieve medical records:", error);
      setErrorMsg("medicalRecords.errors.fetchFailed");
    } finally {
      setLoading(false);
    }
  };

  const fetchDirectoryOptions = async () => {
    setDirectoryLoading(true);
    setDirectoryError(null);
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
      setDirectoryError("medicalRecords.errors.directoryFetchFailed");
    } finally {
      setDirectoryLoading(false);
    }
  };

  useEffect(() => {
    void fetchRecords();
    void fetchDirectoryOptions();
  }, []);

  const showNotification = (messageKey: string) => {
    setNotif(messageKey);
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
      setErrorMsg("medicalRecords.errors.invalidIds");
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
      showNotification("medicalRecords.notifications.recordSaved");
    } catch (error) {
      console.error("Failed to save medical record:", error);
      setErrorMsg("medicalRecords.errors.saveFailed");
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
      const responseData = asObject(getResponseData(response));
      const report = asObject(responseData?.report);
      const reportDetails = report?.ReportText ?? responseData?.report;
      const details =
        parseMedicalReportDetails(responseData?.boardDetails) ??
        parseMedicalReportDetails(reportDetails);
      if (!details) {
        throw new Error("The medical board response did not contain a report.");
      }
      setBoardDetails((previousDetails) => ({
        ...previousDetails,
        [recordKey]: details,
      }));
      setSelectedHistoryIds((previousIds) => {
        const nextIds = { ...previousIds };
        delete nextIds[recordKey];
        return nextIds;
      });
    } catch (error) {
      console.error("Medical board consultation failed:", error);
      setBoardErrors((previousErrors) => ({
        ...previousErrors,
        [recordKey]: "medicalRecords.errors.consultFailed",
      }));
    } finally {
      setConsultingRecordId(null);
    }
  };

  const handleLoadHistory = async (record: MedicalRecord) => {
    const recordKey = getRecordKey(record.RecordID);
    if (historyOpenRecordId === recordKey) {
      setHistoryOpenRecordId(null);
      return;
    }
    if (historyByRecord[recordKey]) {
      setHistoryOpenRecordId(recordKey);
      return;
    }

    setHistoryLoadingRecordId(recordKey);
    setHistoryErrors((previousErrors) => ({ ...previousErrors, [recordKey]: "" }));
    try {
      const response = await apiClient.get(`/ai-reports/record/${record.RecordID}`);
      const reports = parseReportHistory(getResponseData(response));
      if (!reports) {
        throw new Error("The report history response had an unexpected format.");
      }
      setHistoryByRecord((previousHistory) => ({
        ...previousHistory,
        [recordKey]: reports,
      }));
      setHistoryOpenRecordId(recordKey);
    } catch (error) {
      console.error("Failed to retrieve medical report history:", error);
      setHistoryErrors((previousErrors) => ({
        ...previousErrors,
        [recordKey]: "medicalRecords.board.historyFailed",
      }));
    } finally {
      setHistoryLoadingRecordId(null);
    }
  };

  const handleApproveReport = async (record: MedicalRecord, report: MedicalBoardDetails) => {
    const recordKey = getRecordKey(record.RecordID);
    const finalRecommendation = report.consensusSummary.finalRecommendation.trim();
    if (!finalRecommendation) {
      setBoardErrors((previousErrors) => ({
        ...previousErrors,
        [recordKey]: "medicalRecords.errors.reportMissing",
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
      showNotification("medicalRecords.notifications.reportApproved");
    } catch (error) {
      console.error("Failed to approve medical board report:", error);
      setBoardErrors((previousErrors) => ({
        ...previousErrors,
        [recordKey]: "medicalRecords.errors.approveFailed",
      }));
    } finally {
      setApprovingRecordId(null);
    }
  };

  const handleTogglePrescriptions = async (record: MedicalRecord) => {
    if (!canManagePrescriptions) return;
    const recordKey = getRecordKey(record.RecordID);
    const hasLoadError =
      prescriptionErrors[recordKey] === "medicalRecords.prescriptions.loadFailed";
    if (
      selectedPrescriptionRecordId === recordKey &&
      !hasLoadError
    ) {
      setSelectedPrescriptionRecordId(null);
      return;
    }

    if (selectedPrescriptionRecordId !== recordKey) {
      setPrescriptionMedication("");
      setPrescriptionDosage("");
      setPrescriptionNotes("");
    }
    setSelectedPrescriptionRecordId(recordKey);
    if (Object.prototype.hasOwnProperty.call(prescriptionsByRecord, recordKey)) return;

    setPrescriptionsLoadingRecordId(recordKey);
    setPrescriptionErrors((previousErrors) => ({
      ...previousErrors,
      [recordKey]: "",
    }));
    try {
      const response = await apiClient.get(
        `/prescriptions/record/${record.RecordID}`,
      );
      const prescriptions = parsePrescriptionList(response);
      if (!prescriptions) {
        throw new Error("The server returned an unexpected prescription format.");
      }
      setPrescriptionsByRecord((previousPrescriptions) => ({
        ...previousPrescriptions,
        [recordKey]: prescriptions,
      }));
    } catch (error) {
      console.error("Failed to retrieve prescriptions for medical record:", error);
      setPrescriptionErrors((previousErrors) => ({
        ...previousErrors,
        [recordKey]: "medicalRecords.prescriptions.loadFailed",
      }));
    } finally {
      setPrescriptionsLoadingRecordId(null);
    }
  };

  const handleCreatePrescription = async (
    event: React.FormEvent<HTMLFormElement>,
    record: MedicalRecord,
  ) => {
    event.preventDefault();
    if (!canManagePrescriptions) return;

    const recordKey = getRecordKey(record.RecordID);
    const medication = prescriptionMedication.trim();
    const dosage = prescriptionDosage.trim();
    const parsedRecordId = Number(record.RecordID);
    if (!Number.isSafeInteger(parsedRecordId) || parsedRecordId <= 0) {
      setPrescriptionErrors((previousErrors) => ({
        ...previousErrors,
        [recordKey]: "medicalRecords.prescriptions.invalidRecord",
      }));
      return;
    }
    if (!medication || !dosage) {
      setPrescriptionErrors((previousErrors) => ({
        ...previousErrors,
        [recordKey]: "medicalRecords.prescriptions.requiredFields",
      }));
      return;
    }

    const payload: PrescriptionPayload = {
      RecordID: parsedRecordId,
      Medication: medication,
      Dosage: dosage,
      Notes: prescriptionNotes.trim() || null,
    };

    setPrescriptionSavingRecordId(recordKey);
    setPrescriptionErrors((previousErrors) => ({
      ...previousErrors,
      [recordKey]: "",
    }));
    try {
      const response = await apiClient.post("/prescriptions", payload);
      const responseData = getResponseData(response);
      const createdPrescription = asObject(responseData)?.data ?? responseData;
      if (!isPrescription(createdPrescription)) {
        throw new Error("The server did not return the created prescription.");
      }

      setPrescriptionsByRecord((previousPrescriptions) => ({
        ...previousPrescriptions,
        [recordKey]: [
          createdPrescription,
          ...(previousPrescriptions[recordKey] ?? []),
        ],
      }));
      setPrescriptionMedication("");
      setPrescriptionDosage("");
      setPrescriptionNotes("");
      showNotification("medicalRecords.prescriptions.created");
    } catch (error) {
      console.error("Failed to create prescription:", error);
      setPrescriptionErrors((previousErrors) => ({
        ...previousErrors,
        [recordKey]: "medicalRecords.prescriptions.saveFailed",
      }));
    } finally {
      setPrescriptionSavingRecordId(null);
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

  const formatHistoryDate = (date: string) => {
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      return t("medicalRecords.board.unknownDate");
    }
    return new Intl.DateTimeFormat(i18n.language, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(parsedDate);
  };

  return (
    <div
      dir={i18n.language.startsWith("ar") ? "rtl" : "ltr"}
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
          <span>{t(notif)}</span>
        </div>
      )}

      {(errorMsg || directoryError) && (
        <div role="alert" className="p-4 rounded-xl bg-rose-50 border border-rose-500/20 text-rose-800 text-sm font-semibold flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{t(errorMsg ?? directoryError ?? "medicalRecords.errors.fetchFailed")}</span>
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
              <SearchablePersonSelect
                id="record-patient-id"
                disabled={directoryLoading || patientOptions.length === 0}
                value={patientId}
                people={patientOptions}
                onChange={setPatientId}
                placeholder={
                  directoryLoading
                    ? t("medicalRecords.form.loadingPatients")
                    : patientOptions.length
                      ? t("common.searchByNameOrId")
                      : t("medicalRecords.form.noPatientsAvailable")
                }
                noResultsMessage={t("common.noSearchResults")}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="record-doctor-id" className="text-xs font-semibold text-on-surface-variant block text-start">
                {t("medicalRecords.form.doctorId")}
              </label>
              <SearchablePersonSelect
                id="record-doctor-id"
                disabled={directoryLoading || doctorOptions.length === 0}
                value={doctorId}
                people={doctorOptions}
                onChange={setDoctorId}
                placeholder={
                  directoryLoading
                    ? t("medicalRecords.form.loadingDoctors")
                    : doctorOptions.length
                      ? t("common.searchByNameOrId")
                      : t("medicalRecords.form.noDoctorsAvailable")
                }
                noResultsMessage={t("common.noSearchResults")}
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
            ) : filteredRecords.length === 0 ? (
              <div className="p-16 text-center text-secondary font-semibold">
                {t("medicalRecords.table.noSearchResults", { term: searchTerm })}
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead className="bg-[#f8fafc] border-b border-outline-variant">
                  <tr className="select-none">
                    <th className="px-5 py-3 text-xs font-bold text-secondary uppercase tracking-wider font-sans text-start">{t("medicalRecords.table.recordId")}</th>
                    <th className="px-5 py-3 text-xs font-bold text-secondary uppercase tracking-wider font-sans text-start">{t("medicalRecords.table.patientName")}</th>
                    <th className="px-5 py-3 text-xs font-bold text-secondary uppercase tracking-wider font-sans text-start">{t("medicalRecords.table.doctorName")}</th>
                    <th className="px-5 py-3 text-xs font-bold text-secondary uppercase tracking-wider font-sans text-start">{t("medicalRecords.form.diagnosis")}</th>
                    <th className="px-5 py-3 text-xs font-bold text-secondary uppercase tracking-wider font-sans text-start">{t("medicalRecords.form.treatmentPlan")}</th>
                    <th className="px-5 py-3 text-xs font-bold text-secondary uppercase tracking-wider font-sans text-start">{t("medicalRecords.table.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant font-sans text-xs">
                  {filteredRecords.map((record, index) => {
                    const recordKey = getRecordKey(record.RecordID);
                    const report = boardDetails[recordKey];
                    const isConsulting = consultingRecordId === recordKey;
                    const isApproving = approvingRecordId === recordKey;
                    const isApproved = Boolean(approvedRecords[recordKey]);
                    const isHistoricalReport = Boolean(selectedHistoryIds[recordKey]);
                    const isHistoryLoading = historyLoadingRecordId === recordKey;
                    const isHistoryOpen = historyOpenRecordId === recordKey;
                    const history = historyByRecord[recordKey] ?? [];
                    const isPrescriptionOpen =
                      selectedPrescriptionRecordId === recordKey;
                    const isPrescriptionsLoading =
                      prescriptionsLoadingRecordId === recordKey;
                    const isSavingPrescription =
                      prescriptionSavingRecordId === recordKey;
                    const prescriptions = prescriptionsByRecord[recordKey] ?? [];
                    const shouldShowHistory =
                      isHistoryOpen || isHistoryLoading || Boolean(historyErrors[recordKey]);
                    return (
                      <React.Fragment key={recordKey}>
                        <tr className="hover:bg-primary/5 transition-colors">
                          <td className="px-5 py-4 text-start">
                            <span className="inline-flex items-center rounded-lg border border-primary/15 bg-primary/5 px-3 py-1.5 font-mono text-sm font-bold tracking-wide text-primary">
                              #{index + 1}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-semibold text-on-surface text-start">
                            <span dir="auto">
                              {getPersonLabel(record.PatientName, record.PatientID, patientOptions)}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-semibold text-on-surface text-start">
                            <span dir="auto">
                              {getPersonLabel(record.DoctorName, record.DoctorID, doctorOptions)}
                            </span>
                          </td>
                          <td dir="auto" className="px-5 py-4 font-semibold text-on-surface max-w-xs leading-relaxed text-start">{record.Diagnosis}</td>
                          <td className="px-5 py-4 text-xs text-on-surface-variant max-w-xs leading-relaxed text-start whitespace-pre-line">
                            <p dir="auto">{record.TreatmentPlan}</p>
                          </td>
                          <td className="px-5 py-4 text-start min-w-48">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => void handleConsult(record)}
                                disabled={Boolean(consultingRecordId) || Boolean(approvingRecordId)}
                                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isConsulting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                {t("medicalRecords.board.consult")}
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleLoadHistory(record)}
                                disabled={Boolean(historyLoadingRecordId)}
                                aria-expanded={isHistoryOpen || isHistoryLoading}
                                className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-white px-3 py-2 text-xs font-bold text-primary transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isHistoryLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Clock className="h-4 w-4" />
                                )}
                                {t("medicalRecords.board.historyButton")}
                              </button>
                              {canManagePrescriptions && (
                                <button
                                  type="button"
                                  onClick={() => void handleTogglePrescriptions(record)}
                                  disabled={
                                    Boolean(prescriptionsLoadingRecordId) ||
                                    Boolean(prescriptionSavingRecordId)
                                  }
                                  aria-expanded={isPrescriptionOpen}
                                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                                    isPrescriptionOpen
                                      ? "border-primary bg-primary/5 text-primary"
                                      : "border-outline-variant bg-white text-primary hover:bg-slate-50"
                                  }`}
                                >
                                  <Pill className="h-4 w-4" />
                                  {t("medicalRecords.prescriptions.button")}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isPrescriptionOpen && canManagePrescriptions && (
                          <tr>
                            <td colSpan={6} className="px-5 py-4">
                              <section className="space-y-4 rounded-xl border border-primary/15 bg-slate-50 p-4">
                                <h5 className="font-bold text-primary">
                                  {t("medicalRecords.prescriptions.title", {
                                    id: record.RecordID,
                                  })}
                                </h5>

                                {isPrescriptionsLoading ? (
                                  <div
                                    role="status"
                                    className="flex items-center gap-2 text-sm font-semibold text-secondary"
                                  >
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {t("medicalRecords.prescriptions.loading")}
                                  </div>
                                ) : prescriptionErrors[recordKey] ? (
                                  <div
                                    role="alert"
                                    className="flex flex-wrap items-center gap-3 text-sm font-semibold text-rose-700"
                                  >
                                    <span>
                                      {t(prescriptionErrors[recordKey])}
                                    </span>
                                    {prescriptionErrors[recordKey] ===
                                      "medicalRecords.prescriptions.loadFailed" && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void handleTogglePrescriptions(record)
                                        }
                                        className="font-bold text-primary underline"
                                      >
                                        {t("medicalRecords.prescriptions.retry")}
                                      </button>
                                    )}
                                  </div>
                                ) : prescriptions.length === 0 ? (
                                  <p className="text-sm font-semibold text-secondary">
                                    {t("medicalRecords.prescriptions.empty")}
                                  </p>
                                ) : (
                                  <ul className="space-y-2">
                                    {prescriptions.map((prescription) => (
                                      <li
                                        key={String(prescription.PrescriptionID)}
                                        className="rounded-lg border border-outline-variant bg-white p-3"
                                      >
                                        <p dir="auto" className="font-bold text-on-surface">
                                          {prescription.Medication}
                                        </p>
                                        <p dir="auto" className="mt-1 text-sm text-secondary">
                                          {t("medicalRecords.prescriptions.dosage")}:{" "}
                                          {prescription.Dosage}
                                        </p>
                                        {prescription.Notes?.trim() && (
                                          <p dir="auto" className="mt-1 text-sm text-secondary">
                                            {t("medicalRecords.prescriptions.notes")}:{" "}
                                            {prescription.Notes}
                                          </p>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                )}

                                <form
                                  onSubmit={(event) =>
                                    void handleCreatePrescription(event, record)
                                  }
                                  className="grid gap-3 border-t border-outline-variant pt-4 sm:grid-cols-2"
                                >
                                  <label className="space-y-1 text-xs font-semibold text-on-surface-variant">
                                    <span>{t("medicalRecords.prescriptions.medication")}</span>
                                    <input
                                      type="text"
                                      disabled={isSavingPrescription}
                                      dir="auto"
                                      value={prescriptionMedication}
                                      onChange={(event) =>
                                        setPrescriptionMedication(event.target.value)
                                      }
                                      placeholder={t(
                                        "medicalRecords.prescriptions.medicationPlaceholder",
                                      )}
                                      className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary"
                                    />
                                  </label>
                                  <label className="space-y-1 text-xs font-semibold text-on-surface-variant">
                                    <span>{t("medicalRecords.prescriptions.dosage")}</span>
                                    <input
                                      type="text"
                                      disabled={isSavingPrescription}
                                      dir="auto"
                                      value={prescriptionDosage}
                                      onChange={(event) =>
                                        setPrescriptionDosage(event.target.value)
                                      }
                                      placeholder={t(
                                        "medicalRecords.prescriptions.dosagePlaceholder",
                                      )}
                                      className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary"
                                    />
                                  </label>
                                  <label className="space-y-1 text-xs font-semibold text-on-surface-variant sm:col-span-2">
                                    <span>{t("medicalRecords.prescriptions.notes")}</span>
                                    <textarea
                                      disabled={isSavingPrescription}
                                      dir="auto"
                                      rows={2}
                                      value={prescriptionNotes}
                                      onChange={(event) =>
                                        setPrescriptionNotes(event.target.value)
                                      }
                                      placeholder={t(
                                        "medicalRecords.prescriptions.notesPlaceholder",
                                      )}
                                      className="w-full resize-y rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary"
                                    />
                                  </label>
                                  <button
                                    type="submit"
                                    disabled={
                                      isSavingPrescription || isPrescriptionsLoading
                                    }
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2 sm:justify-self-start"
                                  >
                                    {isSavingPrescription ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Save className="h-4 w-4" />
                                    )}
                                    {t("medicalRecords.prescriptions.add")}
                                  </button>
                                </form>
                              </section>
                            </td>
                          </tr>
                        )}
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
                        {shouldShowHistory && (
                          <tr>
                            <td colSpan={6} className="px-5 py-4">
                              {isHistoryLoading ? (
                                <div role="status" className="flex items-center gap-2 text-sm font-semibold text-secondary">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  {t("medicalRecords.board.historyLoading")}
                                </div>
                              ) : historyErrors[recordKey] ? (
                                <p role="alert" className="text-sm font-semibold text-rose-700">
                                  {t(historyErrors[recordKey])}
                                </p>
                              ) : history.length === 0 ? (
                                <p className="text-sm font-semibold text-secondary">
                                  {t("medicalRecords.board.historyEmpty")}
                                </p>
                              ) : (
                                <ol className="space-y-2">
                                  {history.map((item, index) => (
                                    <li key={`${item.id}-${index}`}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setBoardDetails((previousDetails) => ({
                                            ...previousDetails,
                                            [recordKey]: item.boardDetails,
                                          }));
                                          setSelectedHistoryIds((previousIds) => ({
                                            ...previousIds,
                                            [recordKey]: item.id,
                                          }));
                                        }}
                                        aria-pressed={selectedHistoryIds[recordKey] === item.id}
                                        className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-start text-sm transition-colors ${
                                          selectedHistoryIds[recordKey] === item.id
                                            ? "border-primary bg-primary/5 text-primary"
                                            : "border-outline-variant bg-white text-on-surface hover:bg-slate-50"
                                        }`}
                                      >
                                        <span dir="auto">
                                          {t("medicalRecords.board.historyItem", {
                                            number: index + 1,
                                            date: formatHistoryDate(item.createdAt),
                                          })}
                                        </span>
                                        {selectedHistoryIds[recordKey] === item.id && (
                                          <span className="shrink-0 text-xs font-bold">
                                            {t("medicalRecords.board.historySelected")}
                                          </span>
                                        )}
                                      </button>
                                    </li>
                                  ))}
                                </ol>
                              )}
                            </td>
                          </tr>
                        )}
                        {boardErrors[recordKey] && (
                          <tr>
                            <td colSpan={6} className="px-5 py-3 text-sm font-semibold text-rose-700" role="alert">
                              {t(boardErrors[recordKey])}
                            </td>
                          </tr>
                        )}
                        {report && (
                          <tr>
                            <td colSpan={6} className="p-5">
                              <section className="space-y-4 rounded-2xl border border-primary/15 bg-slate-50 p-4">
                                <h5 className="text-base font-bold text-primary">{t("medicalRecords.board.title")}</h5>
                                {isHistoricalReport && (
                                  <p className="text-xs font-semibold text-secondary">
                                    {t("medicalRecords.board.historyReadOnly")}
                                  </p>
                                )}
                                {report.plainText ? (
                                  <p dir="auto" className="whitespace-pre-line rounded-xl border border-outline-variant bg-white p-4 text-sm text-on-surface">
                                    {report.plainText}
                                  </p>
                                ) : (
                                  <>
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
                                      <h6 className="font-bold">{t("medicalRecords.board.pharmacologist")}</h6>
                                    </div>
                                    <p dir="auto" className="mt-3 font-semibold text-on-surface">{report.deliberation.agent2_pharmacologist.name}</p>
                                    <p dir="auto" className="text-xs text-secondary">{report.deliberation.agent2_pharmacologist.role}</p>
                                    <p dir="auto" className="mt-3 whitespace-pre-line text-sm text-on-surface-variant">{report.deliberation.agent2_pharmacologist.analysis}</p>
                                    {report.deliberation.agent2_pharmacologist.drugWarnings.length > 0 ? (
                                      <div className="mt-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-rose-800">
                                        <h6 className="flex items-center gap-2 text-xs font-bold">
                                          <ShieldAlert className="h-4 w-4 shrink-0" />
                                          {t("medicalRecords.board.drugWarnings")}
                                        </h6>
                                        <ul className="mt-2 list-disc space-y-1 ps-5 text-sm">
                                          {report.deliberation.agent2_pharmacologist.drugWarnings.map(
                                            (warning, index) => (
                                              <li dir="auto" key={`${warning}-${index}`}>{warning}</li>
                                            ),
                                          )}
                                        </ul>
                                      </div>
                                    ) : (
                                      <div className="mt-4">
                                        <h6 className="text-xs font-bold text-on-surface">
                                          {t("medicalRecords.board.drugWarnings")}
                                        </h6>
                                        <p className="mt-2 text-sm text-secondary">
                                          {t("medicalRecords.board.noDrugWarnings")}
                                        </p>
                                      </div>
                                    )}
                                  </article>

                                  <article className="rounded-xl border border-violet-200 bg-white p-4">
                                    <div className="flex items-center gap-2 text-violet-800">
                                      <Crown className="h-5 w-5" />
                                      <h6 className="font-bold">{t("medicalRecords.board.consensusAgent")}</h6>
                                    </div>
                                    <p dir="auto" className="mt-3 font-semibold text-on-surface">{report.deliberation.agent3_consensus.name}</p>
                                    <p dir="auto" className="text-xs text-secondary">{report.deliberation.agent3_consensus.role}</p>
                                    <p dir="auto" className="mt-3 whitespace-pre-line text-sm text-on-surface-variant">{report.deliberation.agent3_consensus.synthesis}</p>
                                    <p
                                      dir="auto"
                                      className={`mt-4 inline-flex rounded-full border px-3 py-1 text-sm font-bold ${
                                        getAgreementScorePercent(
                                          report.deliberation.agent3_consensus.agreementScore,
                                        ) >= 80
                                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                          : "border-rose-300 bg-rose-50 text-rose-800"
                                      }`}
                                    >
                                      {t("medicalRecords.board.agreementScore")}:{" "}
                                      {getAgreementPercentage(
                                        report.deliberation.agent3_consensus.agreementScore,
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
                                    disabled={isApproved || isHistoricalReport || Boolean(approvingRecordId) || Boolean(consultingRecordId)}
                                    title={isHistoricalReport ? t("medicalRecords.board.historyReadOnly") : undefined}
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
                                  </>
                                )}
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
