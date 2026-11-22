# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build variables for production
ARG VITE_API_URL=/api
ARG VITE_USE_MOCK=false
ARG VITE_BROWSER_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_USE_MOCK=$VITE_USE_MOCK
ENV VITE_BROWSER_URL=$VITE_BROWSER_URL

RUN npm run build

# Production serve stage with Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
