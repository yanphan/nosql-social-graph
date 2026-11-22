import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // bcryptjs/index.js gọi require('./dist/bcrypt.js'); trên Node 22+ vite-node
    // phân giải sai đường dẫn tương đối này, nên trỏ thẳng tới file dist.
    alias: {
      bcryptjs: fileURLToPath(new URL('./node_modules/bcryptjs/dist/bcrypt.js', import.meta.url)),
    },
  },
  test: {
    setupFiles: ['./src/tests/setup.js'],
  },
});
