/**
 * Hotkey Service - Manages global keyboard shortcuts
 */

import { globalShortcut } from "electron";
import { BrightnessController } from "./brightness.controller";
import { HOTKEYS } from "../shared/constants";

export class HotkeyService {
  private brightnessController: BrightnessController;
  private registered: boolean = false;

  constructor(brightnessController: BrightnessController) {
    this.brightnessController = brightnessController;
  }

  /**
   * Register global hotkeys
   */
  public register(): void {
    if (this.registered) {
      console.warn("Hotkeys already registered");
      return;
    }

    try {
      // Register increase brightness hotkey
      const increaseSuccess = globalShortcut.register(
        HOTKEYS.INCREASE,
        async () => {
          console.log("Hotkey pressed: Increase brightness");
          await this.brightnessController.increaseBrightness(
            HOTKEYS.BRIGHTNESS_STEP,
          );
        },
      );

      if (!increaseSuccess) {
        console.error("Failed to register increase brightness hotkey");
      }

      // Register decrease brightness hotkey
      const decreaseSuccess = globalShortcut.register(
        HOTKEYS.DECREASE,
        async () => {
          console.log("Hotkey pressed: Decrease brightness");
          await this.brightnessController.decreaseBrightness(
            HOTKEYS.BRIGHTNESS_STEP,
          );
        },
      );

      if (!decreaseSuccess) {
        console.error("Failed to register decrease brightness hotkey");
      }

      if (increaseSuccess && decreaseSuccess) {
        this.registered = true;
        console.log("Global hotkeys registered successfully");
        console.log(`  Increase: ${HOTKEYS.INCREASE}`);
        console.log(`  Decrease: ${HOTKEYS.DECREASE}`);
      }
    } catch (error) {
      console.error("Failed to register global hotkeys:", error);
    }
  }

  /**
   * Unregister all global hotkeys
   */
  public unregister(): void {
    if (!this.registered) {
      return;
    }

    try {
      globalShortcut.unregister(HOTKEYS.INCREASE);
      globalShortcut.unregister(HOTKEYS.DECREASE);

      this.registered = false;
      console.log("Global hotkeys unregistered");
    } catch (error) {
      console.error("Failed to unregister global hotkeys:", error);
    }
  }

  /**
   * Unregister all shortcuts (called on app quit)
   */
  public unregisterAll(): void {
    try {
      globalShortcut.unregisterAll();
      this.registered = false;
      console.log("All global shortcuts unregistered");
    } catch (error) {
      console.error("Failed to unregister all shortcuts:", error);
    }
  }

  /**
   * Check if hotkeys are registered
   */
  public isRegistered(): boolean {
    return this.registered;
  }
}
