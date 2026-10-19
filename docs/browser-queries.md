# 🌐 Nhật ký truy vấn FalkorDB Browser (docs/browser-queries.md)

Tài liệu này ghi nhận hướng dẫn kết nối và tập hợp các câu truy vấn Cypher cơ bản trên giao diện trực quan **FalkorDB Browser** (cổng `3000`), phục vụ kiểm chứng dữ liệu CSDL đồ thị và thu thập bằng chứng nghiệm thu cho **Sprint 1 (Task T1-9)**.

---

## 1. Hướng dẫn kết nối FalkorDB Browser

1. Mở trình duyệt web tại địa chỉ: [http://localhost:3000](http://localhost:3000)
2. Điền thông tin kết nối CSDL:
   - **Host:** `localhost` (hoặc `falkordb` nếu chạy từ mạng nội bộ Docker)
   - **Port:** `6379`
   - **Password:** `falkor_dev_pass` (được cấu hình trong `.env`)
   - **Graph Name:** `social`
3. Nhấn **Connect**. Sau khi kết nối thành công, chọn đồ thị `social` trong danh sách đồ thị khả dụng.

---

## 2. Danh mục truy vấn Cypher cơ bản (Sprint 1)

### Q1. Thống kê số lượng node theo từng nhãn (Label)
*Mục đích: Kiểm tra quy mô nạp dữ liệu (Users, Posts, Topics).*
```cypher
MATCH (n)
RETURN labels(n)[0] AS Label, count(n) AS SoLuong
ORDER BY SoLuong DESC
```
**Kết quả thực tế mức S:**
- `Post`: 5.000
- `User`: 1.000
- `Topic`: 50
- **Tổng số node:** 6.050

---

### Q2. Thống kê số lượng quan hệ theo từng loại (Relationship Type)
*Mục đích: Xác minh cấu trúc liên kết mạng xã hội.*
```cypher
MATCH ()-[r]->()
RETURN type(r) AS LoaiQuanHe, count(r) AS SoLuong
ORDER BY SoLuong DESC
```
**Kết quả thực tế mức S:**
- `LIKED`: 30.196
- `FOLLOWS`: 15.000
- `ABOUT`: 9.593
- `COMMENTED`: 7.606
- `POSTED`: 5.000
- `SHARED`: 4.964
- `INTERESTED_IN`: 3.539
- **Tổng số cạnh:** 75.898

---

### Q3. Tìm bài viết của một người dùng cụ thể (`alice`)
*Mục đích: Kiểm tra quan hệ POSTED và lấy danh sách bài viết kèm chủ đề gắn liền.*
```cypher
MATCH (u:User {username: 'alice'})-[r:POSTED]->(p:Post)
OPTIONAL MATCH (p)-[:ABOUT]->(t:Topic)
RETURN p.id AS PostId, p.content AS NoiDung, p.createdAt AS ThoiGian, collect(t.name) AS ChuDe
ORDER BY p.createdAt DESC
LIMIT 10
```

---

### Q4. Tìm bài viết theo chủ đề nóng (`ai`)
*Mục đích: Kiểm tra quan hệ ABOUT giữa bài viết và chủ đề.*
```cypher
MATCH (p:Post)-[:ABOUT]->(t:Topic {name: 'ai'})
MATCH (u:User)-[:POSTED]->(p)
RETURN p.id AS PostId, u.username AS TacGia, p.content AS NoiDung, p.likeCount AS LuotThich
ORDER BY p.likeCount DESC
LIMIT 10
```

---

### Q5. Danh sách người theo dõi (Followers) của `alice`
*Mục đích: Kiểm tra quan hệ mạng lưới FOLLOWS.*
```cypher
MATCH (f:User)-[r:FOLLOWS]->(u:User {username: 'alice'})
RETURN f.username AS FollowerUsername, f.fullName AS HoTen, r.since AS TheoDoiTu
ORDER BY r.since DESC
LIMIT 10
```

---

### Q6. Lọc bài viết và lượt tương tác trong 30 ngày gần nhất
*Mục đích: Kiểm tra tính đúng đắn của thuộc tính thời gian epoch milliseconds.*
```cypher
WITH (1776882247461 - 30 * 86400000) AS motThangTruoc
MATCH (u:User)-[:POSTED]->(p:Post)
WHERE p.createdAt >= motThangTruoc
RETURN p.id AS PostId, u.username AS TacGia, p.likeCount AS Likes, p.commentCount AS Comments, p.shareCount AS Shares
ORDER BY p.createdAt DESC
LIMIT 10
```

---

### Q7. Trực quan hóa mạng lưới đồ thị con xung quanh `alice` (Visual Subgraph)
*Mục đích: Xem hiển thị đồ thị mạng lưới kết nối trực tiếp trong FalkorDB Browser.*
```cypher
MATCH (u:User {username: 'alice'})-[r]-(n)
RETURN u, r, n
LIMIT 50
```
> **Gợi ý hiển thị trong Browser:** Nhấp vào chế độ xem **Graph Canvas** để thấy các nút `User` màu xanh tím, `Post` màu xanh cyan và `Topic` màu cam vàng liên kết trực quan.

---

## 3. Nhật ký kiểm tra tính toàn vẹn (Integrity Check)

Chạy kiểm tra 9 ràng buộc toàn vẹn dữ liệu thông qua lệnh CLI:
```bash
node database/lib/integrity.js
```
Kết quả đạt được:
```text
--- Running 9 Integrity Checks ---
  selfFollow      : ✅ PASS (0 vi phạm)
  dupFollow       : ✅ PASS (0 vi phạm)
  postNoAuthor    : ✅ PASS (0 vi phạm)
  postManyAuthor  : ✅ PASS (0 vi phạm)
  postNoTopic     : ✅ PASS (0 vi phạm)
  dupLike         : ✅ PASS (0 vi phạm)
  dupUserId       : ✅ PASS (0 vi phạm)
  futureCreated   : ✅ PASS (0 vi phạm)
  badInterest     : ✅ PASS (0 vi phạm)
-----------------------------------
All checks PASSED (100% Green)!
```

---

## 4. Danh mục ảnh minh chứng nghiệm thu (Evidence)

Các ảnh chụp màn hình truy vấn trên FalkorDB Browser được lưu tại thư mục `docs/evidence/`:
1. `docs/evidence/browser-login.png`: Màn hình kết nối FalkorDB Browser cổng 3000.
2. `docs/evidence/browser-label-counts.png`: Kết quả truy vấn đếm node theo Label (Q1).
3. `docs/evidence/browser-relationship-counts.png`: Kết quả truy vấn đếm cạnh theo Type (Q2).
4. `docs/evidence/browser-subgraph-alice.png`: Hiển thị đồ thị trực quan mạng lưới quanh node `alice` (Q7).
