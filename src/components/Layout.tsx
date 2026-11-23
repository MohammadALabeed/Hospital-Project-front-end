// الإطار الخارجي للنظام
import React, { useEffect, useState } from "react";
import {
  BriefcaseMedical,
  LayoutDashboard,
  Users,
  Calendar,
  ClipboardList,
  LogOut,
  Search,
  Bell,
  Settings,
  HelpCircle,
  Stethoscope,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { UserSession, RoleID } from "../types.js";
import { apiClient } from "../api.js";

// شروط البيانات المستقبلة (Props) للمكون
interface LayoutProps {
  children: React.ReactNode;
  currentTab: string;
  onTabChange: (tab: string) => void;
  user: UserSession;
  onLogout: () => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
}

type SearchTab = "patients" | "appointments" | "medical-records" | "doctors";

interface QuickSearchResult {
  key: string;
  label: string;
  detail: string;
  tab: SearchTab;
}

interface QuickSearchSource {
  data: unknown;
  idField: string;
  nameFields: string[];
  searchFields: string[];
  category: string;
  tab: SearchTab;
}

const getSearchRecords = (value: unknown): Record<string, unknown>[] => {
  if (
    !Array.isArray(value) ||
    !value.every(
      (record) =>
        record !== null && typeof record === "object" && !Array.isArray(record),
    )
  ) {
    throw new Error("The server returned an unexpected global search response.");
  }
  return value as Record<string, unknown>[];
};

const getSearchText = (value: unknown) =>
  typeof value === "string" || typeof value === "number" ? String(value) : "";

const buildQuickSearchResults = (
  query: string,
  sources: QuickSearchSource[],
): QuickSearchResult[] => {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const results: QuickSearchResult[] = [];

  sources.forEach((source) => {
    getSearchRecords(source.data).forEach((record) => {
      const id = getSearchText(record[source.idField]);
      if (!id) throw new Error(`The ${source.tab} search result is missing its ID.`);

      const name = source.nameFields
        .map((field) => getSearchText(record[field]).trim())
        .find(Boolean);
      const detailValues = source.searchFields
        .map((field) => getSearchText(record[field]).trim())
        .filter(Boolean);
      const searchableText = [id, name, ...detailValues].join(" ").toLocaleLowerCase();
      if (!searchableText.includes(normalizedQuery)) return;

      results.push({
        key: `${source.tab}:${id}`,
        label: name || `#${id}`,
        detail: `${source.category} · #${id}`,
        tab: source.tab,
      });
    });
  });

  return results.slice(0, 10);
};

export default function Layout({
  children,
  currentTab,
  onTabChange,
  user,
  onLogout,
  searchTerm,
  onSearchChange,
}: LayoutProps) {
  const { t, i18n } = useTranslation();
  const [serverOnline, setServerOnline] = useState(false);
  const [showQuickGuide, setShowQuickGuide] = useState(false);
  const [quickSearchResults, setQuickSearchResults] = useState<QuickSearchResult[]>([]);
  const [quickSearchLoading, setQuickSearchLoading] = useState(false);
  const [quickSearchError, setQuickSearchError] = useState<string | null>(null);
  const [quickSearchFocused, setQuickSearchFocused] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const checkServerStatus = async () => {
      try {
        await apiClient.get("/health", { timeout: 5000 });
        if (isMounted) setServerOnline(true);
      } catch {
        if (isMounted) setServerOnline(false);
      }
    };

    void checkServerStatus();
    const intervalId = window.setInterval(() => {
      void checkServerStatus();
    }, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    const query = searchTerm.trim();
    if (currentTab !== "dashboard" || !query) {
      setQuickSearchResults([]);
      setQuickSearchLoading(false);
      setQuickSearchError(null);
      return () => {
        isActive = false;
      };
    }

    if (user.roleId !== RoleID.Admin && user.roleId !== RoleID.Doctor) {
      setQuickSearchResults([]);
      setQuickSearchLoading(false);
      setQuickSearchError("layout.navbar.quickSearchUnavailable");
      return () => {
        isActive = false;
      };
    }

    setQuickSearchLoading(true);
    setQuickSearchError(null);
    const timeoutId = window.setTimeout(async () => {
      try {
        const [patientsResponse, appointmentsResponse, recordsResponse, doctorsResponse] =
          await Promise.all([
            apiClient.get("/patients"),
            apiClient.get("/appointments"),
            apiClient.get("/medical-records"),
            user.roleId === RoleID.Admin ? apiClient.get("/doctors") : Promise.resolve(null),
          ]);
        if (!isActive) return;

        const sources: QuickSearchSource[] = [
          {
            data: patientsResponse.data,
            idField: "PatientID",
            nameFields: ["PatientName", "FullName"],
            searchFields: ["UserID", "Email", "Address", "BloodType"],
            category: t("layout.sidebar.patients"),
            tab: "patients",
          },
          {
            data: appointmentsResponse.data,
            idField: "AppointmentID",
            nameFields: ["PatientName", "DoctorName"],
            searchFields: [
              "PatientID",
              "DoctorID",
              "PatientName",
              "DoctorName",
              "AppointmentDate",
              "Status",
            ],
            category: t("layout.sidebar.appointments"),
            tab: "appointments",
          },
          {
            data: recordsResponse.data,
            idField: "RecordID",
            nameFields: ["PatientName", "Diagnosis"],
            searchFields: [
              "PatientID",
              "DoctorID",
              "DoctorName",
              "Diagnosis",
              "TreatmentPlan",
            ],
            category: t("layout.sidebar.medicalRecords"),
            tab: "medical-records",
          },
        ];
        if (doctorsResponse) {
          sources.push({
            data: doctorsResponse.data,
            idField: "DoctorID",
            nameFields: ["DoctorName", "FullName"],
            searchFields: [
              "UserID",
              "Specialization",
              "Specialty",
              "ClinicNumber",
            ],
            category: t("layout.sidebar.doctors"),
            tab: "doctors",
          });
        }
        setQuickSearchResults(buildQuickSearchResults(query, sources));
      } catch (error) {
        console.error("Failed to retrieve global search results:", error);
        if (isActive) {
          setQuickSearchResults([]);
          setQuickSearchError("layout.navbar.quickSearchFailed");
        }
      } finally {
        if (isActive) setQuickSearchLoading(false);
      }
    }, 250);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [currentTab, i18n.language, searchTerm, t, user.roleId]);

  useEffect(() => {
    if (!showQuickGuide) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowQuickGuide(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showQuickGuide]);

  // دالة تحديد مسار الصورة الشخصية حسب رتبة المستخدم
  const getAvatar = () => {
    switch (user.roleId) {
      case RoleID.Admin:
        return "/assets/avatars/admin.png";
      case RoleID.Doctor:
        return "/assets/avatars/doctor.png";
      default:
        return "/assets/avatars/user.png";
    }
  };

  // مصفوفة عناصر وعناوين أزرار القائمة الجانبية
  const navItems = [
    {
      id: "dashboard",
      label: t("layout.sidebar.dashboard"),
      icon: LayoutDashboard,
    },
    {
      id: "patients",
      label: t("layout.sidebar.patients"),
      icon: Users,
    },
    {
      id: "appointments",
      label: t("layout.sidebar.appointments"),
      icon: Calendar,
    },
    {
      id: "medical-records",
      label: t("layout.sidebar.medicalRecords"),
      icon: ClipboardList,
    },
    ...(user.roleId === RoleID.Admin
      ? [
          {
            id: "doctors",
            label: t("layout.sidebar.doctors"),
            icon: Stethoscope,
          },
        ]
      : []),
  ];

  // دالة تحديد نصوص وألوان شارات الصلاحيات (Admin, Doctor, Staff) مضافاً إليها دعم الترجمة
  const getRoleColorAndLabel = (id: RoleID) => {
    switch (id) {
      case RoleID.Admin:
        return {
          text: t("layout.roles.admin"),
          style: "bg-red-500/10 border-red-500/20 text-red-600",
        };
      case RoleID.Doctor:
        return {
          text: t("layout.roles.doctor"),
          style: "bg-indigo-500/10 border-indigo-500/20 text-indigo-600",
        };
      case RoleID.Employee:
        return {
          text: t("layout.roles.employee"),
          style: "bg-zinc-500/10 border-zinc-500/20 text-zinc-600",
        };
      case RoleID.Patient:
        return {
          text: t("layout.roles.patient"),
          style: "bg-teal-500/10 border-teal-500/20 text-teal-600",
        };
      default:
        return {
          text: t("layout.roles.staff"),
          style: "bg-zinc-500/10 border-zinc-500/20 text-zinc-600",
        };
    }
  };

  const badgeProps = getRoleColorAndLabel(user.roleId);
  const isRtl = i18n.language.startsWith("ar");

  // دالة التبديل السريع بين اللغتين العربية والإنجليزية
  const toggleLanguage = () => {
    const nextLang = isRtl ? "en" : "ar";
    i18n.changeLanguage(nextLang);
  };

  return (
    // الحاوية الرئيسية الواجهة بالكامل ودعم اتجاه الصفحات RTL/LTR بشكل ديناميكي
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="flex h-screen w-full bg-surface-container-low text-on-surface 
      antialiased overflow-hidden font-sans"
    >
      {/* القائمة الجانبية للنظام (Sidebar) */}
      <aside
        className={`w-64 bg-white flex flex-col h-full shrink-0 ${isRtl ? "border-l" : "border-r"} border-outline-variant`}
      >
        {/* قسم الشعار والاسم (Header) */}
        <div className="p-6 border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-primary text-white rounded-xl shadow-md">
              <BriefcaseMedical className="w-5 h-5" />
            </span>
            <div>
              <h1 className="font-bold text-lg text-primary tracking-tight">
                {t("common.brandName")}
              </h1>
              <p className="text-[10px] text-secondary tracking-widest uppercase font-semibold leading-none mt-1">
                {t("layout.sidebar.systemBrand")}
              </p>
            </div>
          </div>
        </div>

        {/* قائمة أزرار التنقل بين أقسام النظام */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3.5 px-4.5 py-3.5 rounded-xl font-semibold text-sm transition-all focus:outline-none cursor-pointer ${
                  isRtl ? "text-right" : "text-left"
                } ${
                  isActive
                    ? `text-primary bg-slate-100 ${isRtl ? "border-r-4" : "border-l-4"} border-primary`
                    : "text-secondary hover:bg-slate-50 hover:text-on-surface"
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${isActive ? "text-primary" : "text-secondary"}`}
                />
                <span className="flex-1">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* أسفل القائمة الجانبية: كارت الموظف الحالي وزر تسجيل الخروج */}
        <div className="p-4 border-t border-outline-variant bg-slate-50">
          <div className="flex items-center gap-3 p-2.5 rounded-xl">
            <img
              src={getAvatar()}
              alt={user.fullName}
              className="w-10 h-10 rounded-full object-cover border border-outline-variant/60 shadow-inner"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%23ccc' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'></circle><circle cx='12' cy='10' r='3'></circle><path d='M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662'></path></svg>";
              }}
            />

            <div className="flex-1 min-w-0">
              <p dir="auto" className="text-xs font-bold text-on-surface truncate">
                {user.fullName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 justify-start">
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 border rounded-full capitalize ${badgeProps.style}`}
                >
                  {badgeProps.text}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            className={`w-full flex items-center gap-3.5 px-4.5 py-3 mt-3 text-red-600 font-semibold text-sm rounded-xl hover:bg-red-50 transition-all focus:outline-none cursor-pointer ${
              isRtl ? "text-right" : "text-left"
            }`}
          >
            <LogOut className="w-5 h-5" />
            <span>{t("layout.sidebar.logout")}</span>
          </button>
        </div>
      </aside>

      {/* القسم الرئيسي للمحتوى */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* الشريط العلوي للصفحة (Navbar) */}
        <header className="h-18 shrink-0 border-b border-outline-variant bg-white flex justify-between items-center px-10">
          {/* حقل البحث العالمي وسياق الأيقونة المتغير */}
          <div className="flex items-center gap-3 flex-1 max-w-md relative group">
            <Search
              className={`absolute ${isRtl ? "right-3.5" : "left-3.5"} top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors w-4 h-4`}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => setQuickSearchFocused(true)}
              onBlur={() => {
                window.setTimeout(() => setQuickSearchFocused(false), 120);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") setQuickSearchFocused(false);
              }}
              dir="auto"
              placeholder={t(
                "layout.navbar.searchPlaceholder",
              )}
              className={`w-full bg-slate-50 border border-outline-variant rounded-lg py-2.5 ${
                isRtl ? "pr-10 pl-4 text-right" : "pl-10 pr-4 text-left"
              } text-xs font-sans focus:outline-none focus:ring-2 focus:ring-primary transition-all`}
            />
            {currentTab === "dashboard" &&
              searchTerm.trim() &&
              quickSearchFocused && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border border-outline-variant bg-white p-2 shadow-xl">
                  {quickSearchLoading ? (
                    <p role="status" className="px-3 py-2 text-sm text-secondary">
                      {t("layout.navbar.quickSearchLoading")}
                    </p>
                  ) : quickSearchError ? (
                    <p role="alert" className="px-3 py-2 text-sm text-rose-700">
                      {t(quickSearchError)}
                    </p>
                  ) : quickSearchResults.length ? (
                    <ul role="listbox" aria-label={t("layout.navbar.quickSearchResults")}>
                      {quickSearchResults.map((result) => (
                        <li key={result.key}>
                          <button
                            type="button"
                            role="option"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setQuickSearchFocused(false);
                              onTabChange(result.tab);
                            }}
                            className="w-full rounded-lg px-3 py-2 text-start transition-colors hover:bg-primary/5 focus:bg-primary/5 focus:outline-none"
                          >
                            <span dir="auto" className="block truncate text-sm font-semibold text-on-surface">
                              {result.label}
                            </span>
                            <span className="block text-xs text-secondary">{result.detail}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-3 py-2 text-sm text-secondary">
                      {t("layout.navbar.quickSearchNoResults")}
                    </p>
                  )}
                </div>
              )}
          </div>

          {/* أزرار الإجراءات، تغيير اللغة ومؤشر الاتصال */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-4 py-1.5 border border-primary bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-all focus:outline-none cursor-pointer shadow-sm z-50"
            >
              {/* النص هنا يعكس دائماً اسم اللغة الأخرى للتحويل إليها بشكل منطقي */}
              <span>
                {isRtl
                  ? t("common.languageEnglish")
                  : t("common.languageArabic")}
              </span>
            </button>

            <div
              role="status"
              aria-live="polite"
              className={`flex items-center gap-2 px-3 py-1.5 border rounded-full select-none text-xs font-bold ${
                serverOnline
                  ? "bg-emerald-50 border-emerald-500/20 text-emerald-700"
                  : "bg-rose-50 border-rose-500/20 text-rose-700"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${serverOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}
              />
              <span>
                {serverOnline
                  ? t("layout.navbar.statusOnline")
                  : t("layout.navbar.statusOffline")}
              </span>
            </div>

            <button
              type="button"
              title={t("layout.navbar.notificationsComingSoon")}
              onClick={() =>
                alert(
                  t("layout.navbar.noNotifications"),
                )
              }
              className="p-2 hover:bg-slate-100 rounded-full text-slate-600 cursor-pointer transition-colors focus:outline-none relative"
            >
              <Bell className="w-5 h-5" />
              <span
                className={`absolute top-1.5 ${isRtl ? "left-1.5" : "right-1.5"} w-2 h-2 bg-red-500 rounded-full border-2 border-white`}
              />
            </button>

            <button
              type="button"
              title={t("layout.navbar.settingsComingSoon")}
              onClick={() =>
                alert(
                  t("layout.navbar.settingsMaintenance"),
                )
              }
              className="p-2 hover:bg-slate-100 rounded-full text-slate-600 cursor-pointer transition-colors focus:outline-none"
            >
              <Settings className="w-5 h-5" />
            </button>

            <button
              type="button"
              title={t("layout.navbar.quickGuideTitle")}
              aria-label={t("layout.navbar.quickGuideTitle")}
              onClick={() => setShowQuickGuide(true)}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-600 cursor-pointer transition-colors focus:outline-none"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </header>

        {showQuickGuide && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setShowQuickGuide(false);
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="quick-guide-title"
              dir={isRtl ? "rtl" : "ltr"}
              className="w-full max-w-xl rounded-2xl border border-outline-variant bg-white p-6 shadow-2xl"
            >
              <header className="mb-5 flex items-start justify-between gap-4">
                <h2 id="quick-guide-title" className="text-xl font-bold text-primary">
                  {t("layout.navbar.quickGuideTitle")}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowQuickGuide(false)}
                  aria-label={t("layout.navbar.closeGuide")}
                  className="shrink-0 rounded-lg p-2 text-secondary transition-colors hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>
              <ul className="list-inside list-disc space-y-4 text-sm leading-7 text-on-surface">
                <li>{t("layout.navbar.quickGuidePatientsAppointments")}</li>
                <li>{t("layout.navbar.quickGuideMedicalBoard")}</li>
                <li>{t("layout.navbar.quickGuidePermissions")}</li>
              </ul>
            </section>
          </div>
        )}

        {/* مساحة العرض المركزية والحرّة لكل صفحة على حدة */}
        <main className="flex-1 overflow-y-auto p-10 bg-[#f8f9fb]">
          {children}
        </main>
      </div>
    </div>
  );
}
