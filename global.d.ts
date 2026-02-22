/**
 * Global TypeScript declarations for BrightSync
 */

/// <reference types="node" />
/// <reference types="react" />
/// <reference types="react-dom" />

// Extend Window interface for renderer process
interface Window {
  brightnessAPI: {
    getMonitors: () => Promise<{
      success: boolean;
      data?: import("./src/shared/types").Monitor[];
      error?: string;
    }>;
    getBrightness: (monitorId: string) => Promise<{
      success: boolean;
      data?: number;
      error?: string;
    }>;
    setBrightness: (
      request: import("./src/shared/types").BrightnessChangeRequest,
    ) => Promise<{
      success: boolean;
      data?: boolean;
      error?: string;
    }>;
    toggleSync: () => Promise<{
      success: boolean;
      data?: boolean;
      error?: string;
    }>;
    getSettings: () => Promise<{
      success: boolean;
      data?: import("./src/shared/types").AppSettings;
      error?: string;
    }>;
    setSettings: (
      settings: Partial<import("./src/shared/types").AppSettings>,
    ) => Promise<{
      success: boolean;
      data?: boolean;
      error?: string;
    }>;
    onBrightnessChanged: (
      callback: (
        event: import("./src/shared/types").BrightnessChangeEvent,
      ) => void,
    ) => () => void;
  };
}

// Declare module for native addon
declare module "*.node" {
  const content: {
    getMonitors: () => import("./src/shared/types").Monitor[];
    getBrightness: (monitorId: string) => number;
    setBrightness: (monitorId: string, brightness: number) => boolean;
  };
  export default content;
}
