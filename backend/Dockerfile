# ============================================
# BIZRA Node0 - Rust Backend Dockerfile
# Elite Multi-Stage Production Build
# ============================================
# Stage 1: Build dependencies (cached layer)
FROM rust:1.75-slim-bookworm AS deps

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy only Cargo files first for dependency caching
COPY Cargo.toml Cargo.lock ./

# Create dummy main.rs for dependency compilation
RUN mkdir -p src/lib && \
    echo "fn main() {}" > src/main.rs && \
    echo "" > src/lib/mod.rs

# Build dependencies only (this layer is cached)
RUN cargo build --release && \
    rm -rf src target/release/deps/bizra* target/release/apiserver*

# ============================================
# Stage 2: Build application
FROM deps AS builder

WORKDIR /app

# Copy actual source code
COPY src ./src

# Build the actual application
RUN cargo build --release --locked

# Verify binary exists
RUN test -f target/release/apiserver

# ============================================
# Stage 3: Runtime (minimal distroless)
FROM gcr.io/distroless/cc-debian12:nonroot AS runtime

LABEL org.opencontainers.image.title="BIZRA Node0 Backend"
LABEL org.opencontainers.image.description="BIZRA Genesis Node Rust API Server"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.vendor="BIZRA Foundation"
LABEL org.opencontainers.image.source="https://github.com/bizra/bizra-genesis-node"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /app

# Copy only the compiled binary
COPY --from=builder --chown=nonroot:nonroot /app/target/release/apiserver /app/apiserver

# Set environment defaults
ENV API_HOST=0.0.0.0
ENV API_PORT=8080
ENV LOG_LEVEL=info
ENV RUST_BACKTRACE=0

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD ["/app/apiserver", "--health-check"] || exit 1

# Run as non-root user
USER nonroot:nonroot

# Entry point
ENTRYPOINT ["/app/apiserver"]
