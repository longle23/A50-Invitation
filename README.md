# 🎉 Hệ thống QR Check-in cho Sự kiện

Hệ thống tự động tạo mã QR cho khách mời và quản lý check-in sự kiện một cách chuyên nghiệp.

## ✨ Tính năng

- 📱 **Tạo QR Code tự động**: Sinh mã QR cá nhân cho từng khách mời từ file CSV
- 🎯 **Check-in cá nhân hóa**: Trang web hiển thị lời chào riêng cho từng khách
- 📊 **Theo dõi real-time**: Dashboard hiển thị số lượng khách đã check-in
- 📋 **Báo cáo chi tiết**: Xuất danh sách khách đã tham dự
- 🚫 **Chống check-in trùng**: Hệ thống ngăn chặn check-in nhiều lần

## 🚀 Cài đặt

1. **Cài đặt dependencies:**
```bash
npm install
```

2. **Tạo QR codes cho khách mời:**
```bash
npm run generate-qr
```

3. **Khởi động web server:**
```bash
npm start
```

4. **Truy cập hệ thống:**
- Trang quản lý: http://localhost:3000
- Check-in khách: http://localhost:3000/checkin/{guestId}

## 📁 Cấu trúc dự án

```
QRTesting03/
├── guest-list.csv          # File danh sách khách mời
├── package.json            # Dependencies và scripts
├── generateQR.js           # Script tạo QR codes
├── index.js                # Web server chính
├── output/
│   └── qrs/               # Thư mục chứa QR codes
│       ├── STH00002_Hà_Văn_Khôi.png
│       ├── STH00008_Lê_Hằng_Nga.png
│       └── ...
└── README.md
```

## 📋 Format file CSV

File `guest-list.csv` cần có các cột:
- `id`: Mã khách mời (ví dụ: STH00002)
- `name`: Tên khách mời
- `role`: Vai trò/chức vụ
- `email`: Email liên hệ

## 🔧 API Endpoints

### Web Interface
- `GET /` - Trang quản lý chính
- `GET /checkin/:guestId` - Trang check-in cho khách mời

### API
- `POST /api/checkin/:guestId` - Xử lý check-in
- `GET /api/checkins` - Lấy danh sách check-in
- `GET /api/export` - Xuất báo cáo check-in

## 🎯 Cách sử dụng

### 1. Chuẩn bị dữ liệu
Đảm bảo file `guest-list.csv` có đúng format và nằm trong thư mục gốc.

### 2. Tạo QR codes
```bash
npm run generate-qr
```
Script sẽ:
- Đọc file CSV
- Tạo QR code cho từng khách
- Lưu vào thư mục `output/qrs/`
- Tạo file `guest-list-with-urls.json`

### 3. Khởi động server
```bash
npm start
```

### 4. Phân phối QR codes
In QR codes từ thư mục `output/qrs/` và phân phối cho khách mời.

### 5. Theo dõi check-in
Truy cập http://localhost:3000 để xem thống kê real-time.

## 🛠️ Tùy chỉnh

### Thay đổi URL server
Trong file `generateQR.js`, sửa biến `BASE_URL`:
```javascript
const BASE_URL = 'https://your-domain.com'; // Thay đổi URL này
```

### Tùy chỉnh giao diện
Chỉnh sửa HTML template trong file `index.js` để thay đổi giao diện trang check-in.

## 📊 Tính năng nâng cao

- **Lưu trữ dữ liệu**: Hiện tại dữ liệu lưu trong memory, có thể nâng cấp lên database
- **Gửi email**: Tích hợp gửi email xác nhận check-in
- **Báo cáo chi tiết**: Xuất báo cáo Excel/PDF
- **Multi-event**: Hỗ trợ nhiều sự kiện cùng lúc

## 🐛 Xử lý lỗi

### Lỗi thường gặp:
1. **File CSV không đọc được**: Kiểm tra format và encoding
2. **QR code không tạo được**: Kiểm tra quyền ghi file
3. **Server không khởi động**: Kiểm tra port 3000 có bị chiếm không

### Debug:
```bash
# Chạy với debug mode
DEBUG=* npm start

# Kiểm tra logs
npm run generate-qr
```

## 📝 License

MIT License - Sử dụng tự do cho mục đích thương mại và cá nhân.

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! Hãy tạo issue hoặc pull request.

---

**Tác giả**: Your Name  
**Phiên bản**: 1.0.0  
**Cập nhật**: 2024
