# ============================================
# BIZRA Node0 - Bridge Dockerfile
# Elite Multi-Stage Production Build
# ============================================
# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8 --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build TypeScript
RUN pnpm build

# ============================================
# Stage 2: Production
FROM node:20-alpine AS runner

LABEL org.opencontainers.image.title="BIZRA Node0 Bridge"
LABEL org.opencontainers.image.description="BIZRA Genesis Node Telemetry Bridge"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.vendor="BIZRA Foundation"

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 bridge

# Install pnpm for production deps
RUN corepack enable && corepack prepare pnpm@8 --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built files
COPY --from=builder /app/dist ./dist

# Set permissions
RUN chown -R bridge:nodejs /app

# Environment
ENV NODE_ENV=production
ENV PORT=3002

# Switch to non-root
USER bridge

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1

# Start
CMD ["node", "dist/index.js"]
