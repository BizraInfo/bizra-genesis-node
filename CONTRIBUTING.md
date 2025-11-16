# Contributing to BIZRA Genesis Node

Thank you for your interest in contributing to BIZRA Genesis Node! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Environment](#development-environment)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Community](#community)

## Code of Conduct

This project adheres to the Contributor Covenant [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to conduct@bizra.ai.

## Getting Started

### Prerequisites

- **Rust**: Latest stable version (1.75+)
  ```bash
  rustup update stable
  ```

- **Node.js**: v18+ and npm
  ```bash
  node --version  # Should be v18+
  npm --version
  ```

- **Docker** & **Docker Compose**: For containerized development
  ```bash
  docker --version
  docker-compose --version
  ```

- **PostgreSQL**: v14+ (or use Docker)
- **Redis**: v7+ (or use Docker)

### Quick Start

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/bizra-genesis-node.git
   cd bizra-genesis-node
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/BizraInfo/bizra-genesis-node.git
   ```

4. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Start dependencies** (Docker):
   ```bash
   docker-compose up -d postgres redis
   ```

6. **Build the project**:
   ```bash
   cargo build
   cd apps/dashboard && npm install && cd ../..
   ```

7. **Run tests**:
   ```bash
   cargo test
   cargo clippy
   cargo fmt --check
   ```

8. **Start development server**:
   ```bash
   # Terminal 1: Rust backend
   cargo run

   # Terminal 2: Dashboard
   cd apps/dashboard && npm run dev
   ```

## Development Environment

### Recommended Tools

- **IDE**: VS Code, IntelliJ IDEA, or Cursor
- **VS Code Extensions**:
  - rust-analyzer
  - CodeLLDB (for debugging)
  - Even Better TOML
  - Error Lens
  - ESLint (for TypeScript)
  - Prettier

### Project Structure

```
bizra-genesis-node/
├── src/                    # Rust source code
│   ├── lib.rs             # Main library entry point
│   ├── agents/            # 18-agent ecosystem
│   ├── api/               # REST API (Axum)
│   ├── consensus/         # Consensus mechanisms
│   ├── routing/           # Thompson Sampling router
│   ├── trust/             # Cryptographic trust layer
│   └── websocket/         # WebSocket server
├── apps/
│   └── dashboard/         # React TypeScript dashboard
├── tests/                 # Integration tests
├── benches/               # Performance benchmarks
├── docs/                  # Documentation
├── infra/                 # Infrastructure as Code
└── scripts/               # Utility scripts
```

## How to Contribute

### Types of Contributions

We welcome various types of contributions:

- **Bug Reports**: File detailed bug reports with reproduction steps
- **Feature Requests**: Propose new features with use cases
- **Code Contributions**: Submit pull requests for bug fixes or features
- **Documentation**: Improve docs, add examples, fix typos
- **Testing**: Add test coverage, improve test quality
- **Performance**: Optimize code, improve benchmarks
- **Security**: Report vulnerabilities (see [SECURITY.md](SECURITY.md))

### Finding Work

- Check [Issues](https://github.com/BizraInfo/bizra-genesis-node/issues) labeled `good first issue`
- Look for `help wanted` labels
- Review the [Project Roadmap](docs/COMPREHENSIVE_STATUS_AND_ROADMAP.md)
- Ask in [Discussions](https://github.com/BizraInfo/bizra-genesis-node/discussions)

## Coding Standards

### Rust Code Style

We follow the official Rust style guidelines and enforce them via CI:

#### Formatting
```bash
# Auto-format code (required before committing)
cargo fmt
```

#### Linting
```bash
# Check for common mistakes and improvements
cargo clippy -- -D warnings

# We enforce:
# - #![forbid(unsafe_code)] - No unsafe code allowed
# - clippy::all - All clippy lints
# - clippy::pedantic - Pedantic lints
```

#### Documentation
```rust
/// Brief one-line description of the function.
///
/// More detailed explanation of what this function does,
/// including important behavior and edge cases.
///
/// # Arguments
///
/// * `param1` - Description of parameter 1
/// * `param2` - Description of parameter 2
///
/// # Returns
///
/// Description of what is returned
///
/// # Errors
///
/// When and why this function might return an error
///
/// # Examples
///
/// ```
/// use crate::example;
/// let result = example::function(42);
/// assert_eq!(result, expected);
/// ```
pub fn function(param1: i32, param2: &str) -> Result<ReturnType, Error> {
    // Implementation
}
```

#### Best Practices
- **Error Handling**: Use `Result<T, E>`, avoid `unwrap()` in production code
- **Async**: Use async/await for I/O operations
- **Testing**: Write unit tests for all public functions
- **Naming**: Use descriptive names (`snake_case` for functions, `PascalCase` for types)
- **Comments**: Explain *why*, not *what*

### TypeScript/React Code Style

#### Formatting
```bash
cd apps/dashboard
npm run lint        # ESLint
npm run format      # Prettier
```

#### Best Practices
- **TypeScript Strict Mode**: Enabled
- **Functional Components**: Prefer hooks over classes
- **Type Safety**: Avoid `any`, use proper types
- **Props**: Define interfaces for all component props
- **State Management**: Use React Context or state libraries appropriately

#### Example Component
```typescript
interface MyComponentProps {
  title: string;
  onAction: (id: string) => void;
  optional?: number;
}

export const MyComponent: React.FC<MyComponentProps> = ({
  title,
  onAction,
  optional = 42
}) => {
  const [state, setState] = useState<string>('');

  return (
    <div>
      <h1>{title}</h1>
      {/* Component implementation */}
    </div>
  );
};
```

## Testing Requirements

### Test Coverage

We maintain **95%+ code coverage** for Rust code. All PRs must:

- Maintain or improve overall coverage
- Include tests for new features
- Include tests for bug fixes

### Running Tests

#### Rust Tests
```bash
# Unit tests
cargo test

# Integration tests
cargo test --test '*'

# With coverage
cargo tarpaulin --out Html --output-dir coverage/

# Benchmarks
cargo bench
```

#### Frontend Tests
```bash
cd apps/dashboard

# Unit tests
npm test

# Coverage
npm run test:coverage

# E2E tests (when implemented)
npm run test:e2e
```

### Writing Tests

#### Rust Unit Tests
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_function_name() {
        // Arrange
        let input = "test";

        // Act
        let result = function_under_test(input);

        // Assert
        assert_eq!(result, expected_value);
    }

    #[tokio::test]
    async fn test_async_function() {
        let result = async_function().await;
        assert!(result.is_ok());
    }
}
```

#### React Component Tests
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders with title', () => {
    render(<MyComponent title="Test" onAction={jest.fn()} />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('calls onAction when button clicked', () => {
    const mockAction = jest.fn();
    render(<MyComponent title="Test" onAction={mockAction} />);

    fireEvent.click(screen.getByRole('button'));
    expect(mockAction).toHaveBeenCalledWith(expect.any(String));
  });
});
```

## Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) for clear, structured commit history.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates
- `ci`: CI/CD changes
- `build`: Build system changes

### Examples

```bash
feat(consensus): add Pareto optimization to candidate selection

Implements Pareto frontier analysis for multi-objective
optimization in consensus mechanism. This improves selection
quality by 15% in benchmark tests.

Closes #123
```

```bash
fix(websocket): prevent memory leak in session cleanup

The session cleanup task was not properly removing closed
connections from the session map, leading to memory growth
over time. Added explicit cleanup and tests.

Fixes #456
```

```bash
docs(readme): update installation instructions for macOS

Added instructions for installing dependencies on macOS using
Homebrew. Clarified PostgreSQL setup steps.
```

### Commit Message Rules

- Use present tense ("add feature" not "added feature")
- Use imperative mood ("move cursor to" not "moves cursor to")
- First line should be ≤72 characters
- Reference issues and PRs when relevant
- Breaking changes should be noted in footer: `BREAKING CHANGE:`

## Pull Request Process

### Before Submitting

1. **Update your fork**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Create a feature branch**:
   ```bash
   git checkout -b feat/your-feature-name
   ```

3. **Make your changes**:
   - Follow coding standards
   - Add tests
   - Update documentation

4. **Run local checks**:
   ```bash
   # Rust
   cargo fmt
   cargo clippy -- -D warnings
   cargo test
   cargo bench --no-run  # Ensure benchmarks compile

   # TypeScript
   cd apps/dashboard
   npm run lint
   npm run format
   npm test
   ```

5. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat(scope): your message"
   ```

6. **Push to your fork**:
   ```bash
   git push origin feat/your-feature-name
   ```

### Submitting the PR

1. Go to the original repository on GitHub
2. Click "New Pull Request"
3. Select your fork and branch
4. Fill out the PR template:
   - **Title**: Clear, descriptive title following conventional commits
   - **Description**: What, why, and how
   - **Related Issues**: Link issues using keywords (Fixes #123)
   - **Breaking Changes**: Clearly note any breaking changes
   - **Checklist**: Complete all items

### PR Review Process

1. **Automated Checks**: CI must pass
   - ✅ Formatting (rustfmt, prettier)
   - ✅ Linting (clippy, ESLint)
   - ✅ Tests (cargo test, jest)
   - ✅ Coverage (≥95%)
   - ✅ Security (cargo-audit, CodeQL)
   - ✅ Benchmarks (no significant regression)

2. **Code Review**: At least one maintainer approval required
   - Code quality and style
   - Test coverage and quality
   - Documentation completeness
   - Performance considerations
   - Security implications

3. **Changes Requested**: Address feedback
   - Make changes in new commits
   - Push to the same branch
   - Request re-review when ready

4. **Merge**: Maintainers will merge when approved

### PR Best Practices

- **Keep PRs small**: Easier to review (aim for <500 lines)
- **One concern per PR**: Don't mix unrelated changes
- **Update documentation**: Keep docs in sync with code
- **Add examples**: Show how to use new features
- **Be responsive**: Reply to review comments promptly
- **Be patient**: Reviews may take time

## Community

### Getting Help

- **Documentation**: Check [docs/](docs/) first
- **Discussions**: Use [GitHub Discussions](https://github.com/BizraInfo/bizra-genesis-node/discussions)
- **Issues**: Search existing issues before creating new ones
- **Chat**: Join our community chat (link TBD)

### Recognition

Contributors will be recognized in:
- [README.md](README.md) contributors section
- Release notes for significant contributions
- Project documentation

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT or Apache-2.0, check [LICENSE](LICENSE) files).

## Questions?

If you have questions about contributing, feel free to:
- Open a [Discussion](https://github.com/BizraInfo/bizra-genesis-node/discussions)
- Reach out to maintainers
- Check our [FAQ](docs/FAQ.md) (coming soon)

Thank you for contributing to BIZRA Genesis Node! 🚀
