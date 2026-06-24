// إرسال الطلبات  إلى السيرفر  وجلب البيانات منه

//تُستخدم لإرسال طلبات الـ HTTP (GET, POST, DELETE) من المتصفح إلى السيرفر
import axios from "axios";

//تأكد من إرفاق ملفات تعريف الارتباط  وجلسات التعريف  أو توكن الحماية  تلقائياً مع الطلب
axios.defaults.withCredentials = true;

//الرابط الذي يعمل عليه الفرونت والباك معا
const API_BASE_URL = "";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,

  withCredentials: true, //تأكيد إضافي داخل هذه النسخة المخصصة لإرسال الـ Cookies مع كل طلب

  headers: {
    "Content-Type": "application/json", //طلباتي ستكون دائماً بصيغة JSON
  },
});
