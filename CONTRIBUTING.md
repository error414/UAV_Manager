# Contributing to UAV Manager

Thank you for your interest in contributing to UAV Manager! This document provides guidelines and instructions for contributing to this project.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Submitting Changes](#submitting-changes)
- [Issue Reporting](#issue-reporting)
- [Pull Request Process](#pull-request-process)

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Git
- Node.js (for local frontend development)
- Python 3.x (for local backend development)

### Development Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/UAV_Manager.git
   cd UAV_Manager
   ```

2. **Environment Configuration**

   - Copy `.env.example` to `.env` (if available)
   - Set required environment variables:
     ```
     API_HOST=localhost
     API_URL=http://localhost:8000
     ```

3. **Start the development environment**

   ```bash
   git clone https://github.com/CarviFPV/UAV_Manager.git
   cd UAV_Manager
   docker compose build
   docker compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost:5175
   - Backend API: http://localhost:8000
   - Database: localhost:5432

## Project Structure

```
UAV_Manager/
├── _docker_files/
│   └── raspberry_pi-ARM/
│       ├── docker-compose.yml
│       ├── backend/
│       └── frontend/
├── backend/          # Backend application code
├── frontend/         # Frontend application code
└── docs/            # Documentation
```

## Coding Standards

### General Guidelines

- Write clear, readable code with meaningful variable and function names
- Add comments for complex logic
- Follow the existing code style in each part of the project
- Write tests for new features and bug fixes

### Backend (Python)

- Follow PEP 8 style guidelines
- Use type hints where appropriate
- Write docstrings for functions and classes
- Use meaningful commit messages

### Frontend (JavaScript/TypeScript)

- Use consistent indentation (2 or 4 spaces)
- Follow ESLint rules if configured
- Use meaningful component and variable names
- Write JSDoc comments for complex functions

### Database

- Use descriptive table and column names
- Follow naming conventions (snake_case for PostgreSQL)
- Include migration scripts for schema changes

## Submitting Changes

### Branch Naming

- Feature branches: `feature/description-of-feature`
- Bug fixes: `bugfix/description-of-bug`
- Documentation: `docs/description-of-change`
- Hotfixes: `hotfix/description-of-fix`

### Commit Messages

Follow the conventional commit format:

```

```

Types:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Example:

```
feat(backend): add user authentication endpoint

- Implement JWT token generation
- Add login and logout functionality
- Include password hashing

Closes #123
```

## Issue Reporting

When reporting issues, please include:

1. **Clear description** of the problem
2. **Steps to reproduce** the issue
3. **Expected behavior** vs actual behavior
4. **Environment details**:
   - Operating system
   - Docker version
   - Browser (for frontend issues)
5. **Screenshots or logs** if applicable

### Issue Labels

- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Improvements or additions to documentation
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention is needed

## Pull Request Process

1. **Fork the repository** and create your branch from `main`

2. **Make your changes** following the coding standards

3. **Test your changes**

   - Ensure the application builds and runs
   - Test affected functionality
   - Add tests for new features

4. **Update documentation** if necessary

5. **Create a pull request** with:

   - Clear title and description
   - Link to related issues
   - Screenshots for UI changes
   - List of changes made

6. **Code review process**:
   - Address reviewer feedback
   - Keep the PR updated with main branch
   - Ensure CI/CD checks pass

### Pull Request Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring

## Testing

- [ ] Tested locally
- [ ] Added/updated tests
- [ ] All tests pass

## Related Issues

Closes #issue_number

## Screenshots (if applicable)

## Additional Notes
```

## Development Workflow

### Local Development

1. **Backend development**:

   ```bash
   cd backend
   # Install dependencies and run locally
   ```

2. **Frontend development**:

   ```bash
   cd frontend
   # Install dependencies and run locally
   ```

3. **Database changes**:
   - Create migration scripts
   - Update schema documentation
   - Test migrations thoroughly

### Testing

- Write unit tests for new functionality
- Perform integration testing
- Test on different environments when possible

## Getting Help

- Check existing issues and documentation first
- Create a new issue for questions or problems
- Be specific about your environment and steps taken
- Be patient and respectful in all interactions

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help create a welcoming environment for all contributors
- Report unacceptable behavior to project maintainers

Thank you for contributing
