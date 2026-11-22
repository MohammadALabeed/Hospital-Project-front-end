import axios from "axios";

const configuredApiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

const getApiBaseUrl = (baseUrl: string): string => {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const pageHost = window.location.hostname;
  if (pageHost !== "localhost" && pageHost !== "127.0.0.1") {
    return normalizedBaseUrl;
  }

  try {
    const parsedUrl = new URL(normalizedBaseUrl);
    if (parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1") {
      parsedUrl.hostname = pageHost;
      return parsedUrl.toString().replace(/\/+$/, "");
    }
  } catch {
    return normalizedBaseUrl;
  }

  return normalizedBaseUrl;
};

const API_BASE_URL = getApiBaseUrl(configuredApiBaseUrl);

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // ضروري جداً لإرسال واستقبال كوكيز JWT (HttpOnly)
  headers: {
    "Content-Type": "application/json",
  },
});

// 2. معترض الاستجابات (Response Interceptor) للتعامل المركزي مع انتهاء الجلسة
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // في حال انتهاء صلاحية التوكن أو عدم المصادقة
    if (error.response && error.response.status === 401) {
      console.warn("انتهت الجلسة أو غير مصرح بالوصول.");
      // يمكن هنا مسح حالة المستخدم المحلية إذا لزم الأمر
    }
    return Promise.reject(error);
  }
);

// 3. دوال المصادقة (Auth Services) جاهزة للاستدعاء في شاشة الدخول
export interface LoginCredentials {
  username?: string;
  email?: string;
  password: string;
}

export const authService = {
  login: async (credentials: LoginCredentials) => {
    const response = await apiClient.post("/auth/login", credentials);
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post("/auth/logout");
    return response.data;
  },

  // للتحقق من الجلسة الحالية عند تحديث الصفحة (Refresh)
  getCurrentUser: async () => {
    const response = await apiClient.get("/auth/me"); // تأكد من اسم المسار في routes/auth.js
    return response.data;
  },
};