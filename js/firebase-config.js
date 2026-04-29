/*
 ═══════════════════════════════════════════════
  FIREBASE CONFIG — Kiếm Khách Đoàn
  
  HƯỚNG DẪN CÀI ĐẶT:
  1. Vào https://console.firebase.google.com
  2. Tạo project mới (miễn phí)
  3. Vào Project Settings > General > Your apps > Web app
  4. Copy config vào bên dưới
  5. Vào Firestore Database > Create database (chọn test mode)
 ═══════════════════════════════════════════════
*/

const FIREBASE_CONFIG = {
  apiKey:            "PASTE_YOUR_API_KEY_HERE",
  authDomain:        "your-project-id.firebaseapp.com",
  projectId:         "your-project-id",
  storageBucket:     "your-project-id.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

// ─── Kiểm tra config đã điền chưa ───
const FIREBASE_READY = FIREBASE_CONFIG.apiKey !== "PASTE_YOUR_API_KEY_HERE";
