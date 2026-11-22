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

## 3. Danh mục truy vấn nâng cao 5 Bài toán Đồ thị (Sprint 2: BT1–BT5)

### BT1. Tìm đường đi ngắn nhất giữa 2 người dùng (`shortestPath`)
*Mục đích: Tìm chuỗi kết nối FOLLOWS ngắn nhất (tối đa 6 bước) giữa `admin` và `alice`.*
```cypher
MATCH (a:User {username: 'admin'}), (b:User {username: 'alice'})
WITH shortestPath((a)-[:FOLLOWS*..6]->(b)) AS p
RETURN nodes(p) AS DanhSachUser, relationships(p) AS DanhSachCanh, length(p) AS DoDai
```
> **Quan sát đồ thị:** Chuyển sang Graph Canvas để thấy đường nối trực quan đi qua các tài khoản trung gian.

---

### BT2. Xếp hạng chủ đề nóng theo cửa sổ thời gian
*Mục đích: Tổng hợp điểm tương tác Topic theo trọng số (Like: 1, Comment: 2, Share: 3).*
```cypher
MATCH (t:Topic)<-[:ABOUT]-(p:Post)<-[l:LIKED]-(:User)
WHERE l.at >= (1776883353834 - 30 * 86400000)
RETURN t.name AS ChuDe, count(l) AS LuotThich
ORDER BY LuotThich DESC
LIMIT 10
```

---

### BT3. Gợi ý bạn bè dựa trên bạn chung và sở thích
*Mục đích: Tìm bạn của bạn (bậc 2) chưa theo dõi, ưu tiên người có bạn chung và chung chủ đề quan tâm.*
```cypher
MATCH (me:User {username: 'alice'})-[:FOLLOWS]->(f:User)-[:FOLLOWS]->(c:User)
WHERE c.id <> me.id AND NOT (me)-[:FOLLOWS]->(c) AND coalesce(c.status, 'active') <> 'locked'
WITH me, c, count(DISTINCT f) AS BanChung
OPTIONAL MATCH (me)-[:INTERESTED_IN]->(t:Topic)<-[:INTERESTED_IN]-(c)
WITH c, BanChung, count(DISTINCT t) AS ChuDeChung
RETURN c.username AS GoiY, c.fullName AS HoTen, BanChung, ChuDeChung, BanChung*2 + ChuDeChung AS DiemGoiY
ORDER BY DiemGoiY DESC
LIMIT 10
```

---

### BT4. Gợi ý bài viết phù hợp sở thích
*Mục đích: Gợi ý bài viết chưa xem thuộc các chủ đề quan tâm và được bạn bè yêu thích.*
```cypher
MATCH (me:User {username: 'alice'})-[i:INTERESTED_IN]->(t:Topic)<-[:ABOUT]-(p:Post)<-[:POSTED]-(a:User)
WHERE NOT (me)-[:LIKED]->(p) AND a.id <> me.id
OPTIONAL MATCH (me)-[:FOLLOWS]->(f:User)-[:LIKED]->(p)
WITH p, a, max(i.score) AS DiemSoThich, count(DISTINCT f) AS BanThich
RETURN p.id AS PostId, a.username AS TacGia, p.content AS NoiDung, BanThich, DiemSoThich, BanThich*2 + DiemSoThich*3 AS Diem
ORDER BY Diem DESC
LIMIT 10
```

---

### BT5. Tính toán tầm ảnh hưởng với thuật toán PageRank & Cộng đồng liên thông (WCC)
*Mục đích: Thực thi thuật toán đồ thị native trên FalkorDB để xếp hạng nút quyền lực nhất.*
```cypher
CALL algo.pageRank('User', 'FOLLOWS') YIELD node, score
RETURN node.username AS Username, node.fullName AS HoTen, score AS DiemPageRank
ORDER BY DiemPageRank DESC
LIMIT 10
```

Thành phần liên thông yếu (Weakly Connected Components - WCC):
```cypher
CALL algo.WCC({nodeLabels: ['User'], relationshipTypes: ['FOLLOWS']}) YIELD node, componentId
RETURN componentId AS MaCongDong, count(node) AS SoLuongThanhVien
ORDER BY SoLuongThanhVien DESC
```

---

## 4. Nhật ký kiểm tra tính toàn vẹn (Integrity Check trên quy mô M)

Chạy kiểm tra 9 ràng buộc toàn vẹn dữ liệu thông qua lệnh CLI:
```bash
node database/lib/integrity.js
```
Kết quả đạt được trên **quy mô M (60.100 nodes, 807.412 edges)**:
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

## 5. Danh mục ảnh minh chứng nghiệm thu (Evidence)

Các ảnh chụp màn hình truy vấn trên FalkorDB Browser được lưu tại thư mục `docs/evidence/`:
1. `docs/evidence/browser-login.png`: Màn hình kết nối FalkorDB Browser cổng 3000.
2. `docs/evidence/browser-label-counts.png`: Kết quả truy vấn đếm node theo Label (Q1).
3. `docs/evidence/browser-relationship-counts.png`: Kết quả truy vấn đếm cạnh theo Type (Q2).
4. `docs/evidence/browser-subgraph-alice.png`: Hiển thị đồ thị trực quan mạng lưới quanh node `alice` (Q7).
5. `docs/evidence/browser-bt1-shortest-path.png`: Trực quan hóa đường đi ngắn nhất giữa admin và alice (BT1).
6. `docs/evidence/browser-bt5-pagerank.png`: Bảng xếp hạng PageRank người có tầm ảnh hưởng (BT5).
