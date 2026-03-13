FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.27.0

# Copy everything
COPY . .

# Install dependencies
RUN pnpm install

# Generate Prisma
RUN pnpm exec prisma generate

# Build
RUN pnpm run build

EXPOSE 5000

CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/server.js"]