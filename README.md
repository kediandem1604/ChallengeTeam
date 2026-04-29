# Kiếm Khách Đoàn — Web Bang Hội

Website chủ đề kiếm hiệp cho nhóm chơi game.

## Tính năng
- 🏠 Trang chủ với hiệu ứng kiếm hiệp, hạt phát sáng, hoa rơi
- 📜 Tin Tức: thêm bài viết (có ảnh), thêm video (YouTube/upload)
- 💌 Tâm Sự: gửi ẩn danh, quản trị viên duyệt/từ chối
- 📊 Nút dẫn tới Bảng Điểm Excel/Google Sheets (cấu hình qua ⚙)

## Cách dùng

### Cấu hình Link Bảng Điểm
1. Mở trang web
2. Click nút **⚙** góc dưới phải
3. Dán link Google Sheets / Excel Online
4. Bấm **Lưu Link**

### Thêm Bài Viết / Video
- Vào trang **📜 Tin Tức**
- Điền form và bấm **Đăng Bài** hoặc **Thêm Video**

### Quản lý Tâm Sự
- Vào trang **💌 Tâm Sự**
- Cuộn xuống phần **⚙ Quản Lý Tâm Sự**
- Duyệt / Từ chối / Xóa

## Deploy lên GitHub Pages
```bash
git init
git add .
git commit -m "Init KiemKhachDoan website"
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```
Vào **Settings → Pages → Branch: main** → Save.

## Lưu ý
- Dữ liệu lưu trong **localStorage** của trình duyệt (mỗi máy/trình duyệt riêng)
- Ảnh upload lưu dưới dạng Base64 (phù hợp dùng URL hình ảnh từ internet hơn)
- Để dùng chung dữ liệu cho cả team: cân nhắc tích hợp Firebase hoặc Supabase sau
