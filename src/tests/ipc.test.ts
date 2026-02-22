/**
 * IPC Communication Tests
 *
 * Tests for Inter-Process Communication between renderer and main process
 */

import { ipcMain } from "electron";
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

import { IPCHandler } from "../main/ipc";
import { MonitorManager } from "../main/monitor.manager";
import { BrightnessController } from "../main/brightness.controller";

describe("IPC Communication Tests", () => {
  let ipcHandler: IPCHandler;
  let monitorManager: MonitorManager;
  let brightnessController: BrightnessController;
  let mockMonitors: Monitor[];
  let mockHandlers: Map<string, Function>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Track IPC handlers
    mockHandlers = new Map();
    (ipcMain.handle as jest.Mock).mockImplementation(
      (channel: string, handler: Function) => {
        mockHandlers.set(channel, handler);
      },
    );

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
    ipcHandler = new IPCHandler(monitorManager, brightnessController);
  });

  describe("monitors:get Channel", () => {
    it("should register handler for monitors:get", () => {
      expect(ipcMain.handle).toHaveBeenCalledWith(
        "monitors:get",
        expect.any(Function),
      );
    });

    it("should return valid monitor structure", async () => {
      const handler = mockHandlers.get("monitors:get");
      expect(handler).toBeDefined();

      const result = await handler!({}, {});

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it("should return monitors with all required fields", async () => {
      const handler = mockHandlers.get("monitors:get");
      const monitors = await handler!({}, {});

      monitors.forEach((monitor: Monitor) => {
        expect(monitor).toHaveProperty("id");
        expect(monitor).toHaveProperty("name");
        expect(monitor).toHaveProperty("type");
        expect(monitor).toHaveProperty("min");
        expect(monitor).toHaveProperty("max");
        expect(monitor).toHaveProperty("current");

        expect(typeof monitor.id).toBe("string");
        expect(typeof monitor.name).toBe("string");
        expect(typeof monitor.type).toBe("string");
        expect(typeof monitor.min).toBe("number");
        expect(typeof monitor.max).toBe("number");
        expect(typeof monitor.current).toBe("number");
      });
    });

    it("should return monitors with valid types", async () => {
      const handler = mockHandlers.get("monitors:get");
      const monitors = await handler!({}, {});

      monitors.forEach((monitor: Monitor) => {
        expect(["internal", "external"]).toContain(monitor.type);
      });
    });

    it("should return monitors with valid brightness ranges", async () => {
      const handler = mockHandlers.get("monitors:get");
      const monitors = await handler!({}, {});

      monitors.forEach((monitor: Monitor) => {
        expect(monitor.min).toBeGreaterThanOrEqual(0);
        expect(monitor.max).toBeGreaterThan(monitor.min);
        expect(monitor.current).toBeGreaterThanOrEqual(monitor.min);
        expect(monitor.current).toBeLessThanOrEqual(monitor.max);
      });
    });
  });

  describe("brightness:get Channel", () => {
    it("should register handler for brightness:get", () => {
      expect(ipcMain.handle).toHaveBeenCalledWith(
        "brightness:get",
        expect.any(Function),
      );
    });

    it("should return correct brightness for valid monitor", async () => {
      const handler = mockHandlers.get("brightness:get");
      expect(handler).toBeDefined();

      const result = await handler!({}, { monitorId: "mock_internal_0" });

      expect(result).toBe(50);
    });

    it("should return -1 for invalid monitor ID", async () => {
      const handler = mockHandlers.get("brightness:get");

      const result = await handler!({}, { monitorId: "invalid_id" });

      expect(result).toBe(-1);
    });

    it("should handle missing monitorId parameter", async () => {
      const handler = mockHandlers.get("brightness:get");

      await expect(handler!({}, {})).rejects.toThrow();
    });

    it("should handle null monitorId", async () => {
      const handler = mockHandlers.get("brightness:get");

      await expect(handler!({}, { monitorId: null })).rejects.toThrow();
    });

    it("should return current brightness after updates", async () => {
      const setBrightnessHandler = mockHandlers.get("brightness:set");
      await setBrightnessHandler!(
        {},
        { monitorId: "mock_internal_0", brightness: 75 },
      );

      const getBrightnessHandler = mockHandlers.get("brightness:get");
      const result = await getBrightnessHandler!(
        {},
        { monitorId: "mock_internal_0" },
      );

      expect(result).toBe(75);
    });
  });

  describe("brightness:set Channel", () => {
    it("should register handler for brightness:set", () => {
      expect(ipcMain.handle).toHaveBeenCalledWith(
        "brightness:set",
        expect.any(Function),
      );
    });

    it("should update brightness for valid monitor", async () => {
      const handler = mockHandlers.get("brightness:set");

      const result = await handler!(
        {},
        {
          monitorId: "mock_internal_0",
          brightness: 75,
        },
      );

      expect(result).toBe(true);
      expect(mockMonitors[0].current).toBe(75);
    });

    it("should return false for invalid monitor ID", async () => {
      const handler = mockHandlers.get("brightness:set");

      const result = await handler!(
        {},
        {
          monitorId: "invalid_id",
          brightness: 75,
        },
      );

      expect(result).toBe(false);
    });

    it("should clamp brightness to valid range", async () => {
      const handler = mockHandlers.get("brightness:set");

      await handler!({}, { monitorId: "mock_internal_0", brightness: 150 });
      expect(mockMonitors[0].current).toBe(100);

      await handler!({}, { monitorId: "mock_internal_0", brightness: -10 });
      expect(mockMonitors[0].current).toBe(0);
    });

    it("should handle missing parameters", async () => {
      const handler = mockHandlers.get("brightness:set");

      await expect(handler!({}, {})).rejects.toThrow();
      await expect(
        handler!({}, { monitorId: "mock_internal_0" }),
      ).rejects.toThrow();
      await expect(handler!({}, { brightness: 50 })).rejects.toThrow();
    });

    it("should handle non-numeric brightness values", async () => {
      const handler = mockHandlers.get("brightness:set");

      await expect(
        handler!(
          {},
          {
            monitorId: "mock_internal_0",
            brightness: "invalid",
          },
        ),
      ).rejects.toThrow();
    });
  });

  describe("sync:toggle Channel", () => {
    it("should register handler for sync:toggle", () => {
      expect(ipcMain.handle).toHaveBeenCalledWith(
        "sync:toggle",
        expect.any(Function),
      );
    });

    it("should toggle sync state", async () => {
      const handler = mockHandlers.get("sync:toggle");

      const result = await handler!({}, {});

      expect(typeof result).toBe("boolean");
    });

    it("should persist sync state across calls", async () => {
      const handler = mockHandlers.get("sync:toggle");

      const state1 = await handler!({}, {});
      const state2 = await handler!({}, {});

      expect(state2).toBe(!state1);
    });
  });

  describe("settings:get Channel", () => {
    it("should register handler for settings:get", () => {
      expect(ipcMain.handle).toHaveBeenCalledWith(
        "settings:get",
        expect.any(Function),
      );
    });

    it("should return settings object", async () => {
      const handler = mockHandlers.get("settings:get");

      const result = await handler!({}, {});

      expect(typeof result).toBe("object");
      expect(result).toHaveProperty("syncEnabled");
      expect(result).toHaveProperty("lastBrightness");
    });

    it("should return valid setting types", async () => {
      const handler = mockHandlers.get("settings:get");

      const settings = await handler!({}, {});

      expect(typeof settings.syncEnabled).toBe("boolean");
      expect(typeof settings.lastBrightness).toBe("number");
    });
  });

  describe("settings:set Channel", () => {
    it("should register handler for settings:set", () => {
      expect(ipcMain.handle).toHaveBeenCalledWith(
        "settings:set",
        expect.any(Function),
      );
    });

    it("should save settings", async () => {
      const handler = mockHandlers.get("settings:set");

      const result = await handler!(
        {},
        {
          syncEnabled: false,
          lastBrightness: 75,
        },
      );

      expect(result).toBe(true);
    });

    it("should persist saved settings", async () => {
      const setHandler = mockHandlers.get("settings:set");
      await setHandler!(
        {},
        {
          syncEnabled: false,
          lastBrightness: 80,
        },
      );

      const getHandler = mockHandlers.get("settings:get");
      const settings = await getHandler!({}, {});

      expect(settings.syncEnabled).toBe(false);
      expect(settings.lastBrightness).toBe(80);
    });

    it("should handle partial settings update", async () => {
      const handler = mockHandlers.get("settings:set");

      const result = await handler!({}, { syncEnabled: false });

      expect(result).toBe(true);
    });

    it("should validate setting types", async () => {
      const handler = mockHandlers.get("settings:set");

      await expect(
        handler!(
          {},
          {
            syncEnabled: "invalid",
          },
        ),
      ).rejects.toThrow();

      await expect(
        handler!(
          {},
          {
            lastBrightness: "invalid",
          },
        ),
      ).rejects.toThrow();
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid channel gracefully", () => {
      // Invalid channels should not be registered
      expect(mockHandlers.has("invalid:channel")).toBe(false);
    });

    it("should handle malformed payload", async () => {
      const handler = mockHandlers.get("brightness:set");

      await expect(handler!({}, null)).rejects.toThrow();
      await expect(handler!({}, undefined)).rejects.toThrow();
      await expect(handler!({}, "invalid")).rejects.toThrow();
    });

    it("should handle concurrent requests", async () => {
      const handler = mockHandlers.get("brightness:set");

      const requests = Array(10)
        .fill(null)
        .map((_, i) =>
          handler!(
            {},
            {
              monitorId: "mock_internal_0",
              brightness: i * 10,
            },
          ),
        );

      await expect(Promise.all(requests)).resolves.toBeDefined();
    });

    it("should handle rapid channel calls", async () => {
      const getHandler = mockHandlers.get("monitors:get");

      const calls = Array(100)
        .fill(null)
        .map(() => getHandler!({}, {}));

      await expect(Promise.all(calls)).resolves.toBeDefined();
    });
  });

  describe("Data Validation", () => {
    it("should reject brightness values outside valid range", async () => {
      const handler = mockHandlers.get("brightness:set");

      // Should clamp, not reject
      await handler!({}, { monitorId: "mock_internal_0", brightness: -999 });
      expect(mockMonitors[0].current).toBe(0);

      await handler!({}, { monitorId: "mock_internal_0", brightness: 999 });
      expect(mockMonitors[0].current).toBe(100);
    });

    it("should reject empty monitor ID", async () => {
      const handler = mockHandlers.get("brightness:get");

      await expect(handler!({}, { monitorId: "" })).rejects.toThrow();
    });

    it("should handle special characters in monitor ID", async () => {
      const handler = mockHandlers.get("brightness:get");

      const result = await handler!({}, { monitorId: "monitor_@#$%" });

      expect(result).toBe(-1); // Not found, but doesn't crash
    });

    it("should validate setting values", async () => {
      const handler = mockHandlers.get("settings:set");

      await expect(
        handler!(
          {},
          {
            lastBrightness: -10,
          },
        ),
      ).rejects.toThrow();

      await expect(
        handler!(
          {},
          {
            lastBrightness: 150,
          },
        ),
      ).rejects.toThrow();
    });
  });

  describe("State Consistency", () => {
    it("should maintain consistent state across multiple operations", async () => {
      const setBrightnessHandler = mockHandlers.get("brightness:set");
      const getBrightnessHandler = mockHandlers.get("brightness:get");

      await setBrightnessHandler!(
        {},
        { monitorId: "mock_internal_0", brightness: 30 },
      );
      let result = await getBrightnessHandler!(
        {},
        { monitorId: "mock_internal_0" },
      );
      expect(result).toBe(30);

      await setBrightnessHandler!(
        {},
        { monitorId: "mock_internal_0", brightness: 60 },
      );
      result = await getBrightnessHandler!(
        {},
        { monitorId: "mock_internal_0" },
      );
      expect(result).toBe(60);

      await setBrightnessHandler!(
        {},
        { monitorId: "mock_internal_0", brightness: 90 },
      );
      result = await getBrightnessHandler!(
        {},
        { monitorId: "mock_internal_0" },
      );
      expect(result).toBe(90);
    });

    it("should handle interleaved requests correctly", async () => {
      const setHandler = mockHandlers.get("brightness:set");
      const getHandler = mockHandlers.get("brightness:get");

      const operations = [
        setHandler!({}, { monitorId: "mock_internal_0", brightness: 25 }),
        getHandler!({}, { monitorId: "mock_internal_0" }),
        setHandler!({}, { monitorId: "mock_external_0", brightness: 50 }),
        getHandler!({}, { monitorId: "mock_external_0" }),
        setHandler!({}, { monitorId: "mock_internal_0", brightness: 75 }),
        getHandler!({}, { monitorId: "mock_internal_0" }),
      ];

      await expect(Promise.all(operations)).resolves.toBeDefined();
    });
  });

  describe("Performance", () => {
    it("should handle burst of get requests", async () => {
      const handler = mockHandlers.get("monitors:get");

      const start = Date.now();
      const requests = Array(1000)
        .fill(null)
        .map(() => handler!({}, {}));
      await Promise.all(requests);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    it("should handle mixed operation burst", async () => {
      const getMonitorsHandler = mockHandlers.get("monitors:get");
      const getBrightnessHandler = mockHandlers.get("brightness:get");
      const setBrightnessHandler = mockHandlers.get("brightness:set");

      const operations = [];
      for (let i = 0; i < 100; i++) {
        operations.push(getMonitorsHandler!({}, {}));
        operations.push(
          getBrightnessHandler!({}, { monitorId: "mock_internal_0" }),
        );
        operations.push(
          setBrightnessHandler!(
            {},
            {
              monitorId: "mock_internal_0",
              brightness: i % 101,
            },
          ),
        );
      }

      await expect(Promise.all(operations)).resolves.toBeDefined();
    });
  });
});
