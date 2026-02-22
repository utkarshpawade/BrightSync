/**
 * Jest Test Setup
 *
 * Global configuration and mocks for all tests
 */

// Suppress console logs during tests unless VERBOSE is set
if (!process.env.VERBOSE) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    // Keep error for debugging failed tests
    error: console.error,
  };
}

// Mock Electron modules
jest.mock("electron", () => ({
  app: {
    getPath: jest.fn(() => "/mock/path"),
    whenReady: jest.fn(() => Promise.resolve()),
    on: jest.fn(),
    quit: jest.fn(),
  },
  BrowserWindow: jest.fn(() => ({
    loadFile: jest.fn(),
    webContents: {
      send: jest.fn(),
      openDevTools: jest.fn(),
    },
    on: jest.fn(),
    hide: jest.fn(),
    show: jest.fn(),
  })),
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
    removeHandler: jest.fn(),
  },
  ipcRenderer: {
    invoke: jest.fn(),
    on: jest.fn(),
  },
  globalShortcut: {
    register: jest.fn(() => true),
    unregister: jest.fn(),
    unregisterAll: jest.fn(),
  },
  Tray: jest.fn(() => ({
    setToolTip: jest.fn(),
    setContextMenu: jest.fn(),
    on: jest.fn(),
    destroy: jest.fn(),
  })),
  Menu: {
    buildFromTemplate: jest.fn(),
  },
}));

// Mock electron-store
jest.mock("electron-store", () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn((key, defaultValue) => defaultValue),
    set: jest.fn(),
    has: jest.fn(() => false),
    delete: jest.fn(),
    clear: jest.fn(),
  }));
});
