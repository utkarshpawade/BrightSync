/**
 * System Tray Service - Manages system tray icon and menu
 */

import { Tray, Menu, nativeImage, BrowserWindow, app } from "electron";
import { BrightnessController } from "./brightness.controller";
import * as path from "path";
import * as fs from "fs";

export class TrayService {
  private tray: Tray | null = null;
  private brightnessController: BrightnessController;
  private mainWindow: BrowserWindow | null = null;

  constructor(brightnessController: BrightnessController) {
    this.brightnessController = brightnessController;
  }

  /**
   * Initialize system tray
   */
  public initialize(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow;

    try {
      // Create tray icon
      const iconPath = this.getTrayIconPath();
      const icon = nativeImage.createFromPath(iconPath);

      this.tray = new Tray(icon.resize({ width: 16, height: 16 }));
      this.tray.setToolTip("BrightSync - Brightness Synchronizer");

      // Set context menu
      this.updateContextMenu();

      // Show window on tray icon click
      this.tray.on("click", () => {
        this.showMainWindow();
      });

      console.log("System tray initialized");
    } catch (error) {
      console.error("Failed to initialize system tray:", error);
    }
  }

  /**
   * Update tray context menu
   */
  private updateContextMenu(): void {
    if (!this.tray) return;

    const syncEnabled = this.brightnessController.isSyncEnabled();

    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Show BrightSync",
        click: () => this.showMainWindow(),
      },
      { type: "separator" },
      {
        label: "Increase Brightness",
        accelerator: "CommandOrControl+Alt+Up",
        click: async () => {
          await this.brightnessController.increaseBrightness(10);
        },
      },
      {
        label: "Decrease Brightness",
        accelerator: "CommandOrControl+Alt+Down",
        click: async () => {
          await this.brightnessController.decreaseBrightness(10);
        },
      },
      { type: "separator" },
      {
        label: syncEnabled ? "✓ Sync Enabled" : "Sync Disabled",
        click: () => {
          this.brightnessController.toggleSync();
          this.updateContextMenu();
        },
      },
      { type: "separator" },
      {
        label: "Quit",
        click: () => {
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  /**
   * Show main window
   */
  private showMainWindow(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }
      this.mainWindow.show();
      this.mainWindow.focus();
    }
  }

  /**
   * Get tray icon path
   */
  private getTrayIconPath(): string {
    const candidates = [
      path.join(__dirname, "../../assets/BrightSync-logo.png"),
      path.join(__dirname, "../../assets/tray-icon.png"),
      path.join(process.resourcesPath ?? "", "assets/BrightSync-logo.png"),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        console.log("Using tray icon:", candidate);
        return candidate;
      }
    }

    console.warn("No tray icon found; tray will use an empty image.");
    return candidates[0]; // nativeImage.createFromPath handles missing files gracefully
  }

  /**
   * Update tray menu (e.g., when sync state changes)
   */
  public update(): void {
    this.updateContextMenu();
  }

  /**
   * Destroy tray
   */
  public destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}
