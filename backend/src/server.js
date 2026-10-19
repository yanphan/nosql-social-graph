import { createApp } from './app.js';
import { connectDb } from './db/graph.js';
import { env } from './config/env.js';

try {
  await connectDb();
  console.log(`Connected to FalkorDB successfully (${env.db.host}:${env.db.port}, graph: ${env.db.graph})`);
} catch (err) {
  console.warn(`Warning: Could not connect to FalkorDB at startup: ${err.message}. Backend will continue running.`);
}

const app = await createApp();

app.listen(env.port, () => {
  console.log(`🚀 Social Graph API running on http://localhost:${env.port}`);
  console.log(`📊 Health check: http://localhost:${env.port}/api/health`);
});
