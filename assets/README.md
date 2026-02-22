# BrightSync Assets

This folder contains application assets:

- **icon.ico** - Main application icon (Windows)
- **tray-icon.png** - System tray icon

## Creating Icons

To generate proper Windows icons:

1. Create a 256x256 PNG image
2. Use an online converter or tool like ImageMagick:
   ```
   magick convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
   ```

## Icon Design Guidelines

- Use simple, recognizable symbols
- Ensure visibility at small sizes (16x16)
- Use high contrast for tray icon
- Follow Windows design guidelines

## Placeholder Icons

The application will work without custom icons, using default Electron icons.
Add your custom icons here when ready.
