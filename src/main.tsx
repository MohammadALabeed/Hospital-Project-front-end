// أداة فحص من React. وظيفتها مراقبة الكود أثناء مرحلة التطوير  لتنبيهك إذا كنت تستخدم طرقاً قديمة أو يوجد مشاكل خفية في الأداء
import { StrictMode } from 'react';

//هي الأداة المسؤولة عن تحويل كود React إلى عناصر HTML يفهمها المتصفح
import { createRoot } from 'react-dom/client';

// استيراد المكون الرئيسي للتطبيق، الذي يحتوي على جميع مكونات التطبيق الأخرى
import App from './App.tsx';

import './index.css';

import './i18n.ts'; 

// إنشاء جذر التطبيق وربطه بالعنصر الذي يحمل المعرف  في ملف HTML، ثم يتم عرض المكون App داخل StrictMode
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);