# BrightSync - Quick Start Guide

## Installation

1. Download `BrightSync-Setup-1.0.0.exe`
2. Run the installer
3. Follow installation wizard
4. Launch BrightSync

## First Use

### Understanding the Interface

When you first open BrightSync, you'll see:

- **Master Brightness Slider** (top) - Controls all monitors at once
- **Sync Toggle** (top right) - Enable/disable synchronized brightness
- **Monitor Cards** (bottom) - Individual controls for each display

### Basic Usage

#### Sync All Monitors

1. Ensure "Sync ON" is active (green)
2. Move the master brightness slider
3. Watch as all monitors adjust together

#### Control Individual Monitors

1. Click "Sync OFF" toggle
2. Adjust individual monitor sliders
3. Each display can have different brightness

### Keyboard Shortcuts

- `Ctrl + Alt + Up` - Increase brightness
- `Ctrl + Alt + Down` - Decrease brightness

These work even when BrightSync is minimized!

### System Tray

BrightSync runs in your system tray (bottom-right of taskbar).

**Right-click the icon for**:

- Show window
- Quick brightness controls
- Toggle sync
- Quit application

### Auto-Start

To launch BrightSync when Windows starts:

1. Press `Win + R`
2. Type `shell:startup`
3. Create shortcut to BrightSync in this folder

## Troubleshooting

### External Monitor Not Detected

**Possible causes**:

- Monitor doesn't support DDC/CI
- Cable type (try DisplayPort instead of HDMI)
- DDC/CI disabled in monitor settings

**Solutions**:

1. Check monitor OSD (on-screen display) menu
2. Look for "DDC/CI" or "PC Communication" setting
3. Enable it and restart BrightSync

### Brightness Not Changing

**For laptops**:

- Check Windows brightness settings
- Update graphics drivers
- Ensure power plan allows brightness changes

**For external monitors**:

- Verify DDC/CI is enabled
- Try unplugging and replugging monitor
- Test with monitor's physical buttons first

### Hotkeys Not Working

- Check no other app uses same shortcuts
- Verify BrightSync is running (check system tray)
- Restart application

## Tips & Tricks

### Best Practices

1. **Keep Sync Enabled** for consistent visual experience
2. **Use Hotkeys** for quick adjustments without opening app
3. **Set Auto-Start** to have brightness control available always
4. **Adjust Per-Monitor** when different displays need different brightness

### Performance

BrightSync uses minimal resources:

- ~50 MB RAM
- <1% CPU (idle)
- No battery impact

### Privacy

BrightSync:

- ✅ Runs entirely offline
- ✅ Stores settings locally only
- ✅ No data collection
- ✅ No network access required

## FAQ

**Q: Does BrightSync work with USB monitors?**
A: Some USB monitors support DDC/CI, but compatibility varies by model.

**Q: Will this work on my laptop?**
A: Yes! Internal laptop displays are fully supported via Windows APIs.

**Q: Can I use this on Windows 7?**
A: Windows 10 (1809+) or Windows 11 is required.

**Q: Does it need admin privileges?**
A: No, runs with normal user permissions.

**Q: How many monitors can it control?**
A: Unlimited - all detected monitors are supported.

**Q: Will it drain my laptop battery?**
A: No, the app has negligible power consumption (~50MB RAM, <1% CPU).

## Support

Need help?

- Check [README.md](README.md) for detailed documentation
- Open an issue on GitHub
- Email: support@brightsync.app

---

**Enjoy seamless multi-monitor brightness control!** 🌟
