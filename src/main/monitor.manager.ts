/**
 * Monitor Manager - Interface to native addon for monitor operations
 */

import { Monitor } from "../shared/types";
import * as path from "path";

// Import native addon
let nativeAddon: NativeBrightnessAddon | null = null;

interface NativeBrightnessAddon {
  getMonitors(): Monitor[];
  getBrightness(monitorId: string): number;
  setBrightness(monitorId: string, value: number): boolean;
}

/**
 * Initialize the native addon
 */
function initializeNativeAddon(): NativeBrightnessAddon {
  if (nativeAddon) {
    return nativeAddon;
  }

  try {
    // Load native addon from build directory
    const addonPath = path.join(
      __dirname,
      "../../build/Release/brightness.node",
    );
    nativeAddon = require(addonPath) as NativeBrightnessAddon;
    console.log("Native brightness addon loaded successfully");
    return nativeAddon;
  } catch (error) {
    console.error("Failed to load native brightness addon:", error);
    throw new Error(`Failed to initialize native addon: ${error}`);
  }
}

export class MonitorManager {
  private addon: NativeBrightnessAddon;
  private monitors: Monitor[] = [];
  private lastUpdate: number = 0;
  private cacheTimeout: number = 500; // Cache monitor list for 500ms

  constructor() {
    this.addon = initializeNativeAddon();
    this.refreshMonitors();
  }

  /**
   * Get list of all connected monitors
   */
  public async getMonitors(forceRefresh: boolean = false): Promise<Monitor[]> {
    const now = Date.now();

    // Use cached monitors if recent enough
    if (
      !forceRefresh &&
      this.monitors.length > 0 &&
      now - this.lastUpdate < this.cacheTimeout
    ) {
      return this.monitors;
    }

    return this.refreshMonitors();
  }

  /**
   * Refresh monitor list from native addon
   */
  private async refreshMonitors(): Promise<Monitor[]> {
    try {
      this.monitors = this.addon.getMonitors();
      this.lastUpdate = Date.now();

      console.log(
        `Found ${this.monitors.length} monitors:`,
        this.monitors.map((m) => `${m.name} (${m.type})`).join(", "),
      );

      return this.monitors;
    } catch (error) {
      console.error("Failed to get monitors:", error);
      throw new Error(`Failed to retrieve monitors: ${error}`);
    }
  }

  /**
   * Get current brightness for a specific monitor
   */
  public async getBrightness(monitorId: string): Promise<number> {
    try {
      const brightness = this.addon.getBrightness(monitorId);

      if (brightness < 0) {
        throw new Error(`Failed to get brightness for monitor ${monitorId}`);
      }

      return brightness;
    } catch (error) {
      console.error(
        `Failed to get brightness for monitor ${monitorId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Set brightness for a specific monitor
   */
  public async setBrightness(
    monitorId: string,
    value: number,
  ): Promise<boolean> {
    try {
      // Clamp value to valid range
      const clampedValue = Math.max(0, Math.min(100, Math.round(value)));

      const success = this.addon.setBrightness(monitorId, clampedValue);

      if (!success) {
        console.warn(`Failed to set brightness for monitor ${monitorId}`);
        return false;
      }

      // Update cached monitor brightness
      const monitor = this.monitors.find((m) => m.id === monitorId);
      if (monitor) {
        monitor.current = clampedValue;
      }

      return true;
    } catch (error) {
      console.error(
        `Failed to set brightness for monitor ${monitorId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Set brightness for all monitors
   */
  public async setBrightnessForAll(
    value: number,
  ): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    const monitors = await this.getMonitors();

    // Set brightness for all monitors in parallel
    const promises = monitors.map(async (monitor) => {
      const success = await this.setBrightness(monitor.id, value);
      results.set(monitor.id, success);
    });

    await Promise.all(promises);

    return results;
  }

  /**
   * Get the internal (laptop) monitor if available
   */
  public async getInternalMonitor(): Promise<Monitor | null> {
    const monitors = await this.getMonitors();
    return monitors.find((m) => m.type === "internal") || null;
  }

  /**
   * Get all external monitors
   */
  public async getExternalMonitors(): Promise<Monitor[]> {
    const monitors = await this.getMonitors();
    return monitors.filter((m) => m.type === "external");
  }

  /**
   * Check if a monitor exists
   */
  public async hasMonitor(monitorId: string): Promise<boolean> {
    const monitors = await this.getMonitors();
    return monitors.some((m) => m.id === monitorId);
  }
}
