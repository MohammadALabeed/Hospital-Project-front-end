// الإطار الخارجي للنظام
import React, { useState } from "react";
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
} from "lucide-react"; 
import { useTranslation } from "react-i18next";
import { UserSession, RoleID } from "../types.js";

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
  const [serverOnline, setServerOnline] = useState(true);

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
      label: t("layout.sidebar.dashboard", "Dashboard"),
      icon: LayoutDashboard,
    },
    {
      id: "patients",
      label: t("layout.sidebar.patients", "Patients Registry"),
      icon: Users,
    },
    {
      id: "appointments",
      label: t("layout.sidebar.appointments", "Appointments"),
      icon: Calendar,
    },
    {
      id: "medical-records",
      label: t("layout.sidebar.medicalRecords", "Medical Records"),
      icon: ClipboardList,
    },
  ];
  
  // دالة تحديد نصوص وألوان شارات الصلاحيات (Admin, Doctor, Staff) مضافاً إليها دعم الترجمة
  const getRoleColorAndLabel = (id: RoleID) => {
    switch (id) {
      case RoleID.Admin:
        return {
          text: t("layout.roles.admin", "Admin"),
          style: "bg-red-500/10 border-red-500/20 text-red-600",
        };
      case RoleID.Doctor:
        return {
          text: t("layout.roles.doctor", "Doctor"),
          style: "bg-indigo-500/10 border-indigo-500/20 text-indigo-600",
        };
      default:
        return {
          text: t("layout.roles.staff", "Staff"),
          style: "bg-zinc-500/10 border-zinc-500/20 text-zinc-600",
        };
    }
  };

  const badgeProps = getRoleColorAndLabel(user.roleId);
  const isRtl = i18n.language === "ar";
  
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
      <aside className={`w-64 bg-white flex flex-col h-full shrink-0 ${isRtl ? "border-l" : "border-r"} border-outline-variant`}>
        
        {/* قسم الشعار والاسم (Header) */}
        <div className="p-6 border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-primary text-white rounded-xl shadow-md">
              <BriefcaseMedical className="w-5 h-5" />
            </span>
            <div>
              <h1 className="font-bold text-lg text-primary tracking-tight">
                MedCenter Pro
              </h1>
              <p className="text-[10px] text-secondary tracking-widest uppercase font-semibold leading-none mt-1">
                {t("layout.sidebar.systemBrand", "Hospital System")}
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
                <Icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-secondary"}`}/>
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
              <p className="text-xs font-bold text-on-surface truncate">
                {user.fullName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 justify-start">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 border rounded-full capitalize ${badgeProps.style}`}>
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
            <span>{t("layout.sidebar.logout", "Sign Out")}</span>
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
              placeholder={t("layout.navbar.searchPlaceholder", "Search patient charts...")}
              className={`w-full bg-slate-50 border border-outline-variant rounded-lg py-2.5 ${
                isRtl ? "pr-10 pl-4 text-right" : "pl-10 pr-4 text-left"
              } text-xs font-sans focus:outline-none focus:ring-2 focus:ring-primary transition-all`}
            />
          </div>

          {/* أزرار الإجراءات، تغيير اللغة ومؤشر الاتصال */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-4 py-1.5 border border-primary bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-all focus:outline-none cursor-pointer shadow-sm z-50"
            >
              {/* النص هنا يعكس دائماً اسم اللغة الأخرى للتحويل إليها بشكل منطقي */}
              <span>{isRtl ? "English" : "العربية"}</span>
            </button>

            <button
              onClick={() => setServerOnline(!serverOnline)}
              className={`flex items-center gap-2 px-3 py-1.5 border rounded-full transition-all focus:outline-none select-none text-xs font-bold cursor-pointer hover:bg-slate-50 ${
                serverOnline
                  ? "bg-emerald-50 border-emerald-500/20 text-emerald-700"
                  : "bg-amber-50 border-amber-500/20 text-amber-700"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${serverOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              <span>
                {serverOnline 
                  ? t("layout.navbar.statusOnline", "System: Online") 
                  : t("layout.navbar.statusOffline", "System: Offline")}
              </span>
            </button>

            <button
              onClick={() => alert("No new system notifications.")}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-600 cursor-pointer transition-colors focus:outline-none relative"
            >
              <Bell className="w-5 h-5" />
              <span className={`absolute top-1.5 ${isRtl ? "left-1.5" : "right-1.5"} w-2 h-2 bg-red-500 rounded-full border-2 border-white`} />
            </button>

            <button
              onClick={() => alert("Settings panel is under maintenance.")}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-600 cursor-pointer transition-colors focus:outline-none"
            >
              <Settings className="w-5 h-5" />
            </button>

            <button
              onClick={() => alert("Documentation and support gateway.")}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-600 cursor-pointer transition-colors focus:outline-none"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* مساحة العرض المركزية والحرّة لكل صفحة على حدة */}
        <main className="flex-1 overflow-y-auto p-10 bg-[#f8f9fb]">
          {children}
        </main>
      </div>
    </div>
  );
}