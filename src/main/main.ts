/**
 * Main Process Entry Point for BrightSync
 */

import { app, BrowserWindow } from "electron";
import * as path from "path";
import { MonitorManager } from "./monitor.manager";
import { BrightnessController } from "./brightness.controller";
import { IPCHandler } from "./ipc";
import { TrayService } from "./tray.service";
import { HotkeyService } from "./hotkey.service";
import { WINDOW } from "../shared/constants";

class BrightSyncApp {
  private mainWindow: BrowserWindow | null = null;
  private monitorManager!: MonitorManager;
  private brightnessController!: BrightnessController;
  private ipcHandler!: IPCHandler;
  private trayService!: TrayService;
  private hotkeyService!: HotkeyService;
  private isQuitting: boolean = false;

  constructor() {
    this.initializeApp();
  }

  /**
   * Initialize the application
   */
  private initializeApp(): void {
    // Handle app ready event
    app.whenReady().then(() => {
      this.onAppReady();
    });

    // Handle all windows closed
    app.on("window-all-closed", () => {
      // On Windows, keep app running in tray even when window is closed
      // User must explicitly quit from tray menu
      console.log("All windows closed, app continues in tray");
    });

    // Handle app activation (macOS)
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });

    // Handle app quit
    app.on("will-quit", () => {
      this.onAppQuit();
    });

    // Handle before quit
    app.on("before-quit", () => {
      this.isQuitting = true;
      console.log("Application shutting down...");
    });
  }

  /**
   * Called when app is ready
   */
  private async onAppReady(): Promise<void> {
    console.log("BrightSync starting...");

    try {
      // Initialize services
      this.initializeServices();

      // Load saved settings
      this.ipcHandler.loadSettings();

      // Create main window
      this.createWindow();

      // Initialize tray
      if (this.mainWindow) {
        this.trayService.initialize(this.mainWindow);
      }

      // Register global hotkeys
      this.hotkeyService.register();

      console.log("BrightSync initialized successfully");
    } catch (error) {
      console.error("Failed to initialize BrightSync:", error);
      app.quit();
    }
  }

  /**
   * Initialize all services
   */
  private initializeServices(): void {
    // Initialize monitor manager
    this.monitorManager = new MonitorManager();

    // Initialize brightness controller
    this.brightnessController = new BrightnessController(this.monitorManager);

    // Initialize IPC handler
    this.ipcHandler = new IPCHandler(
      this.monitorManager,
      this.brightnessController,
    );

    // Initialize tray service
    this.trayService = new TrayService(this.brightnessController);

    // Initialize hotkey service
    this.hotkeyService = new HotkeyService(this.brightnessController);
  }

  /**
   * Create the main application window
   */
  private createWindow(): void {
    // Create browser window
    this.mainWindow = new BrowserWindow({
      width: WINDOW.WIDTH,
      height: WINDOW.HEIGHT,
      minWidth: WINDOW.MIN_WIDTH,
      minHeight: WINDOW.MIN_HEIGHT,
      backgroundColor: "#1a1a1a",
      webPreferences: {
        preload: path.join(__dirname, "../preload/preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
      icon: path.join(__dirname, "../../assets/icon.ico"),
      title: "BrightSync",
      autoHideMenuBar: true,
    });

    // Load the renderer
    this.mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));

    // Set web contents for IPC handler
    this.ipcHandler.setMainWebContents(this.mainWindow.webContents);

    // Open DevTools in development
    if (process.env.NODE_ENV === "development") {
      this.mainWindow.webContents.openDevTools();
    }

    // Handle window close
    this.mainWindow.on("close", (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.mainWindow?.hide();
      }
    });

    // Handle window closed
    this.mainWindow.on("closed", () => {
      this.mainWindow = null;
    });

    console.log("Main window created");
  }

  /**
   * Called before app quits
   */
  private onAppQuit(): void {
    console.log("Cleaning up...");

    // Unregister hotkeys
    this.hotkeyService.unregisterAll();

    // Destroy tray
    this.trayService.destroy();

    console.log("Cleanup complete");
  }
}

// Create and start the application
new BrightSyncApp();
