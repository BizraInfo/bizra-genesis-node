# SQLx Offline Compilation Guide

**Purpose:** Enable Rust compilation without live database connection
**Tool:** SQLx compile-time query verification
**Benefit:** Faster CI/CD, development without database

---

## Overview

SQLx provides **compile-time query verification** by checking SQL queries against a live database schema. However, this requires a database connection during compilation, which is inconvenient for:
- **CI/CD pipelines** (no database available)
- **Development** (developers without local PostgreSQL)
- **Docker builds** (multi-stage builds)

**Solution:** SQLx offline mode using `.sqlx/` directory with cached query metadata.

---

## Quick Start

### Option 1: Compile with Live Database (Online Mode)

```bash
# Set database URL
export DATABASE_URL="postgres://bizra_user:bizra_password@localhost:5432/bizra_genesis"

# Compile normally - SQLx will verify queries against live database
cargo build

# Compile with specific database
cargo build --features sqlx/runtime-tokio-rustls
```

### Option 2: Generate Offline Query Cache (Recommended for CI/CD)

```bash
# Step 1: Ensure database is running and migrated
docker-compose up -d postgres
export DATABASE_URL="postgres://bizra_user:bizra_password@localhost:5432/bizra_genesis"
sqlx migrate run

# Step 2: Generate query metadata
cargo sqlx prepare

# Output: .sqlx/ directory created with query metadata

# Step 3: Commit .sqlx/ directory
git add .sqlx/
git commit -m "chore: Add SQLx offline query metadata"

# Step 4: Now you can compile WITHOUT database
unset DATABASE_URL
cargo build  # ✅ Works!
```

---

## Detailed Workflow

### 1. Initial Setup (One-Time)

```bash
# Install SQLx CLI
cargo install sqlx-cli --no-default-features --features postgres

# Start PostgreSQL
docker run -d \
  --name bizra-postgres \
  -e POSTGRES_USER=bizra_user \
  -e POSTGRES_PASSWORD=bizra_password \
  -e POSTGRES_DB=bizra_genesis \
  -p 5432:5432 \
  postgres:15-alpine

# Set database URL
export DATABASE_URL="postgres://bizra_user:bizra_password@localhost:5432/bizra_genesis"

# Run migrations
cd /path/to/bizra-genesis-node
sqlx migrate run
```

### 2. Generate Offline Metadata

```bash
# Generate query metadata for all queries in src/
cargo sqlx prepare

# Expected output:
# query data written to `.sqlx` in the current directory; please check this into version control
```

**What this does:**
- Scans all Rust files for `sqlx::query!()` macros
- Connects to database via DATABASE_URL
- Extracts schema information for each query
- Generates `.sqlx/query-*.json` files with metadata
- Creates `.sqlx/query-metadata.json` index

### 3. Verify Offline Mode Works

```bash
# Remove database URL
unset DATABASE_URL

# Try compilation - should succeed
cargo check

# If it fails with "set `DATABASE_URL`" error:
#   1. Ensure .sqlx/ directory exists
#   2. Run `cargo sqlx prepare` again
#   3. Check that .sqlx/ is not in .gitignore
```

### 4. Commit to Version Control

```bash
# Add offline metadata to git
git add .sqlx/
git commit -m "chore(sqlx): Add offline query metadata for CI/CD

Enables compilation without live database connection by caching
query metadata in .sqlx/ directory.

Generated with: cargo sqlx prepare
Database schema: migrations/20250114000001_create_core_tables.up.sql"

# Push to remote
git push origin main
```

---

## CI/CD Integration

### GitHub Actions

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable

      # NO DATABASE REQUIRED - uses .sqlx/ metadata
      - name: Build (Offline Mode)
        run: cargo build --release

      # For database integration tests (optional)
      - name: Start PostgreSQL
        run: |
          docker run -d \
            -e POSTGRES_USER=bizra_user \
            -e POSTGRES_PASSWORD=bizra_password \
            -e POSTGRES_DB=bizra_genesis_test \
            -p 5432:5432 \
            postgres:15-alpine

      - name: Run Migrations
        env:
          DATABASE_URL: postgres://bizra_user:bizra_password@localhost:5432/bizra_genesis_test
        run: sqlx migrate run

      - name: Run Tests
        env:
          TEST_DATABASE_URL: postgres://bizra_user:bizra_password@localhost:5432/bizra_genesis_test
        run: cargo test
```

### Docker Multi-Stage Build

```dockerfile
# Build stage (offline mode - no database needed)
FROM rust:1.75 as builder

WORKDIR /app
COPY . .

# Offline compilation using .sqlx/ metadata
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

COPY --from=builder /app/target/release/bizra-genesis-node /usr/local/bin/
CMD ["bizra-genesis-node"]
```

---

## Maintenance

### When to Regenerate Metadata

Regenerate `.sqlx/` metadata when:
1. ✅ **Schema changes** (new migrations applied)
2. ✅ **Query changes** (new `sqlx::query!()` macros added)
3. ✅ **Table changes** (columns added/removed/renamed)

### Regeneration Workflow

```bash
# 1. Apply new migrations
export DATABASE_URL="postgres://bizra_user:bizra_password@localhost:5432/bizra_genesis"
sqlx migrate run

# 2. Regenerate metadata
cargo sqlx prepare

# 3. Review changes
git diff .sqlx/

# 4. Commit updated metadata
git add .sqlx/
git commit -m "chore(sqlx): Update query metadata after schema changes"
```

### Verification

```bash
# Check for stale metadata
cargo sqlx prepare --check

# Expected output if up-to-date:
# query metadata is up-to-date

# If stale:
# error: query metadata is out of date
# Run `cargo sqlx prepare` to update
```

---

## Troubleshooting

### Error: "set `DATABASE_URL` to use query macros online"

**Cause:** SQLx can't find `.sqlx/` metadata and DATABASE_URL is not set

**Solution:**
```bash
# Option A: Set DATABASE_URL for online mode
export DATABASE_URL="postgres://localhost/bizra_genesis"

# Option B: Generate offline metadata
cargo sqlx prepare
```

### Error: "query metadata is out of date"

**Cause:** Schema changed but `.sqlx/` not regenerated

**Solution:**
```bash
# Regenerate metadata
cargo sqlx prepare

# Commit changes
git add .sqlx/
git commit -m "chore(sqlx): Update query metadata"
```

### Error: "failed to connect to database"

**Cause:** Database not running or wrong credentials

**Solution:**
```bash
# Check database is running
docker ps | grep postgres

# Verify connection
psql $DATABASE_URL -c "SELECT 1;"

# Check environment variable
echo $DATABASE_URL
```

### .sqlx/ directory not created

**Cause:** No queries found or wrong working directory

**Solution:**
```bash
# Ensure you're in project root
cd /path/to/bizra-genesis-node

# Verify queries exist
grep -r "sqlx::query!" src/

# Try with verbose output
RUST_LOG=sqlx=debug cargo sqlx prepare
```

---

## Best Practices

### 1. Always Commit .sqlx/

✅ **DO:**
```bash
git add .sqlx/
git commit -m "chore(sqlx): Add query metadata"
```

❌ **DON'T:**
```bash
echo ".sqlx/" >> .gitignore  # This breaks offline mode!
```

### 2. Keep Metadata Fresh

```bash
# Add to pre-commit hook
#!/bin/bash
cargo sqlx prepare --check || {
  echo "SQLx metadata is stale. Run: cargo sqlx prepare"
  exit 1
}
```

### 3. Verify in CI

```yaml
- name: Check SQLx metadata
  run: cargo sqlx prepare --check
```

### 4. Document in README

```markdown
## Building

### With Database (Online Mode)
\`\`\`bash
export DATABASE_URL="postgres://localhost/bizra"
cargo build
\`\`\`

### Without Database (Offline Mode)
\`\`\`bash
cargo build  # Uses .sqlx/ metadata
\`\`\`
```

---

## Performance Comparison

| Mode | Build Time | Database Required | CI/CD Friendly |
|------|-----------|-------------------|----------------|
| **Online** | ~2min | ✅ Yes | ❌ No |
| **Offline** | ~2min | ❌ No | ✅ Yes |

*Note: Build times similar, but offline mode much more convenient for CI/CD*

---

## Advanced: Multi-Database Support

```bash
# Generate metadata for different databases
DATABASE_URL=postgres://localhost/bizra_dev cargo sqlx prepare
DATABASE_URL=postgres://localhost/bizra_test cargo sqlx prepare --merged

# Verify against specific database
DATABASE_URL=postgres://localhost/bizra_production cargo sqlx prepare --check
```

---

## Summary

**Offline Mode Workflow:**
```bash
# One-time setup
cargo sqlx prepare
git add .sqlx/
git commit -m "Add SQLx metadata"

# Ongoing development
cargo build  # No database needed! ✅
```

**Benefits:**
- ✅ Faster CI/CD (no database setup)
- ✅ Developer convenience (work offline)
- ✅ Docker optimization (smaller images)
- ✅ Compile-time safety maintained

**Trade-offs:**
- ⚠️ Must regenerate on schema changes
- ⚠️ Adds ~50KB to repository
- ⚠️ Requires discipline to keep updated

---

**For database setup, see: [DATABASE_SETUP_GUIDE.md](./DATABASE_SETUP_GUIDE.md)**

---

*BIZRA Genesis Node - Professional Elite Implementation*
*Copyright © 2025 BIZRA Development Team*
