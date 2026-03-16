FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@10.27.0

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm exec prisma generate
RUN pnpm run build
RUN pnpm prune --prod

# ── Production stage ──
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

RUN mkdir -p /app/uploads && chown -R node:node /app

USER node

EXPOSE 5000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]


#################  working code but shifting towards serve for deployment ##############


# FROM node:20-alpine

# WORKDIR /app

# # Install pnpm
# RUN npm install -g pnpm@10.27.0

# # Copy everything
# COPY . .

# # Install dependencies
# RUN pnpm install

# # Generate Prisma
# RUN pnpm exec prisma generate

# # Build
# RUN pnpm run build

# EXPOSE 5000

# CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/server.js"]