# 🎉 HƯỚNG DẪN SỬ DỤNG HỆ THỐNG QR CHECK-IN

## 📋 Tổng quan
Hệ thống đã được tạo thành công với **521 QR codes** cho tất cả khách mời từ file `guest-list.csv`.

## 🚀 Cách sử dụng

### 1. Khởi động hệ thống
```bash
# Cài đặt dependencies (đã hoàn thành)
npm install

# Tạo QR codes (đã hoàn thành - 521 QR codes)
npm run generate-qr

# Khởi động web server
npm start
```

### 2. Truy cập hệ thống
- **Trang quản lý**: http://localhost:3000
- **Demo**: Mở file `demo.html` trong trình duyệt
- **Test API**: Chạy `node test-api.js`

### 3. Test check-in
Truy cập các URL sau để test:
- http://localhost:3000/checkin/STH00002 (Hà Văn Khôi)
- http://localhost:3000/checkin/STH00008 (Lê Hằng Nga)
- http://localhost:3000/checkin/STG0001 (Trần Tuấn Anh)

## 📁 Cấu trúc dự án

```
QRTesting03/
├── guest-list.csv              # 521 khách mời
├── package.json                # Dependencies
├── generateQR.js               # Script tạo QR codes
├── index.js                    # Web server chính
├── test-api.js                 # Script test API
├── demo.html                   # Trang demo
├── README.md                   # Hướng dẫn chi tiết
├── HUONG_DAN_SU_DUNG.md        # File này
└── output/
    └── qrs/                    # 521 QR codes đã tạo
        ├── STH00002_Hà_Văn_Khôi.png
        ├── STH00008_Lê_Hằng_Nga.png
        ├── STH00017_Vũ_Thành_Đạt.png
        └── ... (518 files khác)
```

## 🎯 Tính năng đã hoàn thành

### ✅ Tạo QR Codes
- Đọc file CSV với 521 khách mời
- Tạo QR code cá nhân cho từng khách
- Lưu vào thư mục `output/qrs/` với tên file: `{id}_{name}.png`
- QR code chứa URL: `http://localhost:3000/checkin/{id}`

### ✅ Web Server
- Express server chạy trên port 3000
- Trang quản lý hiển thị thống kê real-time
- Trang check-in cá nhân hóa cho từng khách
- API endpoints đầy đủ

### ✅ Trang Check-in
- Hiển thị lời chào: "Xin chào [Tên khách] đã đến buổi tiệc"
- Thông tin khách: Tên, Vai trò, Email
- Nút "Check In" để xác nhận tham dự
- Chống check-in trùng lặp
- Giao diện đẹp, responsive

### ✅ API Endpoints
- `GET /` - Trang quản lý chính
- `GET /checkin/:guestId` - Trang check-in cá nhân hóa
- `POST /api/checkin/:guestId` - API xử lý check-in
- `GET /api/checkins` - Lấy danh sách check-in
- `GET /api/export` - Xuất báo cáo check-in

### ✅ Dashboard
- Hiển thị tổng số khách đã check-in
- Danh sách khách mới check-in gần đây
- Giao diện thân thiện, dễ sử dụng

## 📱 Cách sử dụng trong sự kiện

### 1. Chuẩn bị
- In QR codes từ thư mục `output/qrs/`
- Phân phối cho khách mời
- Đảm bảo server đang chạy

### 2. Check-in
- Khách quét QR code bằng điện thoại
- Mở trang web check-in cá nhân hóa
- Nhấn nút "Check In"
- Hệ thống ghi nhận thời gian check-in

### 3. Theo dõi
- Truy cập http://localhost:3000
- Xem thống kê real-time
- Xuất báo cáo khi cần

## 🛠️ Tùy chỉnh

### Thay đổi URL server
Trong file `generateQR.js`, sửa:
```javascript
const BASE_URL = 'https://your-domain.com'; // Thay đổi URL này
```

### Thay đổi giao diện
Chỉnh sửa HTML template trong file `index.js`

### Thêm tính năng
- Lưu trữ database thay vì memory
- Gửi email xác nhận
- Xuất báo cáo Excel/PDF
- Multi-event support

## 🐛 Xử lý lỗi

### Server không khởi động
```bash
# Kiểm tra port 3000 có bị chiếm không
netstat -ano | findstr :3000

# Thay đổi port trong index.js
const PORT = process.env.PORT || 3001;
```

### QR code không tạo được
- Kiểm tra quyền ghi file
- Kiểm tra format file CSV
- Chạy lại: `npm run generate-qr`

### Check-in không hoạt động
- Kiểm tra server đang chạy
- Kiểm tra URL trong QR code
- Xem logs trong console

## 📊 Kết quả test

```
🧪 Test API Results:
✅ Trang chủ: 200 - OK
✅ Check-in page: 200 - OK
✅ Invalid ID: 404 - OK
✅ API check-in: 200 - OK
✅ API checkins: 200 - OK
✅ API export: 200 - OK
```

## 🎉 Kết luận

Hệ thống QR Check-in đã được tạo thành công với:
- **521 QR codes** cho tất cả khách mời
- **Web server** hoạt động ổn định
- **API endpoints** đầy đủ chức năng
- **Giao diện** thân thiện, responsive
- **Tính năng** chống check-in trùng lặp

Hệ thống sẵn sàng sử dụng cho sự kiện!

---

**Tác giả**: AI Assistant  
**Ngày tạo**: 2024  
**Phiên bản**: 1.0.0
