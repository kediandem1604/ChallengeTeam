/*
 ═══════════════════════════════════════════════
  SUPABASE CONFIG — Kiếm Khách Đoàn
  
  HƯỚNG DẪN CÀI ĐẶT:
  1. Vào https://supabase.com/ > Start your project
  2. Tạo project mới
  3. Vào Settings > API, copy URL và anon public key
  4. Điền vào SUPABASE_URL và SUPABASE_ANON_KEY bên dưới
  5. Vào Table Editor > Create New Table (news, videos, members, settings)
 ═══════════════════════════════════════════════
*/

const SUPABASE_URL = "https://clekkfpuezhigqcukrug.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_JkpBcj7W-NGs9b9Q-U0wXA_HR4j8P_k";

// ─── Kiểm tra config đã điền chưa ───
const SUPABASE_READY = SUPABASE_URL !== "PASTE_YOUR_SUPABASE_URL_HERE";
