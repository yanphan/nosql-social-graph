FROM node:20-alpine
WORKDIR /app

# Copy package manifests and install production dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Copy database modules used by admin and integrity checks
COPY database/lib ./database/lib
COPY database/data ./database/data

# Copy benchmark artifacts if available
COPY benchmark/results ./benchmark/results

# Copy backend source code
COPY backend ./backend

WORKDIR /app/backend
EXPOSE 4000

ENV NODE_ENV=production
ENV PORT=4000

CMD ["node", "src/server.js"]
