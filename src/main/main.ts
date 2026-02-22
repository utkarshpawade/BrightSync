/**
 * Main Process Entry Point for BrightSync
 */

import { app, BrowserWindow, dialog } from "electron";
import * as path from "path";
import { MonitorManager } from "./monitor.manager";
import { BrightnessController } from "./brightness.controller";
import { IPCHandler } from "./ipc";
import { TrayService } from "./tray.service";
import { HotkeyService } from "./hotkey.service";
import { WINDOW } from "../shared/constants";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

class BrightSyncApp {
  private mainWindow: BrowserWindow | null = null;
  private monitorManager!: MonitorManager;
  private brightnessController!: BrightnessController;
  private ipcHandler!: IPCHandler;
  private trayService!: TrayService;
  private hotkeyService!: HotkeyService;
  private isQuitting: boolean = false;
  private mockMode: boolean = false;

  constructor() {
    // Detect mock mode from command line arguments
    this.detectMockMode();
    this.initializeApp();
  }

  /**
   * Detect if --mock flag is present in command line arguments
   */
  private detectMockMode(): void {
    this.mockMode = process.argv.includes("--mock");

    if (this.mockMode) {
      console.log("=========================================");
      console.log("  MOCK MODE ENABLED");
      console.log("  All hardware calls will be simulated");
      console.log("=========================================");
    } else {
      console.log("Running in REAL mode with actual hardware");
    }
  }

  /**
   * Check if app is running with administrator privileges
   */
  private async checkAdminPrivileges(): Promise<boolean> {
    if (process.platform !== "win32") {
      return true; // Only needed on Windows
    }

    try {
      // Run a PowerShell command to check if running as admin
      const { stdout } = await execAsync(
        'powershell -Command "([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)"',
      );
      return stdout.trim().toLowerCase() === "true";
    } catch (error) {
      console.error("Failed to check admin privileges:", error);
      return false;
    }
  }

  /**
   * Show warning dialog about admin privileges
   */
  private async showAdminWarning(): Promise<void> {
    const result = await dialog.showMessageBox({
      type: "warning",
      title: "Administrator Privileges Required",
      message:
        "BrightSync requires administrator privileges to control laptop display brightness",
      detail:
        "Internal laptop displays use Windows WMI (Windows Management Instrumentation) which requires elevated privileges.\n\n" +
        "To fix this:\n" +
        "1. Close the app\n" +
        "2. Run: npm run dev:admin\n" +
        "   OR right-click the BrightSync shortcut and select 'Run as administrator'\n\n" +
        "Note: External monitors may still work without admin rights.",
      buttons: ["Continue Anyway", "Exit"],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 1) {
      app.quit();
    }
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

    // Check for admin privileges (skip in mock mode)
    if (!this.mockMode) {
      const isAdmin = await this.checkAdminPrivileges();
      if (!isAdmin) {
        console.warn(
          "⚠ WARNING: Running without administrator privileges. Internal display brightness control may not work.",
        );
        await this.showAdminWarning();
      } else {
        console.log("✓ Running with administrator privileges");
      }
    }

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
    // Initialize monitor manager with mock mode flag
    this.monitorManager = new MonitorManager(this.mockMode);

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
