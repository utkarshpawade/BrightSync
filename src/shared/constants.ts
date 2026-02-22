/**
 * Application-wide constants for BrightSync
 */

/**
 * Brightness transition animation settings
 */
export const BRIGHTNESS_TRANSITION = {
  STEP_SIZE: 2,
  STEP_DELAY_MS: 10,
} as const;

/**
 * Brightness value constraints
 */
export const BRIGHTNESS = {
  MIN: 0,
  MAX: 100,
  DEFAULT: 50,
} as const;

/**
 * Global hotkey definitions
 */
export const HOTKEYS = {
  INCREASE: "CommandOrControl+Alt+Up",
  DECREASE: "CommandOrControl+Alt+Down",
  BRIGHTNESS_STEP: 10,
} as const;

/**
 * Application window settings
 */
export const WINDOW = {
  WIDTH: 600,
  HEIGHT: 500,
  MIN_WIDTH: 500,
  MIN_HEIGHT: 400,
} as const;

/**
 * DDC/CI VCP feature codes
 */
export const VCP_CODES = {
  BRIGHTNESS: 0x10,
} as const;

/**
 * Monitor polling interval (in milliseconds)
 */
export const MONITOR_POLL_INTERVAL = 1000;

/**
 * Default application settings
 */
export const DEFAULT_SETTINGS = {
  syncEnabled: true,
  lastBrightness: 50,
  launchOnStartup: false,
  masterBrightness: 50,
} as const;
