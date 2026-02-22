# Development Notes

## Building the Project

### First Time Setup

1. **Install Prerequisites**:

   ```powershell
   # Visual Studio Build Tools
   # Download from: https://visualstudio.microsoft.com/downloads/
   # Select: Desktop development with C++

   # Python 3.x
   # Download from: https://www.python.org/downloads/
   ```

2. **Install Dependencies**:

   ```powershell
   npm install
   ```

3. **Build Native Addon**:

   ```powershell
   npm run build:native
   ```

   This compiles the C++ addon using node-gyp.

4. **Build TypeScript**:

   ```powershell
   npm run build:ts
   ```

5. **Run Application**:
   ```powershell
   npm start
   ```

## Development Workflow

### Incremental Development

When making changes:

- **TypeScript changes**: `npm run build:ts` then `npm start`
- **Native code changes**: `npm run build:native` then `npm start`
- **UI changes**: Just refresh the app (Ctrl+R in dev mode)

### Debugging

#### TypeScript / JavaScript

- DevTools open automatically in development
- Use `console.log()` in main or renderer
- Check terminal output for main process logs

#### Native Addon

- Add debug output in C++ code
- Rebuild native addon
- Check console output

#### Common Issues

**Build Fails**:

- Ensure VS Build Tools installed correctly
- Check Python is in PATH
- Try running as Administrator

**Native Addon Not Loading**:

- Check `build/Release/brightness.node` exists
- Verify node-addon-api version matches
- Rebuild with `npm run build:native`

**TypeScript Errors**:

- Run `npm run build:ts` to see full errors
- Check `tsconfig.json` settings
- Ensure all types are imported correctly

## Architecture Notes

### Why This Structure?

**Separation of Concerns**:

- `main/` - Business logic, no UI
- `renderer/` - UI only, no hardware access
- `preload/` - Security boundary
- `native/` - Platform-specific hardware access

**Security**:

- Context isolation enabled
- No nodeIntegration in renderer
- Controlled API via contextBridge

**Performance**:

- Native addon for hardware access
- Caching in MonitorManager
- Debounced UI updates

### IPC Flow

```
Renderer → Preload → IPC → Main → Native Addon → Windows API
                                         ↓
Renderer ← IPC ← Main ← Native Addon ← Response
```

### Monitor Detection Strategy

1. Enumerate all displays
2. Identify internal vs external
3. Test DDC/CI support
4. Cache results with timeout
5. Refresh on demand

## Testing

### Manual Testing Checklist

- [ ] Application launches
- [ ] Monitors detected correctly
- [ ] Internal display brightness changes
- [ ] External display brightness changes
- [ ] Master slider works
- [ ] Per-monitor sliders work
- [ ] Sync toggle works
- [ ] Hotkeys work (Ctrl+Alt+Up/Down)
- [ ] System tray icon appears
- [ ] Tray menu functions work
- [ ] Settings persist across restarts
- [ ] Smooth transitions work
- [ ] Window minimizes to tray
- [ ] Application quits properly

### Edge Cases to Test

- [ ] Zero monitors (shouldn't crash)
- [ ] One monitor only
- [ ] Multiple external monitors
- [ ] Monitor hot-plug
- [ ] Laptop lid close/open
- [ ] Brightness at extremes (0, 100)
- [ ] Rapid brightness changes
- [ ] DDC/CI unsupported monitor

## Performance Optimization

### Current Optimizations

1. **Monitor Caching**: 500ms TTL to avoid repeated enumeration
2. **Transition Throttling**: Prevent concurrent transitions per monitor
3. **IPC Batching**: Handle multiple monitors in parallel
4. **Lazy Initialization**: Load native addon only when needed

### Potential Improvements

1. **Worker Threads**: Move heavy operations off main thread
2. **Request Coalescing**: Batch rapid brightness requests
3. **Differential Updates**: Only update changed monitors in UI
4. **Virtual Scrolling**: For many monitors

## Deployment Checklist

Before releasing:

- [ ] Update version in package.json
- [ ] Test on clean Windows install
- [ ] Verify installer works
- [ ] Check file size is reasonable
- [ ] Test auto-update (if implemented)
- [ ] Verify code signing (if applicable)
- [ ] Update README with release notes
- [ ] Tag release in Git

## Known Limitations

1. **DDC/CI Support**: Not all external monitors support DDC/CI
2. **Internal Display Detection**: Heuristic-based, may not always be accurate
3. **Permission Requirements**: Some systems may require elevated permissions
4. **Monitor Types**: USB monitors may not be detected
5. **Response Time**: DDC/CI can be slower than WMI (50-100ms vs <10ms)

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [N-API Documentation](https://nodejs.org/api/n-api.html)
- [Windows WMI Reference](https://docs.microsoft.com/en-us/windows/win32/wmisdk/wmi-start-page)
- [DDC/CI Specification](https://en.wikipedia.org/wiki/Display_Data_Channel)
- [Monitor Configuration API](https://docs.microsoft.com/en-us/windows/win32/monitor/monitor-configuration)
