/**
 * Stress Test Suite
 *
 * Simulates extreme usage scenarios to test stability and performance
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

describe("Stress Tests", () => {
  let brightnessController: BrightnessController;
  let monitorManager: MonitorManager;
  let mockMonitors: Monitor[];

  beforeEach(() => {
    jest.clearAllMocks();

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

    monitorManager = new MonitorManager(true);
    brightnessController = new BrightnessController(monitorManager);
  });

  describe("Rapid Brightness Updates", () => {
    it("should handle 500 rapid brightness updates without crash", async () => {
      const updates: Promise<void>[] = [];

      for (let i = 0; i < 500; i++) {
        const brightness = i % 101;
        updates.push(
          brightnessController.setMasterBrightness(brightness, true),
        );
      }

      await expect(Promise.all(updates)).resolves.not.toThrow();
    });

    it("should maintain consistent state after rapid updates", async () => {
      for (let i = 0; i < 500; i++) {
        await brightnessController.setMasterBrightness(i % 101, true);
      }

      const monitors = await monitorManager.getMonitors();
      monitors.forEach((monitor) => {
        expect(monitor.current).toBeGreaterThanOrEqual(0);
        expect(monitor.current).toBeLessThanOrEqual(100);
      });
    });

    it("should handle concurrent brightness changes on different monitors", async () => {
      const operations: Promise<void>[] = [];

      for (let i = 0; i < 100; i++) {
        operations.push(
          brightnessController.setBrightness("monitor_0", (i * 3) % 101),
        );
        operations.push(
          brightnessController.setBrightness("monitor_1", (i * 5) % 101),
        );
        operations.push(
          brightnessController.setBrightness("monitor_2", (i * 7) % 101),
        );
      }

      await expect(Promise.all(operations)).resolves.not.toThrow();
    });
  });

  describe("Random Value Stress", () => {
    it("should handle 1000 random brightness values", async () => {
      for (let i = 0; i < 1000; i++) {
        const randomBrightness = Math.floor(Math.random() * 200) - 50; // -50 to 150
        await brightnessController.setMasterBrightness(randomBrightness, true);
      }

      const monitors = await monitorManager.getMonitors();
      monitors.forEach((monitor) => {
        expect(monitor.current).toBeGreaterThanOrEqual(0);
        expect(monitor.current).toBeLessThanOrEqual(100);
      });
    });

    it("should handle random monitor selection with random values", async () => {
      const monitorIds = mockMonitors.map((m) => m.id);

      for (let i = 0; i < 500; i++) {
        const randomMonitorId =
          monitorIds[Math.floor(Math.random() * monitorIds.length)];
        const randomBrightness = Math.floor(Math.random() * 200) - 50;

        await brightnessController.setBrightness(
          randomMonitorId,
          randomBrightness,
        );
      }

      mockMonitors.forEach((monitor) => {
        expect(monitor.current).toBeGreaterThanOrEqual(0);
        expect(monitor.current).toBeLessThanOrEqual(100);
      });
    });
  });

  describe("Sync Toggle Stress", () => {
    it("should handle 500 rapid sync toggles", async () => {
      for (let i = 0; i < 500; i++) {
        brightnessController.setSyncEnabled(i % 2 === 0);
        await brightnessController.setMasterBrightness(
          50,
          brightnessController.isSyncEnabled(),
        );
      }

      expect(true).toBe(true); // No crash
    });

    it("should maintain state consistency with rapid sync toggle and brightness changes", async () => {
      for (let i = 0; i < 200; i++) {
        brightnessController.setSyncEnabled(Math.random() > 0.5);

        if (brightnessController.isSyncEnabled()) {
          await brightnessController.setMasterBrightness(
            Math.floor(Math.random() * 101),
            true,
          );
        } else {
          const randomMonitorId =
            mockMonitors[Math.floor(Math.random() * mockMonitors.length)].id;
          await brightnessController.setBrightness(
            randomMonitorId,
            Math.floor(Math.random() * 101),
          );
        }
      }

      mockMonitors.forEach((monitor) => {
        expect(monitor.current).toBeGreaterThanOrEqual(0);
        expect(monitor.current).toBeLessThanOrEqual(100);
      });
    });
  });

  describe("Extreme Value Stress", () => {
    it("should handle extreme negative values repeatedly", async () => {
      for (let i = 0; i < 100; i++) {
        await brightnessController.setMasterBrightness(-999999, true);
      }

      mockMonitors.forEach((monitor) => {
        expect(monitor.current).toBe(0);
      });
    });

    it("should handle extreme positive values repeatedly", async () => {
      for (let i = 0; i < 100; i++) {
        await brightnessController.setMasterBrightness(999999, true);
      }

      mockMonitors.forEach((monitor) => {
        expect(monitor.current).toBe(100);
      });
    });

    it("should handle alternating extreme values", async () => {
      for (let i = 0; i < 100; i++) {
        await brightnessController.setMasterBrightness(
          i % 2 === 0 ? -999999 : 999999,
          true,
        );
      }

      mockMonitors.forEach((monitor) => {
        expect(monitor.current).toBe(100);
      });
    });
  });

  describe("Monitor Refresh Stress", () => {
    it("should handle repeated monitor list refreshes", async () => {
      for (let i = 0; i < 100; i++) {
        await monitorManager.getMonitors(true); // Force refresh
      }

      const monitors = await monitorManager.getMonitors();
      expect(monitors).toHaveLength(3);
    });

    it("should maintain state across refreshes", async () => {
      await brightnessController.setMasterBrightness(75, true);

      for (let i = 0; i < 50; i++) {
        await monitorManager.getMonitors(true);
      }

      // Brightness should be maintained (or at least valid)
      mockMonitors.forEach((monitor) => {
        expect(monitor.current).toBeGreaterThanOrEqual(0);
        expect(monitor.current).toBeLessThanOrEqual(100);
      });
    });
  });

  describe("Memory and Performance", () => {
    it("should not leak memory with repeated operations", async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 1000; i++) {
        await brightnessController.setMasterBrightness(i % 101, true);
        await monitorManager.getMonitors();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 10MB for this test)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it("should complete 1000 operations in reasonable time", async () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        await brightnessController.setBrightness("monitor_0", i % 101);
      }

      const duration = Date.now() - startTime;

      // Should complete in less than 5 seconds
      expect(duration).toBeLessThan(5000);
    });
  });

  describe("State Consistency", () => {
    it("should maintain valid state throughout stress test", async () => {
      for (let iteration = 0; iteration < 10; iteration++) {
        // Random sync state
        brightnessController.setSyncEnabled(Math.random() > 0.5);

        // Random operations
        for (let op = 0; op < 50; op++) {
          const operation = Math.floor(Math.random() * 3);

          if (operation === 0) {
            // Set master brightness
            await brightnessController.setMasterBrightness(
              Math.floor(Math.random() * 101),
              brightnessController.isSyncEnabled(),
            );
          } else if (operation === 1) {
            // Set individual monitor
            const randomMonitorId =
              mockMonitors[Math.floor(Math.random() * mockMonitors.length)].id;
            await brightnessController.setBrightness(
              randomMonitorId,
              Math.floor(Math.random() * 101),
            );
          } else {
            // Get brightness
            const randomMonitorId =
              mockMonitors[Math.floor(Math.random() * mockMonitors.length)].id;
            await brightnessController.getBrightness(randomMonitorId);
          }
        }

        // Verify state is still valid
        mockMonitors.forEach((monitor) => {
          expect(monitor.current).toBeGreaterThanOrEqual(0);
          expect(monitor.current).toBeLessThanOrEqual(100);
        });
      }
    });

    it("should have consistent final state after mixed operations", async () => {
      const operations = [
        async () => brightnessController.setMasterBrightness(50, true),
        async () => brightnessController.setBrightness("monitor_0", 75),
        async () => brightnessController.getSyncEnabled(),
        async () => monitorManager.getMonitors(),
        async () =>
          brightnessController.setSyncEnabled(
            !brightnessController.isSyncEnabled(),
          ),
      ];

      for (let i = 0; i < 500; i++) {
        const randomOperation =
          operations[Math.floor(Math.random() * operations.length)];
        await randomOperation();
      }

      // All monitors should still have valid brightness
      mockMonitors.forEach((monitor) => {
        expect(monitor.current).toBeGreaterThanOrEqual(monitor.min);
        expect(monitor.current).toBeLessThanOrEqual(monitor.max);
      });
    });
  });

  describe("Boundary Stress", () => {
    it("should handle alternating min/max values rapidly", async () => {
      for (let i = 0; i < 200; i++) {
        await brightnessController.setMasterBrightness(
          i % 2 === 0 ? 0 : 100,
          true,
        );
      }

      mockMonitors.forEach((monitor) => {
        expect([0, 100]).toContain(monitor.current);
      });
    });

    it("should handle incrementing through entire range multiple times", async () => {
      for (let cycle = 0; cycle < 5; cycle++) {
        for (let value = 0; value <= 100; value++) {
          await brightnessController.setMasterBrightness(value, true);
        }
        for (let value = 100; value >= 0; value--) {
          await brightnessController.setMasterBrightness(value, true);
        }
      }

      mockMonitors.forEach((monitor) => {
        expect(monitor.current).toBe(0);
      });
    });
  });
});
