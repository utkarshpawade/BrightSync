# Changelog

All notable changes to BrightSync will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-22

### Added

- Initial release of BrightSync
- Multi-monitor brightness detection and control
- Internal display support via Windows WMI
- External display support via DDC/CI
- Master brightness control with synchronization
- Per-monitor individual brightness control
- Smooth animated brightness transitions
- Global hotkeys (Ctrl+Alt+Up/Down)
- System tray integration with context menu
- Settings persistence with electron-store
- React-based modern UI with dark theme
- Native C++ addon using N-API
- Windows installer via electron-builder
- Comprehensive documentation (README, QUICKSTART, DEVELOPMENT)

### Features

- Real-time brightness updates across all monitors
- Automatic monitor detection on startup
- Hot-plug monitor support
- Graceful handling of DDC/CI unsupported monitors
- Zero-configuration setup
- Minimal resource usage
- Type-safe TypeScript implementation
- Context-isolated renderer process
- Production-ready error handling

### Technical

- Electron 28.0.0
- TypeScript 5.3.3 (strict mode)
- React 18.2.0
- N-API native addon
- Windows WMI for internal displays
- DDC/CI VCP commands for external displays
- IPC-based architecture
- electron-store for settings persistence

## [Unreleased]

### Planned Features

- Monitor brightness profiles
- Time-based auto-adjustment
- Ambient light sensor support
- Custom hotkey configuration
- Multi-language support
- Gamma and color temperature control
- Command-line interface
- Cross-platform support (Linux/macOS)

---

For more information, see [README.md](README.md)
