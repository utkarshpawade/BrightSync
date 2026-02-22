/**
 * Integration Tests - Electron App in Mock Mode
 *
 * End-to-end tests running the full Electron application with simulated hardware
 */

import { spawn, ChildProcess } from "child_process";
import * as path from "path";

describe("Integration Tests (Mock Mode)", () => {
  let electronProcess: ChildProcess | null = null;
  const electronPath = require("electron") as any;
  const appPath = path.join(__dirname, "../../dist/main/main.js");

  const timeout = 30000; // 30 seconds for integration tests

  beforeAll(() => {
    jest.setTimeout(timeout);
  });

  afterEach(() => {
    if (electronProcess && !electronProcess.killed) {
      electronProcess.kill();
      electronProcess = null;
    }
  });

  describe("Application Bootstrap", () => {
    it(
      "should start application with --mock flag",
      (done) => {
        let output = "";

        electronProcess = spawn(electronPath, [appPath, "--mock"], {
          env: { ...process.env, NODE_ENV: "test" },
        });

        electronProcess.stdout?.on("data", (data) => {
          output += data.toString();

          // Wait for mock mode initialization message
          if (
            output.includes("[MOCK MODE]") &&
            output.includes("initialized")
          ) {
            electronProcess?.kill();
            done();
          }
        });

        electronProcess.stderr?.on("data", (data) => {
          console.error("Electron stderr:", data.toString());
        });

        electronProcess.on("error", (error) => {
          done(error);
        });

        // Timeout safety
        setTimeout(() => {
          if (electronProcess && !electronProcess.killed) {
            electronProcess.kill();
            done(new Error("Application bootstrap timeout"));
          }
        }, timeout - 1000);
      },
      timeout,
    );

    it(
      "should detect mock mode from command line",
      (done) => {
        let output = "";

        electronProcess = spawn(electronPath, [appPath, "--mock"], {
          env: { ...process.env, NODE_ENV: "test" },
        });

        electronProcess.stdout?.on("data", (data) => {
          output += data.toString();

          if (output.includes("MOCK MODE ENABLED")) {
            electronProcess?.kill();
            done();
          }
        });

        electronProcess.on("error", (error) => {
          done(error);
        });

        setTimeout(() => {
          if (electronProcess && !electronProcess.killed) {
            electronProcess.kill();
            done(new Error("Mock mode detection timeout"));
          }
        }, timeout - 1000);
      },
      timeout,
    );

    it(
      "should create 3 mock monitors",
      (done) => {
        let output = "";
        let monitorCount = 0;

        electronProcess = spawn(electronPath, [appPath, "--mock"], {
          env: { ...process.env, NODE_ENV: "test" },
        });

        electronProcess.stdout?.on("data", (data) => {
          output += data.toString();

          // Count monitor initialization messages
          const matches = output.match(/Monitor.*initialized/g);
          if (matches) {
            monitorCount = matches.length;
          }

          if (output.includes("Created 3 mock monitors")) {
            expect(monitorCount).toBe(3);
            electronProcess?.kill();
            done();
          }
        });

        electronProcess.on("error", (error) => {
          done(error);
        });

        setTimeout(() => {
          if (electronProcess && !electronProcess.killed) {
            electronProcess.kill();
            done(new Error("Monitor creation timeout"));
          }
        }, timeout - 1000);
      },
      timeout,
    );
  });

  describe("Error Handling", () => {
    it(
      "should not crash on startup",
      (done) => {
        let didCrash = false;

        electronProcess = spawn(electronPath, [appPath, "--mock"], {
          env: { ...process.env, NODE_ENV: "test" },
        });

        electronProcess.on("exit", (code) => {
          if (code !== 0 && code !== null) {
            didCrash = true;
          }
        });

        electronProcess.on("error", () => {
          didCrash = true;
        });

        setTimeout(() => {
          if (electronProcess) {
            electronProcess.kill();
          }

          expect(didCrash).toBe(false);
          done();
        }, 5000);
      },
      timeout,
    );

    it(
      "should handle unhandled promise rejections",
      (done) => {
        let hasUnhandledRejection = false;

        electronProcess = spawn(electronPath, [appPath, "--mock"], {
          env: { ...process.env, NODE_ENV: "test" },
        });

        electronProcess.stderr?.on("data", (data) => {
          const output = data.toString();
          if (output.includes("UnhandledPromiseRejectionWarning")) {
            hasUnhandledRejection = true;
          }
        });

        setTimeout(() => {
          if (electronProcess) {
            electronProcess.kill();
          }

          expect(hasUnhandledRejection).toBe(false);
          done();
        }, 5000);
      },
      timeout,
    );

    it(
      "should close cleanly",
      (done) => {
        electronProcess = spawn(electronPath, [appPath, "--mock"], {
          env: { ...process.env, NODE_ENV: "test" },
        });

        setTimeout(() => {
          if (electronProcess) {
            electronProcess.kill("SIGTERM");

            electronProcess.on("exit", (code, signal) => {
              expect(["SIGTERM", null]).toContain(signal);
              done();
            });
          }
        }, 3000);
      },
      timeout,
    );
  });

  describe("Console Logging Validation", () => {
    it(
      "should include [MOCK MODE] prefix in logs",
      (done) => {
        let output = "";

        electronProcess = spawn(electronPath, [appPath, "--mock"], {
          env: { ...process.env, NODE_ENV: "test" },
        });

        electronProcess.stdout?.on("data", (data) => {
          output += data.toString();
        });

        setTimeout(() => {
          if (electronProcess) {
            electronProcess.kill();
          }

          expect(output).toContain("[MOCK MODE]");
          done();
        }, 5000);
      },
      timeout,
    );

    it(
      "should log monitor enumeration",
      (done) => {
        let output = "";

        electronProcess = spawn(electronPath, [appPath, "--mock"], {
          env: { ...process.env, NODE_ENV: "test" },
        });

        electronProcess.stdout?.on("data", (data) => {
          output += data.toString();
        });

        setTimeout(() => {
          if (electronProcess) {
            electronProcess.kill();
          }

          expect(output).toMatch(
            /Creating simulated monitors|monitor.*initialized/i,
          );
          done();
        }, 5000);
      },
      timeout,
    );

    it(
      "should log hardware abstraction layer initialization",
      (done) => {
        let output = "";

        electronProcess = spawn(electronPath, [appPath, "--mock"], {
          env: { ...process.env, NODE_ENV: "test" },
        });

        electronProcess.stdout?.on("data", (data) => {
          output += data.toString();
        });

        setTimeout(() => {
          if (electronProcess) {
            electronProcess.kill();
          }

          expect(output).toMatch(/Hardware abstraction layer initialized/i);
          done();
        }, 5000);
      },
      timeout,
    );
  });

  describe("Real vs Mock Mode", () => {
    it(
      "should start in real mode without --mock flag",
      (done) => {
        let output = "";

        electronProcess = spawn(electronPath, [appPath], {
          env: { ...process.env, NODE_ENV: "test" },
        });

        electronProcess.stdout?.on("data", (data) => {
          output += data.toString();
        });

        setTimeout(() => {
          if (electronProcess) {
            electronProcess.kill();
          }

          expect(output).not.toContain("MOCK MODE ENABLED");
          expect(output).toContain("Running in REAL mode");
          done();
        }, 5000);
      },
      timeout,
    );

    it(
      "should use real hardware detection in real mode",
      (done) => {
        let output = "";

        electronProcess = spawn(electronPath, [appPath], {
          env: { ...process.env, NODE_ENV: "test" },
        });

        electronProcess.stdout?.on("data", (data) => {
          output += data.toString();
        });

        setTimeout(() => {
          if (electronProcess) {
            electronProcess.kill();
          }

          expect(output).toContain("real monitors");
          done();
        }, 5000);
      },
      timeout,
    );
  });
});
