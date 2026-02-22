# Contributing to BrightSync

Thank you for your interest in contributing to BrightSync! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Report unacceptable behavior

## How to Contribute

### Reporting Bugs

Before creating a bug report:

1. Check existing issues to avoid duplicates
2. Ensure you're using the latest version
3. Test on a clean Windows installation if possible

**Bug Report Should Include**:

- Windows version
- BrightSync version
- Monitor configuration (internal/external, models)
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Console logs (if available)

### Suggesting Features

Feature requests are welcome! Please:

1. Check if it's already been suggested
2. Explain the use case clearly
3. Describe the expected behavior
4. Consider implementation complexity

### Pull Requests

#### Before You Start

1. **Discuss First**: For major changes, open an issue first
2. **Check Guidelines**: Ensure your contribution fits project goals
3. **Review Code**: Familiarize yourself with the codebase

#### Development Setup

```powershell
# Fork and clone
git clone https://github.com/your-username/brightsync.git
cd brightsync

# Install dependencies
npm install

# Build project
npm run build

# Run in development
npm run dev
```

#### Making Changes

1. **Create a Branch**:

   ```powershell
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

2. **Make Your Changes**:
   - Follow existing code style
   - Add comments for complex logic
   - Update types as needed
   - Test thoroughly

3. **Commit Your Changes**:

   ```powershell
   git add .
   git commit -m "feat: add awesome feature"
   ```

   Use conventional commit messages:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation
   - `style:` - Code style (formatting)
   - `refactor:` - Code refactoring
   - `test:` - Tests
   - `chore:` - Build/config changes

4. **Push and Create PR**:
   ```powershell
   git push origin feature/your-feature-name
   ```
   Then create a pull request on GitHub.

#### PR Guidelines

**Your PR should**:

- Have a clear title and description
- Reference any related issues
- Include before/after screenshots (if UI changes)
- Pass all checks
- Be focused (one feature/fix per PR)

**Code Quality**:

- Follow TypeScript strict mode
- No `any` types without justification
- Proper error handling
- Clean, readable code
- Comments for non-obvious logic

**Testing**:

- Test all changed functionality
- Test edge cases
- Verify on clean Windows install
- Check different monitor configurations

## Development Guidelines

### Project Structure

Follow the established structure:

```
src/
├── main/         # Main process only
├── preload/      # Preload scripts only
├── renderer/     # UI components only
├── shared/       # Shared types/constants
native/           # C++ addon code
```

### Code Style

**TypeScript**:

- Use strict mode
- Prefer `const` over `let`
- Use async/await over callbacks
- Explicit return types for functions
- Interfaces over types (for objects)
- Meaningful variable names

**React**:

- Class components (as used in project)
- Props interface for each component
- Controlled components for forms
- Proper cleanup in componentWillUnmount

**C++**:

- Follow existing naming conventions
- Use RAII for resource management
- Proper error handling
- Release all handles/COM objects
- Comment complex Windows API usage

### Naming Conventions

- **Files**: `kebab-case.ts`
- **Classes**: `PascalCase`
- **Interfaces**: `PascalCase`
- **Functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Private methods**: `private methodName()`

### Error Handling

Always handle errors gracefully:

```typescript
try {
  // Operation
} catch (error) {
  console.error("Context:", error);
  // Provide user feedback
  // Don't crash
}
```

### Documentation

- Update README if adding features
- Comment complex algorithms
- Add JSDoc for public APIs
- Update CHANGELOG
- Include inline comments for Windows API calls

## Native Addon Development

### Building

```powershell
npm run build:native
```

### Guidelines

- Use N-API (not NAN)
- Proper COM initialization/cleanup
- Release all Windows handles
- Test with different monitor configs
- Handle missing drivers gracefully

### Windows API Notes

**WMI**:

- Initialize COM properly
- Set security levels
- Handle BSTR allocation/deallocation
- Clean up IWbemServices

**DDC/CI**:

- Free physical monitor handles
- Gracefully handle unsupported monitors
- Check return values

## Testing Checklist

Before submitting:

- [ ] Application builds successfully
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] All features work as expected
- [ ] Tested with multiple monitors
- [ ] Tested edge cases
- [ ] Memory leaks checked
- [ ] Performance is acceptable
- [ ] Documentation updated

## Getting Help

Need help?

- Check [DEVELOPMENT.md](DEVELOPMENT.md)
- Ask in issues
- Review existing code
- Join discussions

## Recognition

Contributors will be:

- Listed in CONTRIBUTORS.md
- Credited in release notes
- Acknowledged in documentation

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to BrightSync! 🌟
