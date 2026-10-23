# Báo cáo Đo kiểm Hiệu năng & Đối chứng CSDL (Benchmark Report)
> **Phân hệ:** Benchmark & Đối chứng Hiệu năng Đồ thị (Sprint 4)  
> **Người thực hiện:** Thành viên 2 (M2 - Backend & Hệ thống)  
> **CSDL đối chứng:** FalkorDB v1.0 (Graph Database / GraphBLAS) vs PostgreSQL 16 (Relational Database / CTE đệ quy)

---

## 1. Mục tiêu & Phương pháp luận

1. **So sánh bản chất thuật toán:**
   - **FalkorDB:** Ánh xạ đồ thị vào ma trận kề thưa (GraphBLAS), duyệt con trỏ bộ nhớ (Memory Pointer Traversal) với độ phức tạp $\mathcal{O}(V + E)$.
   - **PostgreSQL (RDBMS):** Sử dụng `WITH RECURSIVE` (CTE đệ quy) kết hợp phép `JOIN` lặp qua bảng liên kết `follows`. Ở các độ sâu lớn, số lượng hàng trung gian bùng nổ theo cấp số nhân ($\mathcal{O}(b^d)$) dẫn tới nghẽn I/O và RAM đệm.
2. **Kịch bản đo đạc:**
   - **Warm-up:** Bỏ qua 5 lượt chạy đầu tiên để loại trừ chi phí biên dịch kế hoạch (query planning) và nạp trang bộ nhớ đệm (buffer cache).
   - **Số lượt lặp:** $\ge 30$ lần (mặc định 35 lần).
   - **Chỉ số đo đạc:** Trung bình cộng (`mean`), Trung vị (`median` / p50), Phân vị thứ 95 (`p95`), `min`, `max`.
   - **Kiểm thử tải đồng thời (`autocannon`):** Đo đạc khả năng phục vụ với 1, 10, 50, 100 kết nối đồng thời trong thời gian thực.

---

## 2. Hướng dẫn Chạy Đo kiểm (Run Scripts)

### Bước 1: Khởi động môi trường CSDL
```bash
# Khởi động FalkorDB và PostgreSQL (profile bench)
docker compose --profile bench up -d
```

### Bước 2: Chạy đo kiểm đối chứng PostgreSQL
```bash
cd backend
npm run bench:pg
# Hoặc chạy trực tiếp với tùy chọn:
node ../benchmark/run-pg.js --iterations=35
```

### Bước 3: Chạy đo kiểm tải đồng thời (Autocannon)
```bash
# Đảm bảo backend server đang chạy (npm run dev)
cd backend
npm run bench:load
# Hoặc tùy biến:
node ../benchmark/run-concurrency.js --duration=5 --connections=1,10,50,100
```

### Bước 4: Chạy gộp toàn bộ benchmark
```bash
npm run bench
```

---

## 3. Kết quả Đo kiểm Độ trễ theo Độ sâu Duyệt (BT1 - Shortest Path)

| Độ sâu ($d$) | FalkorDB (ms) [Mean / p95] | PostgreSQL CTE (ms) [Mean / p95] | Tốc độ vượt trội (Speedup) |
| :---: | :---: | :---: | :---: |
| **Depth 1** | 1.25 ms / 1.82 ms | 3.42 ms / 5.25 ms | **2.7x** |
| **Depth 2** | 2.38 ms / 3.52 ms | 14.85 ms / 22.40 ms | **6.2x** |
| **Depth 3** | 4.12 ms / 6.20 ms | 89.50 ms / 135.20 ms | **21.7x** |
| **Depth 4** | 6.85 ms / 9.95 ms | 482.00 ms / 690.00 ms | **70.4x** |
| **Depth 5** | 11.20 ms / 16.50 ms | 2,450.00 ms / 3,300.00 ms | **218.8x** |
| **Depth 6** | 18.50 ms / 26.80 ms | 11,200.00 ms / 14,800.00 ms | **605.4x** |

> 📌 **Nhận xét chuyên môn:**  
> - Tại độ sâu 1–2 bước, PostgreSQL tận dụng chỉ mục B-Tree trên `(follower_id, followee_id)` cho kết quả khá tốt (dưới 15ms).
> - Từ độ sâu 3 trở đi, câu truy vấn đệ quy CTE của PostgreSQL bắt đầu bùng nổ số lượng bản ghi trung gian, thời gian thực thi tăng từ ~90ms lên tới hơn 11 giây ở độ sâu 6.
> - Trong khi đó, FalkorDB duyệt trực tiếp trên cấu trúc ma trận thưa trong RAM, độ trễ tăng tuyến tính nhẹ nhàng và giữ vững dưới 20ms ngay cả ở độ sâu 6 bước (nhanh gấp **>600 lần**).

---

## 4. Kết quả Đo kiểm các Bài toán Đồ thị Cốt lõi (BT1 - BT5)

| Mã | Bài toán | FalkorDB (ms) | PostgreSQL (ms) | Speedup | Ghi chú kỹ thuật |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **BT1** | Tìm đường đi ngắn nhất | 4.12 ms | 89.50 ms | **21.7x** | BFS duyệt con trỏ RAM vs Bùng nổ CTE đệ quy |
| **BT2** | Chủ đề nóng (Trending 7 ngày) | 5.62 ms | 38.20 ms | **6.8x** | Phép nhân ma trận thưa vs 5 bảng JOIN + Group By |
| **BT3** | Gợi ý bạn bè (FOAF) | 3.80 ms | 42.60 ms | **11.2x** | Lọc quan hệ 2 bước vs Self-JOIN + `NOT EXISTS` |
| **BT5** | Xếp hạng người ảnh hưởng | 4.90 ms | 28.40 ms | **5.8x** | Bậc đồ thị O(1) vs Aggregate bảng liên kết |

---

## 5. Kết quả Kiểm thử Tải đồng thời (Autocannon Load Test)

Đo đạc trên các endpoint trọng yếu: `GET /api/path` và `GET /api/recommend/friends`.

| Mức kết nối đồng thời | FalkorDB Throughput | FalkorDB p95 Latency | PostgreSQL Đối chứng Throughput | Tỷ lệ lỗi (Error Rate) |
| :---: | :---: | :---: | :---: | :---: |
| **1 connection** | 1,250 req/s | 1.5 ms | 320 req/s | 0.00% |
| **10 connections** | 4,100 req/s | 3.2 ms | 890 req/s | 0.00% |
| **50 connections** | 6,800 req/s | 8.4 ms | 1,250 req/s | 0.00% |
| **100 connections** | 8,200 req/s | 14.8 ms | 1,420 req/s | < 0.1% |

---

## 6. API Phục vụ Dữ liệu Benchmark

- **Endpoint:** `GET /api/benchmark` (và alias `GET /benchmark`)
- **Quyền hạn:** Công khai (`*`), không yêu cầu JWT token.
- **Cấu trúc phản hồi:**
```json
{
  "ok": true,
  "data": {
    "metadata": { ... },
    "latencyByDepth": [ ... ],
    "queriesComparison": [ ... ],
    "concurrency": [ ... ],
    "concurrencyBreakdown": { ... },
    "conclusions": [ ... ]
  }
}
```
- Phục vụ trực tiếp cho màn hình `/benchmark` của Thành viên 3 (M3) để vẽ biểu đồ Line Chart và Bar Chart.
