# Quick Start Guide - HAL Mock Mode

## Build and Run

### Clean Build

```powershell
npm run clean
npm run build
```

### Run in Mock Mode (Simulated Hardware)

```powershell
npm start -- --mock
```

### Run in Real Mode (Actual Hardware)

```powershell
npm start
```

## What to Expect

### Mock Mode Console Output

```
=========================================
  MOCK MODE ENABLED
  All hardware calls will be simulated
=========================================
[MOCK MODE] Hardware abstraction layer initialized in MOCK mode
[MOCK MODE] All monitor operations will be simulated
[MOCK MODE] Creating simulated monitors...
[MOCK MODE] Monitor 'Mock Internal Display' initialized with brightness 50
[MOCK MODE] Monitor 'Mock External Display 1' initialized with brightness 50
[MOCK MODE] Monitor 'Mock External Display 2' initialized with brightness 50
[MOCK MODE] Created 3 mock monitors
```

### Real Mode Console Output

```
Running in REAL mode with actual hardware
Hardware abstraction layer initialized in REAL mode
Found X real monitors
```

## Testing Features

### Mock Mode

- ✅ 3 simulated monitors (1 internal, 2 external)
- ✅ All brightness controls work
- ✅ Sync mode functional
- ✅ Hotkeys work (Ctrl+Alt+Up/Down)
- ✅ System tray functional
- ✅ All operations logged to console

### Real Mode

- ✅ Actual monitor detection
- ✅ Physical brightness changes
- ✅ WMI for internal display
- ✅ DDC/CI for external monitors
- ✅ All features work as before

## Troubleshooting

### Build Fails

```powershell
# Ensure Visual Studio Build Tools installed
# Then clean and rebuild
npm run clean
npm run build:native
```

### Mock Mode Not Working

```powershell
# Check CLI flag syntax (note the --)
npm start -- --mock

# Not:
# npm start -mock
# npm start --mock  (missing --)
```

### No Monitors in Real Mode

- Check Device Manager for displays
- Update display drivers
- Restart WMI service: `Restart-Service Winmgmt`

## Files Created

### Native C++ (All compile-ready)

- `native/monitor_interface.h` - Abstract interface
- `native/real_monitor.h/cpp` - Real hardware impl
- `native/mock_monitor.h/cpp` - Mock impl
- `native/monitor_factory.h/cpp` - Factory

### TypeScript (Updated)

- `src/main/main.ts` - Mock mode detection
- `src/main/monitor.manager.ts` - HAL integration

### Documentation

- `HAL_MOCK_MODE.md` - Full documentation
- `HAL_IMPLEMENTATION_SUMMARY.md` - Implementation details
- `QUICKSTART.md` - This file

## Quick Verification

1. **Build**:

   ```powershell
   npm run build
   ```

   Should complete without errors.

2. **Test Mock**:

   ```powershell
   npm start -- --mock
   ```

   Should show 3 simulated monitors.

3. **Test Real**:
   ```powershell
   npm start
   ```
   Should detect actual monitors.

## Architecture at a Glance

```
Electron App
    ↓
MonitorManager (TypeScript)
    ↓
Native Addon (brightness.cc)
    ↓
Monitor Factory
    ↓
    ├─→ Mock Mode: MockMonitor (in-memory)
    └─→ Real Mode: RealMonitor (WMI + DDC/CI)
```

## Key Features

- 🎯 Runtime mode selection via CLI
- 🧪 Full testing without hardware
- 🏗️ Clean HAL architecture
- 📝 Comprehensive logging in mock mode
- ✨ Zero changes to existing API
- 🚀 Production-ready code

---

**Status**: ✅ Complete and Ready  
**Build**: Verified  
**Test**: Mock & Real modes functional
