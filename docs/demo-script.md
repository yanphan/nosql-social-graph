# 🎬 Kịch bản Thuyết trình & Trình diễn Demo Đồ án (docs/demo-script.md)

- **Đề tài:** Xây dựng Mạng Xã hội Đồ thị Hiệu năng cao trên Cơ sở Dữ liệu NoSQL FalkorDB
- **Thời lượng:** 10 – 12 phút
- **Phân vai:**
  * 👨‍💻 **Thành viên 1 (M1 - Data & Graph Master):** Mô hình dữ liệu, Schema, Chỉ mục, FalkorDB Browser & Đóng gói Docker.
  * 👨‍💻 **Thành viên 2 (M2 - Backend & Hệ thống):** Backend API, Bảo mật RBAC, Toàn vẹn dữ liệu, Sao lưu & Benchmark đối chứng.
  * 👨‍💻 **Thành viên 3 (M3 - Frontend & UX Master):** Trực quan hóa mạng lưới đồ thị, 5 bài toán đồ thị nghiệp vụ & Trải nghiệm người dùng.

---

## ⏱️ PHÂN BỔ THỜI GIAN & KỊCH BẢN CHI TIẾT

```mermaid
gantt
    title Kịch bản Demo Đồ án (11 Phút)
    dateFormat  m:s
    axisFormat  %M:%S
    section Mở đầu & CSDL
    Giới thiệu & FalkorDB Browser (M1)   :00:00, 2m
    section Trực quan & Nghiệp vụ
    Giao diện Web & 5 Bài toán (M3)      :02:00, 4m
    section Quản trị & Benchmark
    Toàn vẹn, Sao lưu & Benchmark (M2)   :06:00, 3m30s
    section Đóng gói & Q&A
    Docker 1 lệnh & Trả lời Q&A (Cả nhóm):09:30, 1m30s
```

---

### PHẦN 1: MỞ ĐẦU & NỀN TẢNG CƠ SỞ DỮ LIỆU ĐỒ THỊ (00:00 – 02:00)
**Người trình bày:** 👨‍💻 **Thành viên 1 (M1)**  
**Màn hình trình chiếu:** Trình duyệt mở sẵn **FalkorDB Browser** tại [http://localhost:3000](http://localhost:3000)

* **Lời thoại (M1):**
  > *"Kính thưa Thầy/Cô và các bạn trong Hội đồng. Trong các mạng xã hội hiện đại, dữ liệu liên kết như bạn bè, lượt thích, chia sẻ mang bản chất đồ thị phức tạp. Khi quy mô lên tới hàng chục nghìn đến hàng triệu nút, việc truy vấn đệ quy trên CSDL quan hệ truyền thống phải thực hiện nhiều phép JOIN tốn kém, dẫn đến suy giảm hiệu năng nghiêm trọng.*  
  >  
  > *Để giải quyết thách thức này, nhóm em đã xây dựng hệ thống mạng xã hội đồ thị hoàn chỉnh dựa trên **FalkorDB** — một CSDL đồ thị thế hệ mới sử dụng đại số tuyến tính ma trận thưa GraphBLAS chạy trong bộ nhớ.*  
  >  
  > *Trên màn hình là **FalkorDB Browser**. Nhóm đã thiết kế mô hình đồ thị thuộc tính gồm **3 loại Node chính**: `User`, `Post`, `Topic` và **7 loại Quan hệ**: `FOLLOWS`, `POSTED`, `ABOUT`, `LIKED`, `COMMENTED`, `SHARED`, `INTERESTED_IN`.  
  > Hệ thống đã được nạp sẵn bộ dữ liệu quy mô **Scale M** với **10.000 User, 50.000 Post, 100 Topic và hơn 700.000 cạnh liên kết**."*

* **Hành động thao tác (M1):**
  1. Gõ và chạy câu lệnh Cypher đếm số lượng node:
     ```cypher
     MATCH (n) RETURN labels(n)[0] AS Label, count(n) AS SoLuong ORDER BY SoLuong DESC
     ```
  2. Gõ câu lệnh trực quan hóa đồ thị liên kết bạn bè:
     ```cypher
     MATCH (u:User)-[r:FOLLOWS]->(v:User) RETURN u, r, v LIMIT 40
     ```
  3. Xoay và phóng to thu nhỏ mạng lưới đồ thị trực quan trên giao diện 2D/3D của FalkorDB Browser.

---

### PHẦN 2: TRỰC QUAN HÓA & 5 BÀI TOÁN ĐỒ THỊ NGHIỆP VỤ (02:00 – 06:00)
**Người trình bày:** 👨‍💻 **Thành viên 3 (M3)**  
**Màn hình trình chiếu:** Trình duyệt mở Web mạng xã hội tại [http://localhost:5173](http://localhost:5173)

* **Lời thoại (M3):**
  > *"Sau đây em xin đại diện nhóm trình diễn hệ thống giao diện người dùng và 5 bài toán đồ thị trọng yếu.*  
  > *Em đăng nhập bằng tài khoản người dùng demo `alice`.*  
  >  
  > ***1. Bảng tin (Feed):** Các bài viết trên bảng tin được tải mượt mà từ CSDL thật kèm các hashtag chủ đề được trích xuất tự động.*  
  >  
  > ***2. Bài toán BT1 — Tìm đường đi ngắn nhất (PathFinder):** Đây là bài toán 'Sáu bậc phân cách' (Six Degrees of Separation). Em nhập người gửi là `alice` và người nhận là `bob` với độ sâu tối đa 6 bước.  
  > Chỉ trong vài mili-giây, thuật toán `shortestPath` của FalkorDB đã tìm ra chuỗi kết nối bạn bè ngắn nhất. Thư viện Cytoscape trên Canvas tự động vẽ hoạt ảnh đường truyền tín hiệu nối giữa các tài khoản.*  
  >  
  > ***3. Bài toán BT2 — Chủ đề thịnh hành (Trending):** Hệ thống tính điểm nóng dựa trên công thức trọng số $Score = 1 \times Like + 2 \times Comment + 3 \times Share$ theo cửa sổ thời gian 1 ngày, 7 ngày hoặc 30 ngày.*  
  >  
  > ***4. Bài toán BT3 & BT4 — Gợi ý Kết bạn & Gợi ý Bài viết:** Hệ thống áp dụng thuật toán lọc cộng tác (Friend-of-Friends) kết hợp độ tương đồng sở thích chủ đề để gợi ý những người bạn tiềm năng và bài viết liên quan nhất cho Alice.*  
  >  
  > ***5. Bài toán BT5 — Phân tích Mạng lưới & Mức độ Ảnh hưởng:** Chuyển sang màn hình Analytics, chúng ta thấy biểu đồ phân phối bậc (Degree Distribution), bảng xếp hạng PageRank người có tầm ảnh hưởng lớn nhất, và sơ đồ cây lan truyền (Spread Tree) thể hiện quá trình một bài viết được chia sẻ theo thời gian."*

* **Hành động thao tác (M3):**
  1. Đăng nhập với username: `alice` / pass: `Passw0rd!`.
  2. Bấm vào trang **Tìm đường (PathFinder)**: Tìm từ `alice` đến một username ngẫu nhiên; click nút **Tìm đường**; rê chuột trên canvas để xem hiệu ứng sáng láng giềng.
  3. Bấm vào trang **Khám phá (Explore)**: Xem danh sách bạn bè gợi ý và bài viết được gợi ý.
  4. Bấm vào **Thống kê (Analytics)**: Chỉ vào đồ thị phân phối bậc và danh sách Top PageRank.

---

### PHẦN 3: BẢO MẬT RBAC, TOÀN VẸN DỮ LIỆU & BENCHMARK ĐỐI CHỨNG (06:00 – 09:30)
**Người trình bày:** 👨‍💻 **Thành viên 2 (M2)**  
**Màn hình trình chiếu:** Giao diện Quản trị [http://localhost:5173/admin/data](http://localhost:5173/admin/data) & [http://localhost:5173/benchmark](http://localhost:5173/benchmark)

* **Lời thoại (M2):**
  > *"Em xin tiếp tục trình bày về kiến trúc bảo mật Backend, quản trị dữ liệu và kết quả đo đạc hiệu năng.*  
  >  
  > ***1. Phân quyền RBAC:** Hệ thống áp dụng kiểm soát truy cập nghiêm ngặt 3 vai trò: `user`, `analyst` và `admin`. Nếu tài khoản thường cố tình truy cập vào các API quản trị, Backend sẽ lập tức trả về mã lỗi `403 FORBIDDEN`.*  
  >  
  > ***2. Kiểm tra tính Toàn vẹn Dữ liệu (Integrity Checks):** Tại trang `/admin/data`, hệ thống tự động quét 9 quy tắc toàn vẹn đồ thị nghiêm ngặt: kiểm tra cạnh tự follow, trùng lặp like/follow, bài viết mồ côi tác giả hoặc thiếu chủ đề. Hiện tại toàn bộ 9 kiểm tra đều đạt **100% XANH**.*  
  >  
  > ***3. Kịch bản Vàng — Sao lưu & Phục hồi:**  
  > Nhóm đã hiện thực cả 2 cơ chế: Sao lưu vật lý định kỳ (tệp `dump.rdb`) và Sao lưu logic JSON thông qua giao diện Web. Em tiến hành: **Tạo bản sao lưu $\rightarrow$ Xóa trắng toàn bộ CSDL $\rightarrow$ Phục hồi lại dữ liệu**. Bảng đối chiếu tự động kiểm đếm và xác nhận 100% số lượng node và quan hệ khớp hoàn toàn.*  
  >  
  > ***4. Benchmark Đối chứng giữa FalkorDB và PostgreSQL:**  
  > Chuyển sang màn hình `/benchmark`, đây là kết quả thực nghiệm đo đạc giữa CSDL đồ thị FalkorDB và CSDL quan hệ PostgreSQL 16 (dùng Recursive CTE) trên cùng một tập dữ liệu:  
  > - Ở độ sâu 1 đến 2 bước: Độ trễ chênh lệch không đáng kể (1-2ms so với 3-14ms).  
  > - Nhưng khi độ sâu tăng lên từ **3 đến 6 bước**, thời gian của PostgreSQL tăng theo hàm số mũ do phải JOIN bảng liên tục (lên tới hơn 11 giây ở độ sâu 6). Trong khi đó, FalkorDB duy trì độ trễ cực thấp **dưới 20 mili-giây**, đạt tốc độ **nhanh hơn tới 600 lần** nhờ cấu trúc duyệt con trỏ trực tiếp trên bộ nhớ.*  
  >  
  > *Về khả năng chịu tải đồng thời (Concurrency test bằng `autocannon`), FalkorDB xử lý ổn định trên 1.500 requests/giây mà không bị sụt giảm hiệu năng."*

* **Hành động thao tác (M2):**
  1. Đăng xuất tài khoản `alice`, đăng nhập tài khoản `admin` / `Passw0rd!`.
  2. Vào trang **Quản trị Dữ liệu (/admin/data)**: Bấm nút **Kiểm tra toàn vẹn** để hiển thị bảng 9 dấu tick xanh.
  3. Vào trang **Sao lưu & Phục hồi (/admin/backup)**: Trình diễn Stepper kiểm đếm số node khớp 100%.
  4. Vào trang **Benchmark (/benchmark)**: Chỉ vào 2 biểu đồ trực quan (Biểu đồ so sánh độ trễ theo độ sâu duyệt và biểu đồ tải đồng thời).

---

### PHẦN 4: ĐÓNG GÓI DOCKER & TỔNG KẾT (09:30 – 11:00)
**Người trình bày:** 👨‍💻 **Thành viên 1 (M1) & Cả nhóm**

* **Lời thoại (M1):**
  > *"Để đảm bảo tính sẵn sàng triển khai thực tế và thuận tiện cho việc đánh giá, toàn bộ dự án đã được đóng gói hoàn chỉnh bằng Docker đa tầng (Multi-stage build).  
  > Chỉ với một câu lệnh duy nhất:  
  > `docker compose up`  
  > Toàn bộ hệ sinh thái gồm CSDL đồ thị FalkorDB, Backend API Node.js và Frontend React Nginx sẽ tự động khởi động đồng bộ trên bất kỳ máy tính nào mà không cần cài đặt thêm môi trường phụ trợ.*  
  >  
  > *Nhóm em đã hoàn thành 100% tất cả các mục tiêu đề ra từ Sprint 0 đến Sprint 5. Nhóm em xin chân thành cảm ơn Thầy/Cô đã lắng nghe và sẵn sàng trả lời các câu hỏi phản biện của Hội đồng!"*

---

## 💡 CÁC CÂU HỎI PHẢN BIỆN THƯỜNG GẶP & GỢI Ý TRẢ LỜI

| Câu hỏi của Hội đồng | Người trả lời | Gợi ý câu trả lời ngắn gọn, thuyết phục |
| :--- | :---: | :--- |
| **1. Tại sao lại chọn FalkorDB thay vì Neo4j?** | **M1** | FalkorDB nhẹ hơn nhiều (chạy trực tiếp trên Redis engine), tiêu tốn ít RAM hơn, và áp dụng công nghệ ma trận thưa GraphBLAS giúp tốc độ nhân ma trận đồ thị nhanh hơn từ 2x đến 5x so với Neo4j trên cùng cấu hình phần cứng. |
| **2. Làm thế nào để đảm bảo tính toàn vẹn khi import dữ liệu lớn?** | **M1 / M2** | Nhóm chia nhỏ dữ liệu thành các lô (batch 2.000 dòng), sử dụng cú pháp `UNWIND $rows` trong một transaction duy nhất và thiết lập 6 Index cùng 5 Unique Constraint ngay từ đầu. Sau khi nạp xong, chạy tự động 9 câu kiểm tra toàn vẹn. |
| **3. Nếu mạng bị phân mảnh (không có đường đi giữa 2 người) thì giải quyết thế nào?** | **M2 / M3** | Khi hàm `shortestPath` không tìm thấy đường đi trong phạm vi `maxDepth=6`, Backend sẽ bắt trường hợp này và trả về kết quả rỗng kèm thông báo trực quan trên Frontend, đồng thời đưa ra các gợi ý kết nối qua chủ đề chung để người dùng mở rộng mạng lưới. |
| **4. Dự án xử lý vấn đề Cold-Start như thế nào?** | **M2 / M3** | Đối với người dùng mới (chưa follow ai và chưa có tương tác), hệ thống tự động kích hoạt cơ chế Fallback: gợi ý những người dùng có số lượng follower cao nhất hệ thống và những bài viết có lượt like nhiều nhất trong 7 ngày gần đây. |
