# CLAUDE.md - AI Assistant Guide for Argo Repository

**Last Updated:** 2025-11-14
**Repository:** WillieTheWhale/Argo
**Current State:** New/Minimal Repository

---

## Repository Overview

### Current Status
This is a new repository with minimal content. As of the last update, the repository contains:
- A single README file
- Git repository initialized
- Branch: `claude/claude-md-mhykbbke94qf4ow7-01ALB3yfP2JGSd5MZTsRFcRm`

### Project Purpose
**Note:** The project purpose has not yet been defined. When development begins, update this section with:
- Project goals and objectives
- Target use cases
- Key features planned
- Technology stack decisions

---

## Repository Structure

### Current Structure
```
/home/user/Argo/
├── .git/           # Git repository metadata
└── README          # Minimal readme file
```

### Recommended Future Structure
As the project grows, consider organizing code following these conventions:

```
/home/user/Argo/
├── src/            # Source code
│   ├── main/       # Main application code
│   ├── lib/        # Library/utility code
│   └── tests/      # Test files
├── docs/           # Documentation
├── config/         # Configuration files
├── scripts/        # Build and utility scripts
├── .gitignore      # Git ignore patterns
├── README          # Project readme
├── CLAUDE.md       # This file - AI assistant guide
└── [config files]  # package.json, Cargo.toml, requirements.txt, etc.
```

---

## Development Workflow

### Git Workflow

#### Branch Strategy
- **Main Branch:** Not yet established - to be determined
- **Feature Branches:** Use `claude/` prefix for AI-assisted development
- **Current Branch:** `claude/claude-md-mhykbbke94qf4ow7-01ALB3yfP2JGSd5MZTsRFcRm`

#### Commit Guidelines
- Use clear, descriptive commit messages
- Follow conventional commits format when possible:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation changes
  - `refactor:` for code refactoring
  - `test:` for test additions/changes
  - `chore:` for maintenance tasks

#### Push Strategy
- Always use: `git push -u origin <branch-name>`
- Branch names must start with `claude/` and end with matching session ID
- Retry network failures up to 4 times with exponential backoff (2s, 4s, 8s, 16s)

### Pull Request Workflow
When creating pull requests:
1. Ensure all changes are committed
2. Push to the feature branch
3. Create PR with descriptive title and summary
4. Include testing checklist
5. Reference any related issues

---

## Code Conventions

### General Principles
**Note:** As code is added to this repository, establish and document:
- Code formatting standards
- Naming conventions
- File organization patterns
- Comment and documentation requirements

### Language-Specific Guidelines
Update this section when the primary programming language(s) are chosen:

#### [Language Name]
- Style guide: [link or description]
- Linting tools: [tool names]
- Testing framework: [framework name]
- Package manager: [manager name]

---

## Testing Strategy

### Test Organization
Update this section when tests are added:
- Unit tests location
- Integration tests location
- E2E tests location
- Test running commands
- Coverage requirements

### Running Tests
```bash
# Add commands here when testing infrastructure is set up
# Example: npm test, pytest, cargo test, etc.
```

---

## Build and Deployment

### Building the Project
**Note:** Update this section when build processes are established

### Dependencies
**Note:** Update this section when dependencies are added
- List main dependencies
- Development dependencies
- System requirements

### Environment Setup
**Note:** Document environment variables and configuration when applicable

---

## AI Assistant Guidelines

### Task Approach
1. **Exploration First:** Use the Task tool with `subagent_type=Explore` for open-ended codebase exploration
2. **Plan Complex Tasks:** Use TodoWrite tool for multi-step tasks
3. **Read Before Edit:** Always read files before editing them
4. **Prefer Edits Over Writes:** Modify existing files rather than creating new ones when possible
5. **Track Progress:** Update todos in real-time as work progresses

### Security Considerations
- Never commit sensitive information (.env files, credentials, API keys)
- Review code for common vulnerabilities:
  - Command injection
  - XSS vulnerabilities
  - SQL injection
  - Path traversal
  - Insecure deserialization
- Follow OWASP top 10 security practices

### File Operations
- Use `Read` tool for reading files (not `cat`)
- Use `Edit` tool for modifying files (not `sed`/`awk`)
- Use `Write` tool for new files (not `echo` or heredocs)
- Use `Grep` for searching code (not bash `grep`)
- Use `Glob` for finding files (not `find`)

### Communication Style
- Be concise and technical
- Avoid emojis unless explicitly requested
- Focus on facts over validation
- Use markdown for formatting
- Output text directly (not via bash echo)

### Code References
When referencing code, use the pattern: `file_path:line_number`

Example: "The initialization happens in src/main.py:42"

---

## Common Tasks

### Starting New Work
1. Check current branch: `git status`
2. Understand the task requirements
3. Create todos for complex tasks
4. Explore relevant code sections
5. Implement changes
6. Test changes
7. Commit and push

### Adding New Features
1. Plan the feature structure
2. Identify affected files
3. Write tests (if TDD approach)
4. Implement feature
5. Run tests and verify
6. Update documentation
7. Commit with clear message

### Fixing Bugs
1. Reproduce the issue
2. Identify root cause
3. Write test case (if applicable)
4. Implement fix
5. Verify fix resolves issue
6. Check for similar issues
7. Commit with descriptive message

### Refactoring
1. Ensure tests exist and pass
2. Make incremental changes
3. Run tests after each change
4. Verify functionality unchanged
5. Update documentation if needed
6. Commit with refactor message

---

## Project-Specific Patterns

### Design Patterns
**Note:** Document common design patterns used in this project as they emerge:
- Architecture pattern (MVC, microservices, etc.)
- Data flow patterns
- Error handling patterns
- Logging patterns

### Anti-Patterns to Avoid
**Note:** Document anti-patterns specific to this project as they're identified

---

## Resources and Documentation

### External Resources
**Note:** Add links to relevant documentation:
- Framework documentation
- API documentation
- Design documents
- Related repositories

### Key Files
**Note:** Document important files as they're created:
- Configuration files
- Entry points
- Core modules
- Utility libraries

---

## Maintenance Notes

### Updating This Document
This CLAUDE.md file should be updated when:
- Project structure changes significantly
- New conventions are established
- New tools or frameworks are added
- Workflow processes change
- New patterns emerge

### Version History
- **2025-11-14:** Initial CLAUDE.md creation for new repository
  - Documented current minimal state
  - Established guidelines and conventions
  - Created template for future updates

---

## Quick Reference

### Essential Commands
```bash
# View repository status
git status

# Create and switch to new branch
git checkout -b branch-name

# Stage and commit changes
git add .
git commit -m "message"

# Push changes (with retry logic for network issues)
git push -u origin <branch-name>

# View recent commits
git log --oneline -10

# View current diff
git diff
```

### File Locations
- **Main Source:** TBD
- **Tests:** TBD
- **Configuration:** TBD
- **Documentation:** /home/user/Argo/docs/ (recommended)

---

## Notes for Human Developers

This file is primarily intended for AI assistants working on the codebase, but human developers may find it useful for:
- Understanding AI assistant capabilities and limitations
- Reviewing AI-generated changes
- Establishing coding conventions
- Maintaining consistency across AI and human contributions

**Important:** Keep this file updated as the project evolves to ensure AI assistants have accurate, current information about the codebase.
