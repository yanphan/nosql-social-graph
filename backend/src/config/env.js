import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Đọc file .env ở thư mục gốc
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../.env') });

export const env = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET ?? 'change_me_in_real_use',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  browserUrl: process.env.BROWSER_URL ?? 'http://localhost:3000',
  db: {
    host: process.env.FALKORDB_HOST ?? 'localhost',
    port: Number(process.env.FALKORDB_PORT ?? 6379),
    password: process.env.FALKORDB_PASSWORD || undefined,
    graph: process.env.GRAPH_NAME ?? 'social',
  },
};
