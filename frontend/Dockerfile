FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@10.27.0

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# ── Production stage ──
FROM node:20-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/dist ./dist

USER node

EXPOSE 5173

CMD ["serve", "-s", "dist", "-l", "5173"]



#################  working code but shifting towards serve for deployment ##############

# FROM node:20-alpine AS builder

# WORKDIR /app

# RUN npm install -g pnpm@10.27.0

# COPY . .

# RUN pnpm install

# RUN pnpm run build

# Production - Nginx
# FROM nginx:alpine

# RUN rm /etc/nginx/conf.d/default.conf
# COPY nginx.conf /etc/nginx/conf.d/default.conf
# COPY --from=builder /app/dist /usr/share/nginx/html

# EXPOSE 5173

# CMD ["nginx", "-g", "daemon off;"]

# CMD ["serve", "-s", "dist", "-l", "5173"]