FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@10.27.0

COPY . .

RUN pnpm install

RUN pnpm run build

# Production - Nginx
FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]