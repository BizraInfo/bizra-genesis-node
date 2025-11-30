# BIZRA Genesis Node

<div align="center">

![BIZRA Logo](https://img.shields.io/badge/BIZRA-البذرة-C9A962?style=for-the-badge&labelColor=0A1628)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Rust](https://img.shields.io/badge/rust-1.70%2B-orange.svg)](https://www.rust-lang.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![Status](https://img.shields.io/badge/Status-Genesis_Alpha-gold)](RELEASE_NOTES_v0.9.0.md)

**AI Orchestration System with Thompson Sampling, Weighted Selective Consensus, and Cryptographic Trust**

*إحسان (Ihsan) - Excellence in execution, transparency in process, sovereignty in design*

</div>

---

## Overview

BIZRA Genesis Node is a production-ready AI orchestration platform combining:

- **72 AI Agents** coordinated through intelligent routing
- **100 Genesis Founding Members** exclusive launch program  
- **Premium Invite System** with quantum-themed onboarding
- **Cryptographic Trust Bridge** ensuring tamper-proof audit trails

### Current Status: Genesis Alpha v0.9.0

| Component | Status | Coverage |
|-----------|--------|----------|
| Backend Core | ✅ Production Ready | 85% |
| Frontend Dashboard | ✅ Production Ready | TypeScript Clean |
| Invite System | ✅ Complete | Full Flow |
| Premium Onboarding | ✅ Complete | 5-Stage Journey |

---

## Quick Start

### Prerequisites

- **Node.js 18+** - [nodejs.org](https://nodejs.org/)
- **Rust 1.70+** - [rustup.rs](https://rustup.rs/)
- **PostgreSQL 15+** (optional) - For production database

### Installation

```bash
# Clone repository
git clone https://github.com/BizraInfo/bizra-genesis-node.git
cd bizra-genesis-node

# Install dependencies
npm install

# Build dashboard
cd apps/dashboard
npm run build

# Run development server
npm run dev
```

### Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Configure required variables
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
```

---

## Architecture

```
bizra-genesis-node/
├── apps/
│   └── dashboard/              # Next.js 14 Premium Dashboard
│       ├── components/         # React Components
│       │   ├── onboarding/     # 5-Stage Premium Journey
│       │   └── premium/        # Sacred Geometry UI
│       ├── constants/          # Unified System Constants
│       │   └── genesis.ts      # Core Configuration
│       ├── pages/              # Next.js Pages
│       │   └── invite/         # Invite System
│       └── styles/             # Tailwind CSS
├── crates/                     # Rust Core Services
│   ├── bizra-core/             # Orchestration Engine
│   ├── bizra-agents/           # 72 AI Agents
│   └── bizra-trust/            # Cryptographic Bridge
├── services/                   # Backend Services
│   └── validation-api/         # Genesis Validation
├── docs/                       # Documentation
│   └── archive/                # Historical Documents
└── scripts/                    # Utility Scripts
```

### Core Components

| Component | Description |
|-----------|-------------|
| **Thompson Sampling Router** | Multi-armed bandit for optimal AI model selection |
| **Weighted Selective Consensus** | Pareto-optimal response synthesis |
| **Ihsan Quality Gate** | 4-dimensional scoring (accuracy, safety, efficiency, excellence) |
| **Trust Bridge** | Ed25519 + BLAKE3 cryptographic verification |

---

## Features

### Premium Invite System

The invite system provides exclusive access for Genesis 100 founding members:

- **5-Stage Onboarding Journey** (72 seconds total)
  1. Awakening - Neural calibration
  2. Sacred Geometry - Pattern recognition
  3. Quantum Entanglement - Consciousness linking
  4. Blockchain Integration - Trust anchoring
  5. Consciousness Upload - Final synthesis

- **Invite Types**:
  - `founder` - Original Genesis members (100 seats)
  - `genesis_member` - Early community members
  - `premium` - Premium tier access
  - `standard` - General access

### Design System

**Typography**:
- Display: Playfair Display (elegant headings)
- Sans: Inter (clean body text)
- Mono: JetBrains Mono (code/data)

**Color Palette**:
- Gold: `#C9A962` - Premium accents
- Navy: `#050B14` - Deep backgrounds
- Teal: `#2A9D8F` - Interactive elements

**Unified Constants** (`constants/genesis.ts`):
```typescript
SYSTEM.TOTAL_AGENTS     // 72 AI agents
SYSTEM.GENESIS_SEATS    // 100 founding members
SYSTEM.ONBOARDING_DURATION // 72 seconds
METRICS.neural.quantumCoherence // 97.8%
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [QUICKSTART.md](QUICKSTART.md) | Get running in 5 minutes |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture details |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | Production deployment |
| [OPERATOR_RUNBOOK_v0.9.0.md](OPERATOR_RUNBOOK_v0.9.0.md) | Operations guide |
| [RELEASE_NOTES_v0.9.0.md](RELEASE_NOTES_v0.9.0.md) | Current release notes |
| [DEV_ENVIRONMENT_SETUP.md](DEV_ENVIRONMENT_SETUP.md) | Development setup |

---

## Development

### Commands

```bash
# Dashboard development
cd apps/dashboard
npm run dev          # Start dev server
npm run build        # Production build
npm run type-check   # TypeScript validation
npm run lint         # ESLint check

# Backend development
cargo build --release  # Build Rust core
cargo test             # Run tests
cargo bench            # Performance benchmarks
```

### Code Quality

- **TypeScript**: Strict mode, 0 errors
- **ESLint**: Enforced code standards
- **Rust**: Zero unsafe code, clippy clean

---

## Contributing

We welcome contributions! Please see:

- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) - Community standards

### Development Flow

1. Fork the repository
2. Create feature branch: `git checkout -b feature/your-feature`
3. Make changes with tests
4. Submit pull request

---

## Security

- **Zero unsafe Rust code** - Memory safety guaranteed
- **Ed25519 signatures** - Cryptographic verification
- **BLAKE3 hashing** - Fast, secure content addressing
- **JWT authentication** - Secure API access

Report vulnerabilities: [SECURITY.md](SECURITY.md)

---

## License

MIT License - See [LICENSE](LICENSE)

---

## Contact

- **Organization**: BIZRA Lab
- **Author**: Mahmoud Hassan (MoMo)
- **Email**: m.beshr@bizra.info
- **GitHub**: [BizraInfo/bizra-genesis-node](https://github.com/BizraInfo/bizra-genesis-node)

---

<div align="center">

**Built with إحسان (Excellence) • Powered by Rust 🦀 & Next.js**

*72 Agents • 100 Genesis Seats • Infinite Possibilities*

</div>
