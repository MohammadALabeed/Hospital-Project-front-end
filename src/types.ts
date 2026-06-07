//نستخدمه لضمان "سلامة النوع" (Type Safety) ومنع الأخطاء البرمجية أثناء تمرير البيانات بين المكونات بفضل الـ TypeScript.
// تحديد الأدوار المختلفة في النظام باستخدام (Enum)
export enum RoleID {
  Admin = 1,
  Doctor = 2,
  Employee = 3,
  Patient = 4,
}

// تحديد أسماء الأدوار المختلفة في النظام باستخدام نوع (Type)
export type RoleName = "Admin" | "Doctor" | "Employee" | "Patient";

// تحدد هيكل البيانات الذي سيتناقله الخادم مع المتصفح لتعريف هيكل المستخدم المُسجل دخوله حالياً
export interface UserSession {
  username: string;
  fullName: string;
  roleId: RoleID;
  roleName: RoleName;
}

// المريض في قاعدة البيانات
export interface Patient {
  id: string;
  username?: string;
  fullName: string;
  email: string;
  address: string;
  dob: string;
  gender: "Male" | "Female" | "Other";
  bloodType: string;
  department: string;
  lastVisit: string;
  status: "Stable" | "Critical" | "Recovering" | "Observation";
}

// المواعيد في قاعدة البيانات
export interface Appointment {
  id: string;
  patientName: string;
  doctorName: string;
  dateTime: string;
  department: string;
  status: "Scheduled" | "Completed" | "Pending" | "Cancelled" | "In Progress"; // تم إضافة In Progress للتوافق مع شاشات الانتظار
  reason: string;
}

// السجلات الطبية في قاعدة البيانات لضمان دقة الـ Data Flow مع الـ Frontend
export interface MedicalRecord {
  id: string;
  patientName: string;
  date?: string; // جعلناه اختيارياً لأن النموذج لا يرسله مباشرة بل يحدده السيرفر أو يظهر ديناميكياً
  diagnosis: string;
  treatment: string;
  physician: string;
  status?: "Finalized" | "Draft" | "Pending Review"; // اختياري ليتوافق مع الـ Payload القادم من الـ Form
}
