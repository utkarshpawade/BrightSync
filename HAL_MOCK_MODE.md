# Hardware Abstraction Layer (HAL) - Mock Mode Documentation

## Overview

BrightSync now includes a Hardware Abstraction Layer (HAL) that allows the entire application to run in **mock mode** for testing and development without requiring actual DDC/CI-compatible hardware.

## Architecture

The HAL consists of the following components:

### Interface Layer

- **`monitor_interface.h`** - Abstract interface defining monitor operations

### Implementation Layers

- **`real_monitor.h/cpp`** - Real hardware implementation using:
  - Windows WMI for internal displays
  - DDC/CI for external monitors
- **`mock_monitor.h/cpp`** - Simulated monitor implementation for testing

### Factory Pattern

- **`monitor_factory.h/cpp`** - Creates appropriate monitor instances based on runtime mode

### Native Addon

- **`brightness.cc`** - Updated N-API bindings with HAL support

## Using Mock Mode

### Starting in Mock Mode

To run BrightSync with simulated monitors:

```powershell
npm start -- --mock
```

### Starting in Real Mode (Default)

To run with actual hardware:

```powershell
npm start
```

## Mock Monitor Configuration

When running in mock mode, the following simulated monitors are created:

1. **Internal Display**
   - ID: `mock_internal_0`
   - Name: `Mock Internal Display`
   - Type: `internal`
   - Initial Brightness: 50

2. **External Display 1**
   - ID: `mock_external_0`
   - Name: `Mock External Display 1`
   - Type: `external`
   - Initial Brightness: 50

3. **External Display 2**
   - ID: `mock_external_1`
   - Name: `Mock External Display 2`
   - Type: `external`
   - Initial Brightness: 50

## Mock Mode Features

### Full Simulation

- All monitor operations are simulated in memory
- No actual Windows API calls are made
- No hardware is accessed

### Console Logging

All mock operations are logged with the `[MOCK MODE]` prefix:

```
[MOCK MODE] Hardware abstraction layer initialized in MOCK mode
[MOCK MODE] All monitor operations will be simulated
[MOCK MODE] Creating simulated monitors...
[MOCK MODE] Monitor 'Mock Internal Display' (ID: mock_internal_0, Type: internal) initialized with brightness 50
[MOCK MODE] Monitor 'Mock External Display 1' brightness set to 75
```

### Brightness Control

- Brightness values are stored in memory
- Values are clamped to valid range (0-100)
- All operations always succeed
- State persists during application runtime

### Identical Behavior

The application behaves identically in both modes:

- UI works the same
- IPC communication unchanged
- Sync logic functions normally
- Hotkeys work
- System tray operates normally
- Smooth transitions function as expected

## Development Workflow

### Testing Without Hardware

1. **Start in mock mode**:

   ```powershell
   npm start -- --mock
   ```

2. **Develop and test features**:
   - Test sync logic
   - Verify UI behavior
   - Test brightness transitions
   - Validate error handling

3. **Switch to real mode** for final testing:
   ```powershell
   npm start
   ```

### Building in Mock Mode

Mock mode is determined at runtime, not build time. The same built application supports both modes:

```powershell
# Build once
npm run build

# Run in either mode
npm start -- --mock  # Mock mode
npm start            # Real mode
```

## API Reference

### Native Addon API

#### `initialize(config)`

Initialize the addon with configuration.

**Parameters:**

- `config.mockMode` (boolean) - Enable mock mode if true

**Returns:** boolean - Success status

**Example:**

```typescript
nativeAddon.initialize({ mockMode: true });
```

#### `getMonitors()`

Get list of all monitors.

**Returns:** Array of monitor objects

**Monitor Object:**

```typescript
{
  id: string; // Unique identifier
  name: string; // Display name
  type: string; // "internal" or "external"
  min: number; // Minimum brightness (0)
  max: number; // Maximum brightness (100)
  current: number; // Current brightness level
}
```

#### `getBrightness(monitorId)`

Get current brightness for a specific monitor.

**Parameters:**

- `monitorId` (string) - Monitor identifier

**Returns:** number - Brightness value (0-100) or -1 on error

#### `setBrightness(monitorId, value)`

Set brightness for a specific monitor.

**Parameters:**

- `monitorId` (string) - Monitor identifier
- `value` (number) - Brightness value (0-100, will be clamped)

**Returns:** boolean - Success status

## Implementation Details

### IMonitor Interface

```cpp
class IMonitor {
public:
    virtual std::string GetId() const = 0;
    virtual std::string GetName() const = 0;
    virtual std::string GetType() const = 0;
    virtual int GetMinBrightness() const = 0;
    virtual int GetMaxBrightness() const = 0;
    virtual int GetBrightness() const = 0;
    virtual bool SetBrightness(int value) = 0;
    virtual bool IsControllable() const = 0;
    virtual ~IMonitor() {}
};
```

### RealMonitor Implementation

- Inherits from `IMonitor`
- Uses Windows WMI for internal displays
- Uses DDC/CI for external monitors
- Handles hardware errors gracefully
- Proper resource cleanup

### MockMonitor Implementation

- Inherits from `IMonitor`
- Stores state in memory
- Logs all operations to console
- Always succeeds operations
- No hardware dependencies

### Factory Pattern

```cpp
std::vector<std::shared_ptr<IMonitor>> CreateMonitors(bool useMock);
```

- Creates appropriate monitor instances
- Runtime mode selection
- Clean separation of concerns

## Troubleshooting

### Mock Mode Not Working

**Symptom:** Application doesn't start in mock mode

**Solutions:**

1. Ensure the `--mock` flag is passed correctly:

   ```powershell
   npm start -- --mock
   ```

   Note the `--` before `--mock`

2. Check console output for `[MOCK MODE]` prefix

3. Rebuild the native addon:
   ```powershell
   npm run build:native
   ```

### Console Not Showing Mock Logs

**Symptom:** No `[MOCK MODE]` logs visible

**Solution:**

- Open DevTools (F12) in the Electron window
- Check the main process console (terminal where you ran `npm start`)
- Ensure `NODE_ENV=development` for verbose logging

### Switching Between Modes

**Important:** Mock mode is determined at application startup. To switch modes:

1. **Quit the application completely** (not just close window)
2. Restart with desired mode:
   ```powershell
   npm start -- --mock  # For mock mode
   npm start            # For real mode
   ```

## Best Practices

### When to Use Mock Mode

✅ **Use mock mode for:**

- Development without hardware
- CI/CD testing
- Feature development
- UI/UX work
- Algorithm testing
- Performance profiling

❌ **Don't use mock mode for:**

- Final integration testing
- Hardware compatibility testing
- DDC/CI validation
- Production deployment

### Testing Strategy

1. **Develop features in mock mode** - Fast iteration
2. **Test logic in mock mode** - Reliable environment
3. **Verify in real mode** - Hardware validation
4. **Deploy in real mode** - Production use

## Future Enhancements

Possible future improvements to the HAL:

- [ ] Configurable mock monitor count
- [ ] Simulate hardware failures in mock mode
- [ ] Mock mode configuration file
- [ ] Delay simulation for realistic timing
- [ ] Mock mode recording/playback
- [ ] Network-based mock mode for remote testing

## Contributing

When contributing to HAL functionality:

1. Maintain interface compatibility
2. Add appropriate logging
3. Test in both real and mock modes
4. Update documentation
5. Handle edge cases gracefully

## Support

For issues related to mock mode:

1. Check this documentation
2. Review console logs
3. Open an issue on GitHub with `[HAL]` prefix
4. Include whether issue occurs in mock, real, or both modes

---

**HAL Implementation Version:** 1.0.0  
**Date:** February 22, 2026  
**Author:** BrightSync Development Team
