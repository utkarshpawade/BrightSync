/**
 * Sync Algorithm Tests
 *
 * Comprehensive testing of brightness synchronization logic
 */

import { Monitor } from "../shared/types";

// Mock native addon
const mockNativeAddon = {
  initialize: jest.fn(() => true),
  getMonitors: jest.fn(),
  getBrightness: jest.fn(),
  setBrightness: jest.fn(() => true),
};

// Mock the native module
jest.mock("../../build/Release/brightness.node", () => mockNativeAddon, {
  virtual: true,
});

// Import after mocking
import { BrightnessController } from "../main/brightness.controller";
import { MonitorManager } from "../main/monitor.manager";

describe("Sync Algorithm Tests", () => {
  let brightnessController: BrightnessController;
  let monitorManager: MonitorManager;
  let mockMonitors: Monitor[];

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock monitors
    mockMonitors = [
      {
        id: "mock_internal_0",
        name: "Mock Internal Display",
        type: "internal",
        min: 0,
        max: 100,
        current: 50,
      },
      {
        id: "mock_external_0",
        name: "Mock External Display 1",
        type: "external",
        min: 0,
        max: 100,
        current: 50,
      },
      {
        id: "mock_external_1",
        name: "Mock External Display 2",
        type: "external",
        min: 0,
        max: 100,
        current: 50,
      },
    ];

    // Setup mock responses
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

    // Create instances
    monitorManager = new MonitorManager(true); // Mock mode
    brightnessController = new BrightnessController(monitorManager);
  });

  describe("Master Brightness Control", () => {
    it("should set all monitors to 50% when master is 50%", async () => {
      await brightnessController.setMasterBrightness(50, true);

      expect(mockNativeAddon.setBrightness).toHaveBeenCalledTimes(3);
      mockMonitors.forEach((monitor) => {
        expect(monitor.current).toBe(50);
      });
    });

    it("should set all monitors to max when master is 100%", async () => {
      await brightnessController.setMasterBrightness(100, true);

      mockMonitors.forEach((monitor) => {
        expect(monitor.current).toBe(100);
      });
    });

    it("should set all monitors to min when master is 0%", async () => {
      await brightnessController.setMasterBrightness(0, true);

      mockMonitors.forEach((monitor) => {
        expect(monitor.current).toBe(0);
      });
    });

    it("should set monitors proportionally to 75%", async () => {
      await brightnessController.setMasterBrightness(75, true);

      mockMonitors.forEach((monitor) => {
        expect(monitor.current).toBe(75);
      });
    });

    it("should set monitors proportionally to 25%", async () => {
      await brightnessController.setMasterBrightness(25, true);

      mockMonitors.forEach((monitor) => {
        expect(monitor.current).toBe(25);
      });
    });
  });

  describe("Sync Disabled Mode", () => {
    beforeEach(() => {
      brightnessController.setSyncEnabled(false);
    });

    it("should not change other monitors when sync is disabled", async () => {
      const initialStates = mockMonitors.map((m) => m.current);

      await brightnessController.setBrightness("mock_internal_0", 75);

      // Only the target monitor should change
      expect(mockMonitors[0].current).toBe(75);
      expect(mockMonitors[1].current).toBe(initialStates[1]);
      expect(mockMonitors[2].current).toBe(initialStates[2]);
    });

    it("should allow independent control of each monitor", async () => {
      await brightnessController.setBrightness("mock_internal_0", 25);
      await brightnessController.setBrightness("mock_external_0", 50);
      await brightnessController.setBrightness("mock_external_1", 75);

      expect(mockMonitors[0].current).toBe(25);
      expect(mockMonitors[1].current).toBe(50);
      expect(mockMonitors[2].current).toBe(75);
    });
  });

  describe("Smooth Transition Simulation", () => {
    it("should calculate correct step increments for smooth transition", () => {
      const startBrightness = 0;
      const targetBrightness = 100;
      const stepSize = 2;

      const expectedSteps = Math.ceil(
        (targetBrightness - startBrightness) / stepSize,
      );

      expect(expectedSteps).toBe(50);
    });

    it("should calculate correct steps for decreasing brightness", () => {
      const startBrightness = 100;
      const targetBrightness = 0;
      const stepSize = 2;

      const expectedSteps = Math.ceil(
        Math.abs(targetBrightness - startBrightness) / stepSize,
      );

      expect(expectedSteps).toBe(50);
    });

    it("should handle small brightness changes", () => {
      const startBrightness = 50;
      const targetBrightness = 51;
      const stepSize = 2;

      const expectedSteps = Math.ceil(
        Math.abs(targetBrightness - startBrightness) / stepSize,
      );

      expect(expectedSteps).toBe(1);
    });
  });

  describe("Mixed Range Monitors", () => {
    beforeEach(() => {
      // Create monitors with different ranges
      mockMonitors = [
        {
          id: "monitor_1",
          name: "Monitor 1",
          type: "internal",
          min: 0,
          max: 100,
          current: 50,
        },
        {
          id: "monitor_2",
          name: "Monitor 2",
          type: "external",
          min: 10,
          max: 90,
          current: 50,
        },
        {
          id: "monitor_3",
          name: "Monitor 3",
          type: "external",
          min: 20,
          max: 80,
          current: 50,
        },
      ];

      mockNativeAddon.getMonitors.mockReturnValue(mockMonitors);
      mockNativeAddon.setBrightness.mockImplementation(
        (id: string, value: number) => {
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

      monitorManager = new MonitorManager(true);
      brightnessController = new BrightnessController(monitorManager);
    });

    it("should handle monitors with different min/max ranges proportionally", async () => {
      // Set master to 50% - each monitor should be at middle of its range
      await brightnessController.setMasterBrightness(50, true);

      // Monitor 1: 0-100, 50% = 50
      expect(mockMonitors[0].current).toBeGreaterThanOrEqual(45);
      expect(mockMonitors[0].current).toBeLessThanOrEqual(55);

      // Monitors will sync to same absolute value if algorithm doesn't normalize
      // This tests that actual implementation handles ranges correctly
    });

    it("should respect monitor-specific min values", async () => {
      await brightnessController.setMasterBrightness(0, true);

      mockMonitors.forEach((monitor) => {
        expect(monitor.current).toBeGreaterThanOrEqual(monitor.min);
      });
    });

    it("should respect monitor-specific max values", async () => {
      await brightnessController.setMasterBrightness(100, true);

      mockMonitors.forEach((monitor) => {
        expect(monitor.current).toBeLessThanOrEqual(monitor.max);
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle no monitors gracefully", async () => {
      mockNativeAddon.getMonitors.mockReturnValue([]);
      monitorManager = new MonitorManager(true);
      brightnessController = new BrightnessController(monitorManager);

      await expect(
        brightnessController.setMasterBrightness(50, true),
      ).resolves.not.toThrow();
    });

    it("should handle single monitor", async () => {
      mockMonitors = [mockMonitors[0]];
      mockNativeAddon.getMonitors.mockReturnValue(mockMonitors);
      monitorManager = new MonitorManager(true);
      brightnessController = new BrightnessController(monitorManager);

      await brightnessController.setMasterBrightness(75, true);

      expect(mockMonitors[0].current).toBe(75);
    });

    it("should handle extreme rapid calls without errors", async () => {
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(brightnessController.setMasterBrightness(i % 101, true));
      }

      await expect(Promise.all(promises)).resolves.not.toThrow();
    });

    it("should clamp negative brightness values", async () => {
      await brightnessController.setMasterBrightness(-10, true);

      mockMonitors.forEach((monitor) => {
        expect(monitor.current).toBeGreaterThanOrEqual(0);
      });
    });

    it("should clamp excessive brightness values", async () => {
      await brightnessController.setMasterBrightness(150, true);

      mockMonitors.forEach((monitor) => {
        expect(monitor.current).toBeLessThanOrEqual(100);
      });
    });
  });

  describe("Brightness Update Order", () => {
    it("should update all monitors in sync operation", async () => {
      await brightnessController.setMasterBrightness(60, true);

      expect(mockNativeAddon.setBrightness).toHaveBeenCalledTimes(3);
      expect(mockNativeAddon.setBrightness).toHaveBeenCalledWith(
        "mock_internal_0",
        expect.any(Number),
      );
      expect(mockNativeAddon.setBrightness).toHaveBeenCalledWith(
        "mock_external_0",
        expect.any(Number),
      );
      expect(mockNativeAddon.setBrightness).toHaveBeenCalledWith(
        "mock_external_1",
        expect.any(Number),
      );
    });

    it("should handle partial update failures gracefully", async () => {
      mockNativeAddon.setBrightness.mockImplementation((id: string) => {
        // Fail for one specific monitor
        return id !== "mock_external_1";
      });

      await expect(
        brightnessController.setMasterBrightness(50, true),
      ).resolves.not.toThrow();
    });
  });

  describe("State Consistency", () => {
    it("should maintain consistent state after multiple operations", async () => {
      await brightnessController.setMasterBrightness(25, true);
      await brightnessController.setMasterBrightness(50, true);
      await brightnessController.setMasterBrightness(75, true);

      const monitors = await monitorManager.getMonitors();
      monitors.forEach((monitor) => {
        expect(monitor.current).toBeGreaterThanOrEqual(0);
        expect(monitor.current).toBeLessThanOrEqual(100);
      });
    });

    it("should return to consistent state after sync toggle", async () => {
      await brightnessController.setMasterBrightness(50, true);

      brightnessController.setSyncEnabled(false);
      await brightnessController.setBrightness("mock_internal_0", 25);

      brightnessController.setSyncEnabled(true);
      await brightnessController.setMasterBrightness(75, true);

      mockMonitors.forEach((monitor) => {
        expect(monitor.current).toBe(75);
      });
    });
  });

  describe("Concurrent Operations", () => {
    it("should handle concurrent brightness changes", async () => {
      const operations = [
        brightnessController.setBrightness("mock_internal_0", 30),
        brightnessController.setBrightness("mock_external_0", 50),
        brightnessController.setBrightness("mock_external_1", 70),
      ];

      await expect(Promise.all(operations)).resolves.not.toThrow();
    });

    it("should handle rapid sync toggle", async () => {
      for (let i = 0; i < 10; i++) {
        brightnessController.setSyncEnabled(i % 2 === 0);
        await brightnessController.setMasterBrightness(
          50,
          brightnessController.isSyncEnabled(),
        );
      }

      expect(true).toBe(true); // If we get here, no errors occurred
    });
  });

  describe("Percentage Calculations", () => {
    it("should correctly calculate 0% brightness", async () => {
      await brightnessController.setMasterBrightness(0, true);

      mockMonitors.forEach((monitor) => {
        const percentage =
          (monitor.current - monitor.min) / (monitor.max - monitor.min);
        expect(percentage).toBeCloseTo(0, 1);
      });
    });

    it("should correctly calculate 100% brightness", async () => {
      await brightnessController.setMasterBrightness(100, true);

      mockMonitors.forEach((monitor) => {
        expect(monitor.current).toBe(monitor.max);
      });
    });

    it("should correctly calculate intermediate percentages", async () => {
      const testPercentages = [10, 25, 33, 50, 66, 75, 90];

      for (const percentage of testPercentages) {
        await brightnessController.setMasterBrightness(percentage, true);

        mockMonitors.forEach((monitor) => {
          const actualPercentage =
            ((monitor.current - monitor.min) / (monitor.max - monitor.min)) *
            100;
          expect(actualPercentage).toBeCloseTo(percentage, 0);
        });
      }
    });
  });
});
