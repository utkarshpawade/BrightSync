/**
 * IPC Handlers - Communication between main and renderer processes
 */

import { ipcMain, IpcMainInvokeEvent, WebContents } from "electron";
import { MonitorManager } from "./monitor.manager";
import { BrightnessController } from "./brightness.controller";
import {
  IPC_CHANNELS,
  IPCResponse,
  Monitor,
  BrightnessChangeRequest,
  AppSettings,
} from "../shared/types";
import Store from "electron-store";
import { DEFAULT_SETTINGS } from "../shared/constants";

export class IPCHandler {
  private monitorManager: MonitorManager;
  private brightnessController: BrightnessController;
  private store: Store<AppSettings>;
  private mainWebContents: WebContents | null = null;

  constructor(
    monitorManager: MonitorManager,
    brightnessController: BrightnessController,
  ) {
    this.monitorManager = monitorManager;
    this.brightnessController = brightnessController;
    this.store = new Store<AppSettings>({
      defaults: DEFAULT_SETTINGS as AppSettings,
    });

    this.registerHandlers();
  }

  /**
   * Set the main window's web contents for sending events
   */
  public setMainWebContents(webContents: WebContents): void {
    this.mainWebContents = webContents;
  }

  /**
   * Register all IPC handlers
   */
  private registerHandlers(): void {
    // Get all monitors
    ipcMain.handle(
      IPC_CHANNELS.MONITORS_GET,
      async (_event: IpcMainInvokeEvent): Promise<IPCResponse<Monitor[]>> => {
        return this.handleMonitorsGet();
      },
    );

    // Get brightness for a specific monitor
    ipcMain.handle(
      IPC_CHANNELS.BRIGHTNESS_GET,
      async (
        _event: IpcMainInvokeEvent,
        monitorId: string,
      ): Promise<IPCResponse<number>> => {
        return this.handleBrightnessGet(monitorId);
      },
    );

    // Set brightness
    ipcMain.handle(
      IPC_CHANNELS.BRIGHTNESS_SET,
      async (
        _event: IpcMainInvokeEvent,
        request: BrightnessChangeRequest,
      ): Promise<IPCResponse<boolean>> => {
        return this.handleBrightnessSet(request);
      },
    );

    // Toggle sync
    ipcMain.handle(
      IPC_CHANNELS.SYNC_TOGGLE,
      async (_event: IpcMainInvokeEvent): Promise<IPCResponse<boolean>> => {
        return this.handleSyncToggle();
      },
    );

    // Get settings
    ipcMain.handle(
      IPC_CHANNELS.SETTINGS_GET,
      async (_event: IpcMainInvokeEvent): Promise<IPCResponse<AppSettings>> => {
        return this.handleSettingsGet();
      },
    );

    // Set settings
    ipcMain.handle(
      IPC_CHANNELS.SETTINGS_SET,
      async (
        _event: IpcMainInvokeEvent,
        settings: Partial<AppSettings>,
      ): Promise<IPCResponse<boolean>> => {
        return this.handleSettingsSet(settings);
      },
    );

    console.log("IPC handlers registered");
  }

  /**
   * Handle monitors get request
   */
  private async handleMonitorsGet(): Promise<IPCResponse<Monitor[]>> {
    try {
      const monitors = await this.monitorManager.getMonitors(true);
      return {
        success: true,
        data: monitors,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Failed to get monitors:", errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle brightness get request
   */
  private async handleBrightnessGet(
    monitorId: string,
  ): Promise<IPCResponse<number>> {
    try {
      const brightness = await this.monitorManager.getBrightness(monitorId);
      return {
        success: true,
        data: brightness,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `Failed to get brightness for monitor ${monitorId}:`,
        errorMessage,
      );
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle brightness set request
   */
  private async handleBrightnessSet(
    request: BrightnessChangeRequest,
  ): Promise<IPCResponse<boolean>> {
    try {
      if (request.monitorId) {
        // Set brightness for specific monitor
        const success = await this.brightnessController.setMonitorBrightness(
          request.monitorId,
          request.value,
          true,
        );

        if (success) {
          // Save last brightness setting
          this.store.set("lastBrightness", request.value);
        }

        return {
          success: true,
          data: success,
        };
      } else {
        // Set master brightness for all monitors
        await this.brightnessController.setMasterBrightness(
          request.value,
          true,
        );

        // Save last brightness setting
        this.store.set("lastBrightness", request.value);
        this.store.set("masterBrightness", request.value);

        return {
          success: true,
          data: true,
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Failed to set brightness:", errorMessage);
      return {
        success: false,
        error: errorMessage,
        data: false,
      };
    }
  }

  /**
   * Handle sync toggle request
   */
  private async handleSyncToggle(): Promise<IPCResponse<boolean>> {
    try {
      const newState = this.brightnessController.toggleSync();

      // Save sync state
      this.store.set("syncEnabled", newState);

      return {
        success: true,
        data: newState,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Failed to toggle sync:", errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle settings get request
   */
  private async handleSettingsGet(): Promise<IPCResponse<AppSettings>> {
    try {
      const settings: AppSettings = {
        syncEnabled: this.store.get(
          "syncEnabled",
          DEFAULT_SETTINGS.syncEnabled,
        ),
        lastBrightness: this.store.get(
          "lastBrightness",
          DEFAULT_SETTINGS.lastBrightness,
        ),
        launchOnStartup: this.store.get(
          "launchOnStartup",
          DEFAULT_SETTINGS.launchOnStartup,
        ),
        masterBrightness: this.store.get(
          "masterBrightness",
          DEFAULT_SETTINGS.masterBrightness,
        ),
      };

      return {
        success: true,
        data: settings,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Failed to get settings:", errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle settings set request
   */
  private async handleSettingsSet(
    settings: Partial<AppSettings>,
  ): Promise<IPCResponse<boolean>> {
    try {
      // Update each setting
      if (settings.syncEnabled !== undefined) {
        this.store.set("syncEnabled", settings.syncEnabled);
        this.brightnessController.setSyncEnabled(settings.syncEnabled);
      }

      if (settings.lastBrightness !== undefined) {
        this.store.set("lastBrightness", settings.lastBrightness);
      }

      if (settings.launchOnStartup !== undefined) {
        this.store.set("launchOnStartup", settings.launchOnStartup);
      }

      if (settings.masterBrightness !== undefined) {
        this.store.set("masterBrightness", settings.masterBrightness);
      }

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Failed to set settings:", errorMessage);
      return {
        success: false,
        error: errorMessage,
        data: false,
      };
    }
  }

  /**
   * Emit brightness changed event to renderer
   */
  public emitBrightnessChanged(
    monitorId: string,
    oldValue: number,
    newValue: number,
  ): void {
    if (this.mainWebContents && !this.mainWebContents.isDestroyed()) {
      this.mainWebContents.send(IPC_CHANNELS.BRIGHTNESS_CHANGED, {
        monitorId,
        oldValue,
        newValue,
      });
    }
  }

  /**
   * Load saved settings and apply them
   */
  public loadSettings(): void {
    const syncEnabled = this.store.get(
      "syncEnabled",
      DEFAULT_SETTINGS.syncEnabled,
    );
    this.brightnessController.setSyncEnabled(syncEnabled);

    console.log("Settings loaded:", {
      syncEnabled,
      lastBrightness: this.store.get("lastBrightness"),
      launchOnStartup: this.store.get("launchOnStartup"),
    });
  }
}
