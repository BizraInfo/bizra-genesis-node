# BIZRA Genesis Node - Makefile
# Convenient targets for development, testing, and observability

.PHONY: help obs-up obs-test obs-test-spec obs-test-rules obs-test-scenario obs-down obs-logs obs-clean

# Default target
help:  ## Show this help message
	@echo "BIZRA Genesis Node - Available Targets:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ============================================================================
# Observability Stack Management
# ============================================================================

obs-up:  ## Start observability stack (Prometheus + Grafana + Renderer)
	@echo "🚀 Starting observability stack..."
	@docker compose -f docker-compose.obsv.yml up -d
	@echo "⏳ Waiting for services to be ready..."
	@sleep 10
	@echo ""
	@echo "✅ Observability stack is running:"
	@echo "   Prometheus: http://localhost:9090"
	@echo "   Grafana:    http://localhost:3000 (user: viewer, pass: set GF_ADMIN_PASS)"
	@echo "   Renderer:   http://localhost:8081"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Start BIZRA Genesis Node: cargo run --release -- validation-api"
	@echo "  2. Run tests: make obs-test"
	@echo ""

obs-down:  ## Stop and remove observability stack
	@echo "🛑 Stopping observability stack..."
	@docker compose -f docker-compose.obsv.yml down -v
	@echo "✅ Observability stack stopped"

obs-logs:  ## Show observability stack logs
	@docker compose -f docker-compose.obsv.yml logs -f

obs-clean:  ## Clean observability artifacts and volumes
	@echo "🧹 Cleaning observability artifacts..."
	@rm -rf artifacts/*.json artifacts/*.png baselines/*.png
	@docker compose -f docker-compose.obsv.yml down -v
	@docker volume prune -f
	@echo "✅ Cleaned"

# ============================================================================
# Observability Tests
# ============================================================================

obs-test:  ## Run all observability coverage tests
	@echo "🧪 Running all observability tests..."
	@echo ""
	@$(MAKE) obs-test-spec
	@echo ""
	@$(MAKE) obs-test-rules
	@echo ""
	@$(MAKE) obs-test-scenario
	@echo ""
	@echo "✅ All observability tests complete"
	@echo ""
	@$(MAKE) obs-report

obs-test-spec:  ## Test dashboard spec coverage (≥90%)
	@echo "📊 Testing dashboard spec coverage..."
	@node scripts/validate-dashboards.mjs > artifacts/spec-coverage.json || true
	@echo ""

obs-test-rules:  ## Test Prometheus rule coverage (≥80%)
	@echo "📋 Testing Prometheus rules..."
	@promtool test rules obsv/prometheus/rules_test.yml
	@promtool check rules obsv/prometheus/rules/*.yml
	@echo "✅ Rule tests passed"

obs-test-scenario:  ## Test scenario coverage - panels render data (≥60%)
	@echo "🧪 Testing scenario coverage (requires running stack + BIZRA node)..."
	@echo ""
	@echo "Prerequisites:"
	@echo "  1. Observability stack running: make obs-up"
	@echo "  2. BIZRA Genesis Node running: cargo run --release -- validation-api"
	@echo "  3. GF_TOKEN environment variable set (Grafana viewer API token)"
	@echo ""
	@if [ -z "$$GF_TOKEN" ]; then \
		echo "❌ GF_TOKEN not set. Create a token:"; \
		echo "   curl -X POST http://localhost:3000/api/auth/keys \\"; \
		echo "     -H 'Content-Type: application/json' \\"; \
		echo "     -u 'viewer:$$GF_ADMIN_PASS' \\"; \
		echo "     -d '{\"name\":\"test\",\"role\":\"Viewer\",\"secondsToLive\":3600}'"; \
		exit 1; \
	fi
	@echo "Running k6 synthetic scenario..."
	@k6 run k6/scenarios/api-slo.js
	@echo ""
	@echo "Asserting panel data..."
	@node scripts/assert-grafana.mjs > artifacts/scenario-coverage.json || true
	@echo ""

obs-report:  ## Generate unified observability coverage report
	@echo "📊 Generating unified coverage report..."
	@node scripts/coverage-report.mjs > artifacts/obsv-coverage.json
	@echo ""
	@echo "Report saved to: artifacts/obsv-coverage.json"
	@echo ""

# ============================================================================
# Rust Development
# ============================================================================

build:  ## Build BIZRA Genesis Node (release mode)
	@cargo build --release

test:  ## Run Rust tests
	@cargo test --all-features

bench:  ## Run Rust benchmarks
	@cargo bench --all-features

clippy:  ## Run clippy linter
	@cargo clippy --all-targets --all-features -- -D warnings

fmt:  ## Format Rust code
	@cargo fmt

fmt-check:  ## Check Rust code formatting
	@cargo fmt -- --check

# ============================================================================
# Quick Start
# ============================================================================

quickstart:  ## Quick start: Build + start observability + run node
	@echo "🚀 BIZRA Genesis Node - Quick Start"
	@echo ""
	@$(MAKE) build
	@$(MAKE) obs-up
	@echo ""
	@echo "✅ Ready! Now starting BIZRA Genesis Node..."
	@echo ""
	@cargo run --release -- validation-api
