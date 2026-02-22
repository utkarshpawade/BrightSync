/**
 * Shared TypeScript type definitions for BrightSync
 */

/**
 * Monitor information returned by native addon
 */
export interface Monitor {
  id: string;
  name: string;
  type: "internal" | "external";
  min: number;
  max: number;
  current: number;
}

/**
 * Application settings persisted to disk
 */
export interface AppSettings {
  syncEnabled: boolean;
  lastBrightness: number;
  launchOnStartup: boolean;
  masterBrightness: number;
}

/**
 * IPC channel names for type-safe communication
 */
export const IPC_CHANNELS = {
  MONITORS_GET: "monitors:get",
  BRIGHTNESS_GET: "brightness:get",
  BRIGHTNESS_SET: "brightness:set",
  SYNC_TOGGLE: "sync:toggle",
  BRIGHTNESS_CHANGED: "brightness:changed",
  SETTINGS_GET: "settings:get",
  SETTINGS_SET: "settings:set",
} as const;

/**
 * Response wrapper for IPC calls
 */
export interface IPCResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Brightness change request
 */
export interface BrightnessChangeRequest {
  monitorId?: string; // If undefined, applies to all monitors
  value: number;
}

/**
 * Brightness change event (emitted when brightness changes)
 */
export interface BrightnessChangeEvent {
  monitorId: string;
  oldValue: number;
  newValue: number;
}
