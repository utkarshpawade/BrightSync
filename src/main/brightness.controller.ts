/**
 * Brightness Controller - Manages brightness synchronization and transitions
 */

import { MonitorManager } from "./monitor.manager";
import { Monitor } from "../shared/types";
import { BRIGHTNESS_TRANSITION, BRIGHTNESS } from "../shared/constants";

export class BrightnessController {
  private monitorManager: MonitorManager;
  private syncEnabled: boolean = true;
  private transitionInProgress: Map<string, boolean> = new Map();

  constructor(monitorManager: MonitorManager) {
    this.monitorManager = monitorManager;
  }

  /**
   * Get sync enabled state
   */
  public isSyncEnabled(): boolean {
    return this.syncEnabled;
  }

  /**
   * Set sync enabled state
   */
  public setSyncEnabled(enabled: boolean): void {
    this.syncEnabled = enabled;
    console.log(`Brightness sync ${enabled ? "enabled" : "disabled"}`);
  }

  /**
   * Toggle sync enabled state
   */
  public toggleSync(): boolean {
    this.syncEnabled = !this.syncEnabled;
    console.log(
      `Brightness sync toggled to ${this.syncEnabled ? "enabled" : "disabled"}`,
    );
    return this.syncEnabled;
  }

  /**
   * Set master brightness - applies to all monitors proportionally
   */
  public async setMasterBrightness(
    targetValue: number,
    animated: boolean = true,
  ): Promise<void> {
    if (!this.syncEnabled) {
      console.log("Sync disabled, skipping master brightness change");
      return;
    }

    const clampedTarget = Math.max(
      BRIGHTNESS.MIN,
      Math.min(BRIGHTNESS.MAX, Math.round(targetValue)),
    );
    const monitors = await this.monitorManager.getMonitors();

    console.log(
      `Setting master brightness to ${clampedTarget} for ${monitors.length} monitors`,
    );

    // Set brightness for all monitors in parallel
    const promises = monitors.map(async (monitor) => {
      // Calculate target brightness for this monitor
      const target = this.calculateProportionalBrightness(
        clampedTarget,
        monitor,
      );

      if (animated) {
        await this.setWithTransition(monitor.id, monitor.current, target);
      } else {
        await this.monitorManager.setBrightness(monitor.id, target);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Set brightness for a specific monitor
   */
  public async setMonitorBrightness(
    monitorId: string,
    targetValue: number,
    animated: boolean = true,
  ): Promise<boolean> {
    const clampedTarget = Math.max(
      BRIGHTNESS.MIN,
      Math.min(BRIGHTNESS.MAX, Math.round(targetValue)),
    );

    // Get current brightness
    let currentBrightness: number;
    try {
      currentBrightness = await this.monitorManager.getBrightness(monitorId);
    } catch (error) {
      console.error(
        `Failed to get current brightness for monitor ${monitorId}:`,
        error,
      );
      return false;
    }

    if (animated) {
      await this.setWithTransition(monitorId, currentBrightness, clampedTarget);
    } else {
      await this.monitorManager.setBrightness(monitorId, clampedTarget);
    }

    return true;
  }

  /**
   * Increase brightness by a step
   */
  public async increaseBrightness(step: number = 10): Promise<void> {
    const monitors = await this.monitorManager.getMonitors();

    if (monitors.length === 0) {
      console.warn("No monitors available to increase brightness");
      return;
    }

    // Calculate average current brightness
    const avgBrightness =
      monitors.reduce((sum, m) => sum + m.current, 0) / monitors.length;
    const newBrightness = Math.min(BRIGHTNESS.MAX, avgBrightness + step);

    await this.setMasterBrightness(newBrightness, true);
  }

  /**
   * Decrease brightness by a step
   */
  public async decreaseBrightness(step: number = 10): Promise<void> {
    const monitors = await this.monitorManager.getMonitors();

    if (monitors.length === 0) {
      console.warn("No monitors available to decrease brightness");
      return;
    }

    // Calculate average current brightness
    const avgBrightness =
      monitors.reduce((sum, m) => sum + m.current, 0) / monitors.length;
    const newBrightness = Math.max(BRIGHTNESS.MIN, avgBrightness - step);

    await this.setMasterBrightness(newBrightness, true);
  }

  /**
   * Calculate proportional brightness for a monitor based on master brightness
   */
  private calculateProportionalBrightness(
    masterBrightness: number,
    monitor: Monitor,
  ): number {
    // Simple proportional mapping
    const percentage = masterBrightness / BRIGHTNESS.MAX;
    const target = Math.round(
      monitor.min + (monitor.max - monitor.min) * percentage,
    );

    return Math.max(monitor.min, Math.min(monitor.max, target));
  }

  /**
   * Set brightness with smooth transition animation
   */
  private async setWithTransition(
    monitorId: string,
    currentValue: number,
    targetValue: number,
  ): Promise<void> {
    // Check if transition is already in progress for this monitor
    if (this.transitionInProgress.get(monitorId)) {
      console.log(
        `Transition already in progress for monitor ${monitorId}, skipping`,
      );
      return;
    }

    this.transitionInProgress.set(monitorId, true);

    try {
      const difference = targetValue - currentValue;
      const steps = Math.ceil(
        Math.abs(difference) / BRIGHTNESS_TRANSITION.STEP_SIZE,
      );

      if (steps === 0) {
        return; // Already at target
      }

      const stepValue = difference / steps;
      let current = currentValue;

      for (let i = 0; i < steps; i++) {
        current += stepValue;
        const roundedValue = Math.round(current);

        await this.monitorManager.setBrightness(monitorId, roundedValue);

        // Wait before next step (except for the last step)
        if (i < steps - 1) {
          await this.sleep(BRIGHTNESS_TRANSITION.STEP_DELAY_MS);
        }
      }

      // Ensure we end exactly at target
      await this.monitorManager.setBrightness(monitorId, targetValue);
    } finally {
      this.transitionInProgress.set(monitorId, false);
    }
  }

  /**
   * Sleep utility for transitions
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get average brightness across all monitors
   */
  public async getAverageBrightness(): Promise<number> {
    const monitors = await this.monitorManager.getMonitors();

    if (monitors.length === 0) {
      return BRIGHTNESS.DEFAULT;
    }

    const total = monitors.reduce((sum, monitor) => sum + monitor.current, 0);
    return Math.round(total / monitors.length);
  }
}
