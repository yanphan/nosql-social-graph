import { createApp } from './app.js';
import { connectDb } from './db/graph.js';
import { env } from './config/env.js';

try {
  await connectDb();
  console.log(`Connected to FalkorDB successfully (${env.db.host}:${env.db.port}, graph: ${env.db.graph})`);

  // Tự động khởi tạo dữ liệu mô phỏng lớn nếu CSDL đang trống
  try {
    const { read } = await import('./db/graph.js');
    const [row] = await read('MATCH (n) RETURN count(n) AS c');
    const count = Number(row?.c ?? 0);
    if (count === 0) {
      console.log('⚡ CSDL đồ thị đang trống. Đang tự động nạp sẵn bộ dữ liệu mô phỏng ban đầu...');
      const { loadScale } = await import('../../database/seed/load.js');
      await loadScale('DEFAULT', false);
      console.log('✅ Đã nạp sẵn bộ dữ liệu mô phỏng lớn vào CSDL đồ thị thành công!');
    } else {
      console.log(`📊 CSDL đồ thị đã có sẵn ${count} nodes.`);
    }
  } catch (seedErr) {
    console.warn(`Lưu ý khởi tạo dữ liệu ban đầu: ${seedErr.message}`);
  }
} catch (err) {
  console.warn(`Warning: Could not connect to FalkorDB at startup: ${err.message}. Backend will continue running.`);
}

const app = await createApp();

app.listen(env.port, () => {
  console.log(`🚀 Social Graph API running on http://localhost:${env.port}`);
  console.log(`📊 Health check: http://localhost:${env.port}/api/health`);
});
