@echo off
set DATABASE_URL=postgres://bizra_user:test123@localhost:5433/bizra_genesis
set PORT=3004
set SQLX_OFFLINE=true
set RUST_LOG=info,bizra_genesis_node=debug
echo Starting Rust API server with DATABASE_URL: %DATABASE_URL%
.\target\release\api_server.exe
