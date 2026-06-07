// : إعدادات الـ Middleware والـ CORS
// تشغيل السيرفر، واستقبال الطلبات (Requests) القادمة من المستخدمين

import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { createServer as createViteServer } from "vite"; // لإنشاء سيرفر Vite في وضع Middleware لتطوير الواجهة الأمامية بشكل سلس مع
import {
  Patient,
  RoleID,
  RoleName,
  Appointment,
  MedicalRecord,
} from "./src/types.js"; //

const app = express();
const PORT = Number(process.env.PORT) || 3000;

//فحص الطلبات الواردة من متصفح المستخدم الى السيرفر، وتحليلها كـ JSON، وتمكين التعامل مع الكوكيز
app.use(express.json());
app.use(cookieParser());

// Global CORS  مشاركة الموارد بين أصول مختلفة، هو آلية أمان تحمي السيرفر الخاص بك امام المواقع الموثوقة فقط
app.use((req, res, next) => {
  const origin = req.headers.origin; // الحصول على أصل الطلب (الموقع الذي يرسل الطلب) من رأس HTTP
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } // السماح لأي موقع يطلب البيانات بالوصول

  res.setHeader("Access-Control-Allow-Credentials", "true"); // السماح بتبادل الكوكيز و الـ Tokens

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With",
  );

  // معالجة طلب الفحص المسبق للمتصفح ترسل طلباً وهمياً مسبقاً للتأكد من أمان السيرفر قبل إرسال البيانات الحقيقية
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

// ----------------  قاعدة بيانات وهمية للتطوير والاختبار ----------------

//مصفوفة تحتوي على بيانات المرضى الحالية وحالاتهم
let patientsTable: Patient[] = [
  {
    id: "#HMS-2026-9421",
    fullName: "Eleanor Mitchell",
    email: "eleanor.mitchell@hospital.org",
    address: "102 Clinical Way, London, UK",
    dob: "1990-04-12",
    gender: "Female",
    bloodType: "A+",
    department: "Cardiology",
    lastVisit: "May 24, 2026",
    status: "Stable",
  },

  {
    id: "#HMS-2026-8110",
    fullName: "Robert Jenkins",
    email: "robert.jenkins@gmail.com",
    address: "67 Oak Ridge Road, Bristol, UK",
    dob: "1968-11-20",
    gender: "Male",
    bloodType: "O-",
    department: "Neurology",
    lastVisit: "May 25, 2026",
    status: "Critical",
  },

  {
    id: "#HMS-2026-1205",
    fullName: "Sarah Williams",
    email: "sarah.wills@outlook.com",
    address: "12 Meadow Lane, Bath, UK",
    dob: "1999-07-04",
    gender: "Female",
    bloodType: "B+",
    department: "Orthopedics",
    lastVisit: "May 23, 2026",
    status: "Recovering",
  },
];

//تحتوي على المواعيد المحجوزة وتفاصيل الطبيب المعالج والسبب
let appointmentsTable: Appointment[] = [
  {
    id: "APT-8821",
    patientName: "Eleanor Mitchell",
    doctorName: "Dr. Julian Vance",
    dateTime: "2026-05-27T09:30:00Z",
    department: "Cardiology",
    status: "Scheduled",
    reason: "Monthly Pacemaker Verification & Electrocardiography review",
  },
  {
    id: "APT-5412",
    patientName: "Robert Jenkins",
    doctorName: "Dr. Sarah Taylor",
    dateTime: "2026-05-28T14:00:00Z",
    department: "Neurology",
    status: "Pending",
    reason: "Post-stroke cognitive feedback assessment & MRI review",
  },
];

//مصفوفة تحتوي على السجلات الطبية والتشخيص والعلاج الموصوف
let medicalRecordsTable: MedicalRecord[] = [
  {
    id: "REC-9412",
    patientName: "Eleanor Mitchell",
    date: "2026-05-15",
    diagnosis: "Chronic Atrial Fibrillation with moderate ventricular response",
    treatment:
      "Adjusted Metoprolol succinate to 50mg daily; scheduled follow-up Holter monitor.",
    physician: "Dr. Julian Vance",
    status: "Finalized",
  },
];

// دالة تحديد الصلاحيات
function executeRoleResolution(username: string): {
  fullName: string;
  roleId: RoleID;
  roleName: RoleName;
} {
  const norm = username.toLowerCase().trim();
  if (norm.includes("admin")) {
    return {
      fullName: "Dr. Julian Vance",
      roleId: RoleID.Admin,
      roleName: "Admin",
    };
  } else if (norm.includes("doctor")) {
    return {
      fullName: "Dr. Eleanor Vance",
      roleId: RoleID.Doctor,
      roleName: "Doctor",
    };
  } else if (norm.includes("patient")) {
    return {
      fullName: "Sarah Jenkins",
      roleId: RoleID.Patient,
      roleName: "Patient",
    };
  } else {
    return {
      fullName: "Nurse Helen Miller",
      roleId: RoleID.Employee,
      roleName: "Employee",
    };
  }
}

// تسجيل المسارات  بشكل ديناميكي لتقليل التكرار في كتابة الكود لكل مسار
const registerRoute = (
  method: "get" | "post" | "put" | "delete",
  route: string, // مسار API الأساسي بدون بادئة /api
  handler: (req: express.Request, res: express.Response) => void,
) => {
  app[method](route, handler); //تمرير المسار والدالة المسؤولة عنه لتسجيله في السيرفر
  app[method](`/api${route}`, handler); // تسجيل نفس المسار مع بادئة /api
};

// ---------------- AUTHENTICATION CONTROLLERS ----------------

//مسار تسجيل الدخول
registerRoute("post", "/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Authentication credentials are required." });
    return;
  }

  // استدعاء دالة الصلاحيات لتحديد دور المستخدم بناءً ع  المدخلات
  const { fullName, roleId, roleName } = executeRoleResolution(username);

  res.cookie("jwt", `session-token-identity-scope-${roleId}-usr-${username}`, {
    httpOnly: true, //لحماية الكوكيز من السرقة عبر برمجيات الخبيثة (Scripts) في المتصفح
    secure: process.env.NODE_ENV === "production", //إرسال الكوكيز  عبر بروتوكول آمن https
    sameSite: "lax",
    maxAge: 86400000, //تحديد مدة صلاحية الكوكيز ليوم واحد (24 ساعة)
  });

  //إرجاع استجابة تحتوي على معلومات المستخدم بعد تسجيل الدخول بنجاح
  res.json({
    success: true,
    user: { username, fullName, roleId, roleName },
  });
});
//مسار التحقق من الجلسة النشطة
registerRoute("get", "/auth/me", (req, res) => {
  const jwtCookie = req.cookies.jwt;
  if (!jwtCookie) {
    res
      .status(401)
      .json({ authenticated: false, error: "Missing active session context." });
    return;
  }

  //تحليل الكوكيز لاستخراج معلومات الدور واسم المستخدم للتحقق من صحة الجلسة
  const match = jwtCookie.match(/session-token-identity-scope-(\d+)-usr-(.+)/);
  if (!match) {
    res.status(401).json({
      authenticated: false,
      error: "Invalid session structure tokens.",
    });
    return;
  }

  //استخراج معلومات الدور واسم المستخدم  المحدثين من الكوكيز
  const roleId: RoleID = parseInt(match[1]);
  const username = match[2];
  const { fullName, roleName } = executeRoleResolution(username);

  // إرجاع استجابة تحتوي على معلومات المستخدم وتكون الجلسة صالحة
  res.json({
    authenticated: true,
    user: { username, fullName, roleId, roleName },
  });
});

// مسار تسجيل الخروج
registerRoute("post", "/auth/logout", (req, res) => {
  res.clearCookie("jwt"); //مسح الكوكيز لإلغاء الجلسة النشطة
  res.json({
    success: true,
    message: "Session structures terminated successfully.",
  }); // إرجاع استجابة تؤكد تسجيل الخروج بنجاح والعودةالى صفحة تسجيل الدخول
});

// ---------------- PATIENT REGISTRY ROUTING ----------------

//تستخدم العيادة مسار لجلب قائمة المرضى
registerRoute("get", "/patients", (req, res) => {
  res.json(patientsTable);
});

// مسار إضافة مريض جديد
registerRoute("post", "/patients", (req, res) => {
  const { username, fullName, email, address, dob, gender, bloodType } =
    req.body;

  //  التحقق من وجود جميع الحقول المطلوبة لتسجيل المريض الجديد ما عدا اسم المستخدم لانه اختياري
  if (!fullName || !email || !address || !dob || !gender || !bloodType) {
    res.status(400).json({
      error: "Required clinical registration parameters are missing.",
    });
    return;
  }

  // إنشاء معرف فريد للمريض الجديد باستخدام تنسيق محدد يتضمن اختصار لاسم النظام سنة التسجيل ورقم عشوائي
  const newId = `#HMS-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const genderFormatted = (gender.charAt(0).toUpperCase() +
    gender.slice(1).toLowerCase()) as "Male" | "Female" | "Other"; //تنسيق حقل الجنس بحرف كبير في البداية وباقي الحروف صغيرة

  //  إنشاء كائن جديد يمثل المريض الجديد باستخدام البيانات المستلمة من الطلب
  const newPatient: Patient = {
    id: newId,
    username: username || email.split("@")[0], // إذا لم يتم توفير اسم مستخدم، يتم توليده من الجزء الاول من البريد الإلكتروني
    fullName,
    email,
    address,
    dob,
    gender: genderFormatted,
    bloodType,
    department: "General Medicine", //تعيين القسم الافتراضي للمريض الجديد
    lastVisit: new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    status: "Stable",
  };

  //إضافة المريض الجديد إلى بداية قائمة المرضى الحالية لإظهاره في الواجهة الأمامية بشكل فوري
  patientsTable.unshift(newPatient);
  res.status(201).json({ success: true, patient: newPatient }); //لرمز 201 في بروتوكولات الـ http  ، أي تم إنشاء البيانات بنجاح في السيرفر
});

// ----------------  APPOINTMENTS ROUTING ----------------
// تستخدم العيادة مسار لجلب قائمة المواعيد الحالية
registerRoute("get", "/appointments", (req, res) => {
  res.json(appointmentsTable);
});
// مسار حجز موعد جديد
registerRoute("post", "/appointments", (req, res) => {
  const { patientName, doctorName, dateTime, department, reason } = req.body;
  if (!patientName || !doctorName || !dateTime || !department) {
    res.status(400).json({ error: "Required scheduling metrics are missing." });
    return;
  }
  // إنشاء كائن جديد يمثل الموعد الجديد باستخدام البيانات المستلمة من الطلب وتوليد معرف فريد له
  const newApt: Appointment = {
    id: `APT-${Math.floor(1000 + Math.random() * 9000)}`,
    patientName,
    doctorName,
    dateTime,
    department,
    status: "Scheduled",
    reason: reason || "Standard outpatient clinical evaluation.",
  };
  // إضافة الموعد الجديد إلى بداية قائمة المواعيد الحالية لإظهاره في الواجهة الأمامية بشكل فوري
  appointmentsTable.unshift(newApt);
  res.status(201).json({ success: true, appointment: newApt });
});

// ---------------- MEDICAL RECORDS ROUTING ----------------
// تستخدم العيادة مسار لجلب قائمة السجلات الطبية الحالية
registerRoute("get", "/medical-records", (req, res) => {
  res.json(medicalRecordsTable);
});
// مسار إضافة سجل طبي جديد
registerRoute("post", "/medical-records", (req, res) => {
  const { patientName, date, diagnosis, treatment, physician } = req.body;
  if (!patientName || !diagnosis || !physician) {
    res
      .status(400)
      .json({ error: "Required health information fields are missing." });
    return;
  }
  // إنشاء كائن جديد يمثل السجل الطبي الجديد باستخدام البيانات المستلمة من الطلب وتوليد معرف فريد له
  const newRec: MedicalRecord = {
    id: `REC-${Math.floor(1000 + Math.random() * 9000)}`,
    patientName,
    date: date || new Date().toISOString().split("T")[0],
    diagnosis,
    treatment:
      treatment || "Standard observation and diagnostic pipeline reporting.",
    physician,
    status: "Draft",
  };
  // إضافة السجل الطبي الجديد إلى بداية قائمة السجلات الطبية الحالية لإظهاره في الواجهة الأمامية بشكل فوري
  medicalRecordsTable.unshift(newRec);
  res.status(201).json({ success: true, record: newRec });
});

// ---------------- EXPRESS + VITE INTERACTIVE MIDDLEWARE ----------------
//دالة غير متزامنةلان تشغيل السيرفر يحتاج الى انتظار قراءة ملفات

async function initializeServerSupport() {
  // داخل مرحلة التطوير
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    // ربط سيرفر Vite كـ Middleware في سيرفر Express
    app.use(vite.middlewares);
    console.log("Core System Pipeline: Vite ecosystem linked dynamically.");
  }

  // داخل مرحلة الانتاج
  else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath)); //تقديم الملفات الثابتة من  الذي يحتوي على النسخة المجمعة من الواجهة الأمامية
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    // أي طلب غير معروف يتم توجيهه إلى ملف index.html ليتم التعامل معه من قبل الواجهة الأمامية )
    console.log("Core System Pipeline: Production static distribution ready.");
  }
  // تشغيل السيرفر والاستماع على المنفذ المحدد لاستقبال الطلبات من المستخدمين
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server environment active on port: ${PORT}`);
  });
}
// استدعاء وتنفيذ الدالة أعلاه لتبدأ المنظومة بأكملها في العمل عند تشغيل الملف
initializeServerSupport();