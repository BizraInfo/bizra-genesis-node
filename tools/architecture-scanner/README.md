# SAPE-Enhanced Architecture Scanner (MVP)

A TypeScript CLI that scans Rust + TypeScript code to produce evidence-based architecture outputs:

- `architecture.map.json` (machine-readable)
- `ARCHITECTURE.md` (human-readable; falls back to `ARCHITECTURE.scanner.md` if the file exists)

## Run

```bash
cd tools/architecture-scanner
npm install
# Scan repo root from here
npm run scan -- ../..
```

The final argument is the project root to scan (default: current working directory).

## What it does (MVP)

- Walk files and collect metrics (size, mtime, LOC)
- Classify layer by path heuristics
- Parse Rust `use` imports + SQLx/HTTP signals (with line evidence)
- Parse TS imports + API calls (with line evidence), and resolve paths:
  - Relative `./` and `../` imports
  - `@/` alias mapped to nearest `src/` (heuristic)
  - Directory `index.*` resolution
  - tsconfig.json `compilerOptions.paths` + `baseUrl` alias patterns
- Detect hotspots: size, rough cyclomatic complexity, TODO/FIXME, unsafe (Rust)
- Discover integrations: DB, LLM providers, HTTP clients, observability

## Notes

- No external AST parsers; regex + heuristics only (evidence-based)
- Safe write: avoids overwriting existing `ARCHITECTURE.md` by default
