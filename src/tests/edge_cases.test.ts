/**
 * Edge Case Test Matrix
 *
 * Comprehensive edge case testing covering unusual scenarios
 */

import { Monitor } from "../shared/types";

// Mock native addon
const mockNativeAddon = {
  initialize: jest.fn(() => true),
  getMonitors: jest.fn(),
  getBrightness: jest.fn(),
  setBrightness: jest.fn(() => true),
};

jest.mock("../../build/Release/brightness.node", () => mockNativeAddon, {
  virtual: true,
});

import { BrightnessController } from "../main/brightness.controller";
import { MonitorManager } from "../main/monitor.manager";

describe("Edge Case Test Matrix", () => {
  let brightnessController: BrightnessController;
  let monitorManager: MonitorManager;
  let mockMonitors: Monitor[];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Monitor Count Edge Cases", () => {
    it("should handle zero monitors", async () => {
      mockMonitors = [];
      mockNativeAddon.getMonitors.mockReturnValue(mockMonitors);

      monitorManager = new MonitorManager(true);
      brightnessController = new BrightnessController(monitorManager);

      const monitors = await monitorManager.getMonitors();
      expect(monitors).toHaveLength(0);

      await expect(
        brightnessController.setMasterBrightness(50, true),
      ).resolves.not.toThrow();
    });

    it("should handle single internal monitor only", async () => {
      mockMonitors = [
        {
          id: "internal_0",
          name: "Internal",
          type: "internal",
          min: 0,
          max: 100,
          current: 50,
        },
      ];
      mockNativeAddon.getMonitors.mockReturnValue(mockMonitors);
      setupMockBehavior();

      monitorManager = new MonitorManager(true);
      brightnessController = new BrightnessController(monitorManager);

      await brightnessController.setMasterBrightness(75, true);
      expect(mockMonitors[0].current).toBe(75);
    });

    it("should handle single external monitor only", async () => {
      mockMonitors = [
        {
          id: "external_0",
          name: "External",
          type: "external",
          min: 0,
          max: 100,
          current: 50,
        },
      ];
      mockNativeAddon.getMonitors.mockReturnValue(mockMonitors);
      setupMockBehavior();

      monitorManager = new MonitorManager(true);
      brightnessController = new BrightnessController(monitorManager);

      await brightnessController.setMasterBrightness(75, true);
      expect(mockMonitors[0].current).toBe(75);
    });

    it("should handle 10 simulated monitors", async () => {
      mockMonitors = Array.from({ length: 10 }, (_, i) => ({
        id: `monitor_${i}`,
        name: `Monitor ${i}`,
        type: i === 0 ? "internal" : "external",
        min: 0,
        max: 100,
        current: 50,
      }));
      mockNativeAddon.getMonitors.mockReturnValue(mockMonitors);
      setupMockBehavior();

      monitorManager = new MonitorManager(true);
      brightnessController = new BrightnessController(monitorManager);

      await brightnessController.setMasterBrightness(75, true);

      mockMonitors.forEach((monitor) => {
        expect(monitor.current).toBe(75);
      });
    });

    it("should handle only external monitors (no internal)", async () => {
      mockMonitors = [
        {
          id: "external_0",
          name: "External 1",
          type: "external",
          min: 0,
          max: 100,
          current: 50,
        },
        {
          id: "external_1",
          name: "External 2",
          type: "external",
          min: 0,
          max: 100,
          current: 50,
        },
        {
          id: "external_2",
          name: "External 3",
          type: "external",
          min: 0,
          max: 100,
          current: 50,
        },
      ];
      mockNativeAddon.getMonitors.mockReturnValue(mockMonitors);
      setupMockBehavior();

      monitorManager = new MonitorManager(true);
      brightnessController = new BrightnessController(monitorManager);

      await brightnessController.setMasterBrightness(80, true);

      mockMonitors.forEach((monitor) => {
        expect(monitor.current).toBe(80);
      });
    });
  });

  describe("Monitor Range Edge Cases", () => {
    it("should handle monitors with different max values", async () => {
      mockMonitors = [
        {
          id: "monitor_0",
          name: "Monitor 0",
          type: "internal",
          min: 0,
          max: 100,
          current: 50,
        },
        {
          id: "monitor_1",
          name: "Monitor 1",
          type: "external",
          min: 0,
          max: 75,
          current: 37,
        },
        {
          id: "monitor_2",
          name: "Monitor 2",
          type: "external",
          min: 0,
          max: 50,
          current: 25,
        },
      ];
      mockNativeAddon.getMonitors.mockReturnValue(mockMonitors);
      setupMockBehavior();

      monitorManager = new MonitorManager(true);
      brightnessController = new BrightnessController(monitorManager);

      await brightnessController.setMasterBrightness(100, true);

      mockMonitors.forEach((monitor) => {
        expect(monitor.current).toBeLessThanOrEqual(monitor.max);
      });
    });

    it("should handle monitors with non-zero min values", async () => {
      mockMonitors = [
        {
          id: "monitor_0",
          name: "Monitor 0",
          type: "internal",
          min: 10,
          max: 100,
          current: 55,
        },
        {
          id: "monitor_1",
          name: "Monitor 1",
          type: "external",
          min: 20,
          max: 100,
          current: 60,
        },
        {
          id: "monitor_2",
          name: "Monitor 2",
          type: "external",
          min: 0,
          max: 100,
          current: 50,
        },
      ];
      mockNativeAddon.getMonitors.mockReturnValue(mockMonitors);
      setupMockBehavior();

      monitorManager = new MonitorManager(true);
      brightnessController = new BrightnessController(monitorManager);

      await brightnessController.setMasterBrightness(0, true);

      mockMonitors.forEach((monitor) => {
        expect(monitor.current).toBeGreaterThanOrEqual(monitor.min);
      });
    });

    it("should handle monitors with narrow ranges", async () => {
      mockMonitors = [
        {
          id: "monitor_0",
          name: "Monitor 0",
          type: "internal",
          min: 45,
          max: 55,
          current: 50,
        },
        {
          id: "monitor_1",
          name: "Monitor 1",
          type: "external",
          min: 0,
          max: 100,
          current: 50,
        },
      ];
      mockNativeAddon.getMonitors.mockReturnValue(mockMonitors);
      setupMockBehavior();

      monitorManager = new MonitorManager(true);
      brightnessController = new BrightnessController(monitorManager);

      await brightnessController.setMasterBrightness(100, true);

      expect(mockMonitors[0].current).toBe(55); // Clamped to max
      expect(mockMonitors[1].current).toBe(100);
    });

    it("should handle monitor with min equals max", async () => {
      mockMonitors = [
        {
          id: "monitor_0",
          name: "Monitor 0",
          type: "internal",
          min: 50,
          max: 50,
          current: 50,
        },
      ];
      mockNativeAddon.getMonitors.mockReturnValue(mockMonitors);
      setupMockBehavior();

      monitorManager = new MonitorManager(true);
      brightnessController = new BrightnessController(monitorManager);

      await brightnessController.setMasterBrightness(75, true);

      expect(mockMonitors[0].current).toBe(50); // Can't change
    });
  });

  describe("Invalid Monitor ID Edge Cases", () => {
    beforeEach(() => {
      mockMonitors = [
        {
          id: "monitor_0",
          name: "Monitor 0",
          type: "internal",
          min: 0,
          max: 100,
          current: 50,
        },
      ];
      mockNativeAddon.getMonitors.mockReturnValue(mockMonitors);
      setupMockBehavior();

      monitorManager = new MonitorManager(true);
      brightnessController = new BrightnessController(monitorManager);
    });

    it("should handle empty string monitor ID", async () => {
      const result = await brightnessController.getBrightness("");
      expect(result).toBe(-1);
    });

    it("should handle null-like monitor ID", async () => {
      const result = await brightnessController.getBrightness("null");
      expect(result).toBe(-1);
    });

    it("should handle undefined-like monitor ID", async () => {
      const result = await brightnessController.getBrightness("undefined");
      expect(result).toBe(-1);
    });

    it("should handle very long monitor ID", async () => {
      const veryLongId = "monitor_" + "a".repeat(1000);
      const result = await brightnessController.getBrightness(veryLongId);
      expect(result).toBe(-1);
    });

    it("should handle monitor ID with special characters", async () => {
      const specialId = "monitor_!@#$%^&*()";
      const result = await brightnessController.getBrightness(specialId);
      expect(result).toBe(-1);
    });
  });

  describe("Brightness Value Edge Cases", () => {
    beforeEach(() => {
      mockMonitors = [
        {
          id: "monitor_0",
          name: "Monitor 0",
          type: "internal",
          min: 0,
          max: 100,
          current: 50,
        },
      ];
      mockNativeAddon.getMonitors.mockReturnValue(mockMonitors);
      setupMockBehavior();

      monitorManager = new MonitorManager(true);
      brightnessController = new BrightnessController(monitorManager);
    });

    it("should handle NaN brightness value", async () => {
      await expect(
        brightnessController.setBrightness("monitor_0", NaN),
      ).resolves.not.toThrow();

      // Should clamp or reject
      expect(mockMonitors[0].current).toBeGreaterThanOrEqual(0);
      expect(mockMonitors[0].current).toBeLessThanOrEqual(100);
    });

    it("should handle Infinity brightness value", async () => {
      await brightnessController.setBrightness("monitor_0", Infinity);
      expect(mockMonitors[0].current).toBe(100);
    });

    it("should handle -Infinity brightness value", async () => {
      await brightnessController.setBrightness("monitor_0", -Infinity);
      expect(mockMonitors[0].current).toBe(0);
    });

    it("should handle very large integer brightness", async () => {
      await brightnessController.setBrightness("monitor_0", 2147483647);
      expect(mockMonitors[0].current).toBe(100);
    });

    it("should handle very large negative integer brightness", async () => {
      await brightnessController.setBrightness("monitor_0", -2147483648);
      expect(mockMonitors[0].current).toBe(0);
    });

    it("should handle floating point brightness", async () => {
      await brightnessController.setBrightness("monitor_0", 75.7);
      expect(mockMonitors[0].current).toBeGreaterThanOrEqual(75);
      expect(mockMonitors[0].current).toBeLessThanOrEqual(76);
    });
  });

  describe("Rapid Initialization Edge Cases", () => {
    it("should handle repeated initialization", async () => {
      for (let i = 0; i < 10; i++) {
        mockMonitors = [
          {
            id: `monitor_${i}`,
            name: `Monitor ${i}`,
            type: "internal",
            min: 0,
            max: 100,
            current: 50,
          },
        ];
        mockNativeAddon.getMonitors.mockReturnValue(mockMonitors);
        setupMockBehavior();

        monitorManager = new MonitorManager(true);
        brightnessController = new BrightnessController(monitorManager);

        const monitors = await monitorManager.getMonitors();
        expect(monitors).toHaveLength(1);
      }
    });

    it("should handle initialization with monitor list change", async () => {
      // Start with 3 monitors
      mockMonitors = Array.from({ length: 3 }, (_, i) => ({
        id: `monitor_${i}`,
        name: `Monitor ${i}`,
        type: i === 0 ? "internal" : "external",
        min: 0,
        max: 100,
        current: 50,
      }));
      mockNativeAddon.getMonitors.mockReturnValue(mockMonitors);
      setupMockBehavior();

      monitorManager = new MonitorManager(true);
      let monitors = await monitorManager.getMonitors();
      expect(monitors).toHaveLength(3);

      // Change to 1 monitor
      mockMonitors = [
        {
          id: "monitor_0",
          name: "Monitor 0",
          type: "internal",
          min: 0,
          max: 100,
          current: 50,
        },
      ];
      mockNativeAddon.getMonitors.mockReturnValue(mockMonitors);

      monitors = await monitorManager.getMonitors(true); // Force refresh
      expect(monitors).toHaveLength(1);
    });
  });

  describe("State Corruption Edge Cases", () => {
    beforeEach(() => {
      mockMonitors = [
        {
          id: "monitor_0",
          name: "Monitor 0",
          type: "internal",
          min: 0,
          max: 100,
          current: 50,
        },
        {
          id: "monitor_1",
          name: "Monitor 1",
          type: "external",
          min: 0,
          max: 100,
          current: 50,
        },
      ];
      mockNativeAddon.getMonitors.mockReturnValue(mockMonitors);
      setupMockBehavior();

      monitorManager = new MonitorManager(true);
      brightnessController = new BrightnessController(monitorManager);
    });

    it("should handle brightness set failure gracefully", async () => {
      mockNativeAddon.setBrightness.mockReturnValue(false);

      await expect(
        brightnessController.setBrightness("monitor_0", 75),
      ).resolves.not.toThrow();
    });

    it("should handle native addon returning invalid values", async () => {
      mockNativeAddon.getBrightness.mockReturnValue(-999);

      const result = await brightnessController.getBrightness("monitor_0");
      expect(result).toBeDefined();
    });

    it("should handle corrupted monitor list", async () => {
      mockNativeAddon.getMonitors.mockReturnValue([
        { id: null, name: null, type: null, min: NaN, max: NaN, current: NaN },
      ] as any);

      await expect(monitorManager.getMonitors(true)).resolves.toBeDefined();
    });
  });

  describe("Timing Edge Cases", () => {
    beforeEach(() => {
      mockMonitors = [
        {
          id: "monitor_0",
          name: "Monitor 0",
          type: "internal",
          min: 0,
          max: 100,
          current: 50,
        },
      ];
      mockNativeAddon.getMonitors.mockReturnValue(mockMonitors);
      setupMockBehavior();

      monitorManager = new MonitorManager(true);
      brightnessController = new BrightnessController(monitorManager);
    });

    it("should handle simultaneous get and set", async () => {
      const operations = [
        brightnessController.getBrightness("monitor_0"),
        brightnessController.setBrightness("monitor_0", 75),
        brightnessController.getBrightness("monitor_0"),
        brightnessController.setBrightness("monitor_0", 25),
        brightnessController.getBrightness("monitor_0"),
      ];

      await expect(Promise.all(operations)).resolves.toBeDefined();
    });

    it("should handle delayed native response", async () => {
      mockNativeAddon.setBrightness.mockImplementation(
        async (id: string, value: number) => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          const monitor = mockMonitors.find((m) => m.id === id);
          if (monitor) {
            monitor.current = Math.max(
              monitor.min,
              Math.min(monitor.max, value),
            );
            return true;
          }
          return false;
        },
      );

      await expect(
        brightnessController.setBrightness("monitor_0", 75),
      ).resolves.not.toThrow();
    });
  });

  // Helper function to setup mock behavior
  function setupMockBehavior() {
    mockNativeAddon.getBrightness.mockImplementation((id: string) => {
      const monitor = mockMonitors.find((m) => m.id === id);
      return monitor ? monitor.current : -1;
    });
    mockNativeAddon.setBrightness.mockImplementation(
      (id: string, value: number) => {
        const monitor = mockMonitors.find((m) => m.id === id);
        if (monitor) {
          monitor.current = Math.max(monitor.min, Math.min(monitor.max, value));
          return true;
        }
        return false;
      },
    );
  }
});
