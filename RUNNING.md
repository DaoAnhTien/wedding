# Wedding API

Backend độc lập, không cần Supabase hoặc khóa truy cập. Node.js >= 22.13, SQLite lưu trên ổ đĩa, không cần cài dependencies.

```sh
cd BE
npm run dev
```

Mở terminal khác, chạy `cd FE && npm run dev`. Vite chuyển `/api` đến port 3001.

- `GET /api/health`: kiểm tra dịch vụ.
- `GET /api/wishes?limit=12&offset=0`: `{ items, total }`, mới nhất trước.
- `POST /api/wishes`: `{ name, message }`.
- `GET /api/rsvp?limit=30&offset=0`: `{ items, total }`.
- `POST /api/rsvp`: `{ name, message, status }`, status là `attending`, `not-attending`, `maybe`.

Tên tối đa 100 ký tự, lời nhắn tối đa 2.000 ký tự. POST giới hạn 10 yêu cầu/phút/IP. Trả lỗi JSON với `message`. Nội dung lưu nguyên văn và được React escape khi hiển thị.

## Triển khai

Chạy `npm start`. Cấu hình qua biến môi trường: `PORT` (3001), `HOST` (mặc định 0.0.0.0 để nhận kết nối trong container/Render), `DATABASE_PATH` (mặc định BE/data/wedding.sqlite), `CORS_ORIGINS` (các origin FE phân cách dấu phẩy). FE dùng `VITE_API_URL=https://api.example.com/api` khi build, hoặc reverse proxy `/api` cùng domain.

Gắn persistent volume cho thư mục dữ liệu và sao lưu SQLite. API này chạy một instance; rate limit dùng IP socket, khi có reverse proxy cần giới hạn thêm ở proxy. HTTPS được cấu hình tại reverse proxy. Dữ liệu Supabase cũ chưa được chuyển tự động; cần export dữ liệu nếu muốn giữ lịch sử. Danh sách cập nhật khi tải trang, bấm thử lại hoặc gửi thành công, không sử dụng realtime subscription.

`npm test` chạy kiểm tra API và persistence bằng SQLite tạm.

## Quản lý lời chúc từ FE

1. Tạo `BE/.env` từ `BE/.env.example`, đặt `ADMIN_TOKEN` thành khóa riêng dài, ngẫu nhiên. `npm run dev` và `npm start` tự đọc file `.env`.
2. Khởi động BE và FE, mở `http://localhost:5173/admin/wishes`.
3. Nhập khóa quản trị để xem danh sách, thêm, sửa, xóa lời chúc. Khóa chỉ nằm trong bộ nhớ trang; tải lại trang cần nhập lại.

API bổ sung:

- `GET /api/wishes/:id`: đọc một lời chúc.
- `GET /api/admin/wishes?limit=12&offset=0`: danh sách quản trị, cần `Authorization: Bearer <ADMIN_TOKEN>`.
- `PATCH /api/wishes/:id`: sửa `{ name, message }`, cần khóa quản trị. Giữ nguyên ngày gửi.
- `DELETE /api/wishes/:id`: xóa, cần khóa quản trị, trả `{ id, deleted: true }`.

Khách vẫn thêm lời chúc qua `POST /api/wishes`. FE quản trị dùng chung API tạo này. Sửa/xóa được kiểm tra quyền tại BE; không đặt khóa trong biến `VITE_`. Chưa cấu hình khóa trả 503, khóa sai trả 401, ID không tồn tại trả 404. Trang công khai lấy dữ liệu mới khi tải lại trang hoặc gửi lời chúc; không có đồng bộ realtime.
