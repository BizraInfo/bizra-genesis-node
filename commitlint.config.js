// BIZRA Node0 - Commitlint Configuration
// Elite Commit Message Standards
// Enforces Conventional Commits with BIZRA-specific types

module.exports = {
  extends: ['@commitlint/config-conventional'],
  
  rules: {
    // Type must be one of these
    'type-enum': [
      2,
      'always',
      [
        'feat',      // ✨ New feature
        'fix',       // 🐛 Bug fix
        'docs',      // 📚 Documentation
        'style',     // 💅 Code style (formatting, etc.)
        'refactor',  // ♻️ Code refactoring
        'perf',      // ⚡ Performance improvement
        'test',      // ✅ Tests
        'build',     // 🏗️ Build system
        'ci',        // 👷 CI/CD
        'chore',     // 🔧 Maintenance
        'revert',    // ⏪ Revert changes
        'security',  // 🔒 Security fix
        'sovereign', // 🛡️ BIZRA sovereignty enhancement
        'genesis',   // 🌟 Genesis/bootstrap changes
        'pat',       // 🤖 PAT agent changes
        'ihsan',     // ☪️ Ihsan/ethics improvements
      ],
    ],
    
    // Scope is optional but if used, must be lowercase
    'scope-case': [2, 'always', 'lower-case'],
    
    // Subject must be lowercase
    'subject-case': [2, 'always', 'lower-case'],
    
    // Subject must not end with period
    'subject-full-stop': [2, 'never', '.'],
    
    // Subject min/max length
    'subject-min-length': [2, 'always', 10],
    'subject-max-length': [2, 'always', 100],
    
    // Header max length
    'header-max-length': [2, 'always', 120],
    
    // Body must be preceded by blank line
    'body-leading-blank': [2, 'always'],
    
    // Footer must be preceded by blank line
    'footer-leading-blank': [2, 'always'],
    
    // Body line max length
    'body-max-line-length': [2, 'always', 200],
    
    // Footer line max length
    'footer-max-line-length': [2, 'always', 200],
  },
  
  // BIZRA-specific scope suggestions
  prompt: {
    questions: {
      type: {
        description: 'Select the type of change you are committing',
        enum: {
          feat: {
            description: '✨ A new feature',
            title: 'Features',
            emoji: '✨',
          },
          fix: {
            description: '🐛 A bug fix',
            title: 'Bug Fixes',
            emoji: '🐛',
          },
          docs: {
            description: '📚 Documentation only changes',
            title: 'Documentation',
            emoji: '📚',
          },
          style: {
            description: '💅 Changes that do not affect the meaning of the code',
            title: 'Styles',
            emoji: '💅',
          },
          refactor: {
            description: '♻️ A code change that neither fixes a bug nor adds a feature',
            title: 'Code Refactoring',
            emoji: '♻️',
          },
          perf: {
            description: '⚡ A code change that improves performance',
            title: 'Performance',
            emoji: '⚡',
          },
          test: {
            description: '✅ Adding missing tests or correcting existing tests',
            title: 'Tests',
            emoji: '✅',
          },
          build: {
            description: '🏗️ Changes that affect the build system or dependencies',
            title: 'Builds',
            emoji: '🏗️',
          },
          ci: {
            description: '👷 Changes to CI configuration files and scripts',
            title: 'CI',
            emoji: '👷',
          },
          chore: {
            description: "🔧 Other changes that don't modify src or test files",
            title: 'Chores',
            emoji: '🔧',
          },
          revert: {
            description: '⏪ Reverts a previous commit',
            title: 'Reverts',
            emoji: '⏪',
          },
          security: {
            description: '🔒 Security vulnerability fix',
            title: 'Security',
            emoji: '🔒',
          },
          sovereign: {
            description: '🛡️ BIZRA sovereignty enhancement',
            title: 'Sovereignty',
            emoji: '🛡️',
          },
          genesis: {
            description: '🌟 Genesis/bootstrap system changes',
            title: 'Genesis',
            emoji: '🌟',
          },
          pat: {
            description: '🤖 PAT agent modifications',
            title: 'PAT Agents',
            emoji: '🤖',
          },
          ihsan: {
            description: '☪️ Ihsan/ethics improvements',
            title: 'Ihsan',
            emoji: '☪️',
          },
        },
      },
      scope: {
        description: 'What is the scope of this change (e.g. api, dashboard, backend, bridge)?',
      },
      subject: {
        description: 'Write a short, imperative mood description of the change',
      },
      body: {
        description: 'Provide a longer description of the change (optional)',
      },
      isBreaking: {
        description: 'Are there any breaking changes?',
      },
      breakingBody: {
        description: 'A BREAKING CHANGE commit requires a body. Provide a longer description',
      },
      breaking: {
        description: 'Describe the breaking changes',
      },
      isIssueAffected: {
        description: 'Does this change affect any open issues?',
      },
      issuesBody: {
        description: 'If issues are closed, the commit requires a body. Provide a longer description',
      },
      issues: {
        description: 'Add issue references (e.g. "fixes #123", "closes #456")',
      },
    },
  },
};
