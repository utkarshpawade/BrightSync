/**
 * Preload Script - Exposes safe API to renderer process
 */

import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";
import {
  IPC_CHANNELS,
  IPCResponse,
  Monitor,
  BrightnessChangeRequest,
  BrightnessChangeEvent,
  AppSettings,
} from "../shared/types";

/**
 * API exposed to renderer process via contextBridge
 */
const brightnessAPI = {
  /**
   * Get all connected monitors
   */
  getMonitors: async (): Promise<IPCResponse<Monitor[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.MONITORS_GET);
  },

  /**
   * Get brightness for a specific monitor
   */
  getBrightness: async (monitorId: string): Promise<IPCResponse<number>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.BRIGHTNESS_GET, monitorId);
  },

  /**
   * Set brightness
   */
  setBrightness: async (
    request: BrightnessChangeRequest,
  ): Promise<IPCResponse<boolean>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.BRIGHTNESS_SET, request);
  },

  /**
   * Toggle sync enabled state
   */
  toggleSync: async (): Promise<IPCResponse<boolean>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SYNC_TOGGLE);
  },

  /**
   * Get application settings
   */
  getSettings: async (): Promise<IPCResponse<AppSettings>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET);
  },

  /**
   * Set application settings
   */
  setSettings: async (
    settings: Partial<AppSettings>,
  ): Promise<IPCResponse<boolean>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, settings);
  },

  /**
   * Listen for brightness change events
   */
  onBrightnessChanged: (
    callback: (event: BrightnessChangeEvent) => void,
  ): (() => void) => {
    const listener = (
      _event: IpcRendererEvent,
      data: BrightnessChangeEvent,
    ) => {
      callback(data);
    };

    ipcRenderer.on(IPC_CHANNELS.BRIGHTNESS_CHANGED, listener);

    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.BRIGHTNESS_CHANGED, listener);
    };
  },
};

// Expose API to renderer via contextBridge
contextBridge.exposeInMainWorld("brightnessAPI", brightnessAPI);

// Type declaration for TypeScript
export type BrightnessAPI = typeof brightnessAPI;
