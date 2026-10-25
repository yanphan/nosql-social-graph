# 📖 Đặc tả API Hệ thống Mạng xã hội Đồ thị (docs/API.md)

Tài liệu này chuẩn hóa toàn bộ các giao diện lập trình ứng dụng (RESTful API) của dự án **NoSQL Social Graph**, được hiện thực trên nền tảng **Express ESM** kết nối cơ sở dữ liệu đồ thị **FalkorDB** (GraphBLAS Cypher Engine).

---

## 1. Chuẩn giao thức & Cấu trúc Dữ liệu

### 1.1. Base URL
- Môi trường phát triển cục bộ: `http://localhost:4000/api`
- Môi trường Docker / Production: `http://localhost/api` (hoặc cổng 5173 reverse-proxy)

### 1.2. Envelope Chuẩn (Response Format)
Mọi phản hồi từ máy chủ đều được đóng gói theo định dạng chuẩn:

#### Phản hồi thành công (HTTP 200, 201):
```json
{
  "ok": true,
  "data": { ... }
}
```

#### Phản hồi lỗi (HTTP 400, 401, 403, 404, 409, 500):
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR | UNAUTH | FORBIDDEN | NOT_FOUND | CONFLICT | INTERNAL_ERROR",
    "message": "Mô tả chi tiết nguyên nhân lỗi"
  }
}
```

### 1.3. Cơ chế Xác thực & Phân quyền (RBAC)
- **Header xác thực:** `Authorization: Bearer <JWT_TOKEN>`
- **3 Cấp độ quyền hạn:**
  1. `user`: Người dùng thông thường (đăng bài, tương tác, tìm đường, nhận gợi ý).
  2. `analyst`: Chuyên viên phân tích (toàn bộ quyền user + truy cập API thống kê, phân tích ảnh hưởng, cộng đồng, lan truyền).
  3. `admin`: Quản trị viên hệ thống (toàn bộ quyền + quản lý người dùng, sao lưu, phục hồi, nạp dữ liệu, kiểm tra toàn vẹn, kiểm toán).

---

## 2. Danh mục Chi tiết Endpoints

### 🔐 2.1. Xác thực & Tài khoản (`/auth`)

| Phương thức | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Public | Đăng ký tài khoản mới |
| `POST` | `/auth/login` | Public | Đăng nhập hệ thống, nhận JWT Token |
| `GET` | `/auth/me` | `user` | Lấy thông tin tài khoản đang đăng nhập |

#### Ví dụ Request `POST /auth/login`:
```json
{
  "username": "admin",
  "password": "Passw0rd!"
}
```

#### Ví dụ Response:
```json
{
  "ok": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": "usr_admin",
      "username": "admin",
      "fullName": "Quản trị viên",
      "role": "admin"
    }
  }
}
```

---

### 👤 2.2. Quản lý Người dùng (`/users`)

| Phương thức | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/users?page=1&limit=20` | `user` | Lấy danh sách người dùng phân trang |
| `GET` | `/users/:id` | `user` | Lấy chi tiết thông tin và chỉ số của một người dùng |
| `PUT` | `/users/:id` | Chính chủ / `admin` | Cập nhật thông tin cá nhân (fullName, bio, country) |
| `PATCH` | `/users/:id/role` | `admin` | Cập nhật vai trò (`user`, `analyst`, `admin`) |
| `PATCH` | `/users/:id/status` | `admin` | Cập nhật trạng thái tài khoản (`active`, `locked`) |

---

### 📝 2.3. Bài viết & Tương tác Xã hội (`/posts`)

| Phương thức | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/posts?page=1&limit=10` | `user` | Lấy bảng tin bài viết phân trang |
| `POST` | `/posts` | `user` | Đăng bài viết mới (tự động phát hiện hashtag #topic) |
| `GET` | `/posts/:id` | `user` | Lấy chi tiết một bài viết |
| `DELETE` | `/posts/:id` | Tác giả / `admin` | Xóa bài viết |
| `POST` | `/posts/:id/like` | `user` | Thích bài viết (tạo quan hệ `[:LIKED]`) |
| `DELETE`| `/posts/:id/like` | `user` | Bỏ thích bài viết |
| `POST` | `/posts/:id/comments` | `user` | Bình luận vào bài viết (`[:COMMENTED]`) |
| `POST` | `/posts/:id/share` | `user` | Chia sẻ bài viết (`[:SHARED]`) |

---

### 🏷️ 2.4. Chủ đề & Quan hệ Theo dõi (`/topics`, `/follow`, `/me/interests`)

| Phương thức | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/topics` | `user` | Lấy danh sách tất cả chủ đề |
| `POST` | `/topics` | `admin` | Tạo chủ đề thảo luận mới |
| `POST` | `/follow` | `user` | Theo dõi người dùng khác (`[:FOLLOWS]`) |
| `DELETE`| `/follow` | `user` | Hủy theo dõi người dùng |
| `PUT` | `/me/interests` | `user` | Cập nhật danh sách chủ đề yêu thích (`[:INTERESTED_IN]`) |

---

### 🧠 2.5. Bài toán Đồ thị Nghiệp vụ (BT1 — BT5)

#### 🔹 BT1: Tìm đường đi ngắn nhất (Shortest Path)
* **Endpoint:** `GET /path?from=alice&to=bob&maxDepth=6`
* **Quyền:** `user`
* **Mô tả:** Tìm chuỗi các bước kết nối bạn bè ngắn nhất qua quan hệ `FOLLOWS` (tối đa 6 bước).
* **Response mẫu:**
  ```json
  {
    "ok": true,
    "data": {
      "path": ["alice", "usr_k41n9", "bob"],
      "length": 2,
      "nodes": [ ... ],
      "relationships": [ ... ]
    }
  }
  ```

#### 🔹 BT2: Chủ đề thịnh hành (Trending Topics)
* **Endpoint:** `GET /topics/trending?days=7&limit=10`
* **Quyền:** `user`
* **Mô tả:** Tính điểm nóng theo trọng số $Score = 1 \times Like + 2 \times Comment + 3 \times Share$ trong cửa sổ $N$ ngày gần nhất.

#### 🔹 BT3: Gợi ý kết bạn (Friend Suggestions)
* **Endpoint:** `GET /recommend/friends?limit=10`
* **Quyền:** `user`
* **Mô tả:** Gợi ý bạn của bạn (bạn chung) kết hợp cùng mối quan tâm chủ đề chung.

#### 🔹 BT4: Gợi ý bài viết (Post Recommendations)
* **Endpoint:** `GET /recommend/posts?limit=10`
* **Quyền:** `user`
* **Mô tả:** Gợi ý các bài viết thuộc chủ đề yêu thích được bạn bè like nhiều nhất.

#### 🔹 BT5: Phân tích Mạng lưới & Ảnh hưởng
* **`GET /analytics/influence?metric=followers|pagerank&limit=10`** (`analyst`, `admin`): Top người dùng có tầm ảnh hưởng lớn nhất.
* **`GET /analytics/communities`** (`analyst`, `admin`): Phân cụm cộng đồng người dùng theo thuật toán WCC (Weakly Connected Components).
* **`GET /analytics/spread/:postId`** (`analyst`, `admin`): Dựng cây lan truyền thông tin qua các lượt Share bài viết.
* **`GET /stats`** (`analyst`, `admin`): Tổng số node, cạnh, mật độ đồ thị và phân phối bậc (Degree Distribution).
* **`GET /search?q=nosql&type=all`** (`user`): Tìm kiếm toàn cục bài viết, người dùng và chủ đề.

---

### 🎨 2.6. Trực quan hóa Đồ thị Canvas (`/graph`)

| Phương thức | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/graph/subgraph?centerId=usr_alice&limit=50` | `user` | Lấy đồ thị con (bán kính 1 bước) xung quanh node trung tâm phục vụ vẽ Cytoscape Canvas |

---

### ⚙️ 2.7. Quản trị Dữ liệu & Hệ thống (`/admin`)

| Phương thức | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/admin/import?kind=users|posts|...` | `admin` | Nạp dữ liệu hàng loạt từ file tải lên (CSV hoặc JSON) |
| `GET` | `/admin/export?format=json|csv` | `admin` | Xuất toàn bộ dữ liệu đồ thị về file lưu trữ |
| `POST` | `/admin/backup` | `admin` | Tạo bản sao lưu logic tức thời |
| `GET` | `/admin/backups` | `admin` | Danh sách các tệp sao lưu hiện có |
| `POST` | `/admin/restore` | `admin` | Khôi phục toàn bộ đồ thị từ file sao lưu |
| `POST` | `/admin/seed?scale=S|M|L` | `admin` | Tái tạo sinh và nạp mới dữ liệu theo quy mô |
| `GET` | `/admin/integrity` | `admin` | Chạy 9 kiểm tra toàn vẹn CSDL đồ thị (yêu cầu 100% PASS) |
| `GET` | `/admin/audit?limit=50` | `admin` | Đọc nhật ký kiểm toán ghi vết các thao tác hệ thống |

---

### ⚡ 2.8. Đo kiểm Hiệu năng & Đối chứng (`/benchmark`)

| Phương thức | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/benchmark` | Public | Lấy dữ liệu đối chứng hiệu năng giữa FalkorDB và PostgreSQL |
| `POST` | `/benchmark/run` | `admin` | Kích hoạt script benchmark đo đạc lại thời gian thực tế |
| `GET` | `/health` | Public | Kiểm tra trạng thái hoạt động của Backend và CSDL FalkorDB |
