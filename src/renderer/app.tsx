/**
 * Main React Application Component
 */

import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { Monitor, AppSettings } from "../shared/types";
import { BrightnessSlider } from "./components/BrightnessSlider";
import { MonitorCard } from "./components/MonitorCard";
import { SyncToggle } from "./components/SyncToggle";

// Extend Window interface for TypeScript
declare global {
  interface Window {
    brightnessAPI: {
      getMonitors: () => Promise<{
        success: boolean;
        data?: Monitor[];
        error?: string;
      }>;
      getBrightness: (
        monitorId: string,
      ) => Promise<{ success: boolean; data?: number; error?: string }>;
      setBrightness: (request: {
        monitorId?: string;
        value: number;
      }) => Promise<{ success: boolean; data?: boolean; error?: string }>;
      toggleSync: () => Promise<{
        success: boolean;
        data?: boolean;
        error?: string;
      }>;
      getSettings: () => Promise<{
        success: boolean;
        data?: AppSettings;
        error?: string;
      }>;
      setSettings: (
        settings: Partial<AppSettings>,
      ) => Promise<{ success: boolean; data?: boolean; error?: string }>;
      onBrightnessChanged: (
        callback: (event: {
          monitorId: string;
          oldValue: number;
          newValue: number;
        }) => void,
      ) => () => void;
    };
  }
}

interface AppState {
  monitors: Monitor[];
  masterBrightness: number;
  syncEnabled: boolean;
  loading: boolean;
  error: string | null;
}

class App extends React.Component<{}, AppState> {
  private refreshInterval: NodeJS.Timeout | null = null;
  private brightnessChangeUnsubscribe: (() => void) | null = null;

  constructor(props: {}) {
    super(props);

    this.state = {
      monitors: [],
      masterBrightness: 50,
      syncEnabled: true,
      loading: true,
      error: null,
    };
  }

  async componentDidMount(): Promise<void> {
    try {
      // Load settings
      await this.loadSettings();

      // Load monitors
      await this.refreshMonitors();

      // Set up periodic refresh
      this.refreshInterval = setInterval(() => {
        this.refreshMonitors();
      }, 2000);

      // Listen for brightness changes
      this.brightnessChangeUnsubscribe =
        window.brightnessAPI.onBrightnessChanged((event) => {
          console.log("Brightness changed:", event);
          this.refreshMonitors();
        });

      this.setState({ loading: false });
    } catch (error) {
      console.error("Failed to initialize app:", error);
      this.setState({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to initialize",
      });
    }
  }

  componentWillUnmount(): void {
    // Clean up interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    // Unsubscribe from brightness changes
    if (this.brightnessChangeUnsubscribe) {
      this.brightnessChangeUnsubscribe();
    }
  }

  /**
   * Load application settings
   */
  private async loadSettings(): Promise<void> {
    const response = await window.brightnessAPI.getSettings();

    if (response.success && response.data) {
      this.setState({
        syncEnabled: response.data.syncEnabled,
        masterBrightness: response.data.masterBrightness,
      });
    }
  }

  /**
   * Refresh monitors from backend
   */
  private async refreshMonitors(): Promise<void> {
    try {
      const response = await window.brightnessAPI.getMonitors();

      if (response.success && response.data) {
        this.setState({ monitors: response.data });

        // Update master brightness to average of all monitors
        if (response.data.length > 0) {
          const avgBrightness =
            response.data.reduce((sum, m) => sum + m.current, 0) /
            response.data.length;
          this.setState({ masterBrightness: Math.round(avgBrightness) });
        }
      } else {
        console.error("Failed to get monitors:", response.error);
      }
    } catch (error) {
      console.error("Failed to refresh monitors:", error);
    }
  }

  /**
   * Handle master brightness change
   */
  private handleMasterBrightnessChange = async (
    value: number,
  ): Promise<void> => {
    this.setState({ masterBrightness: value });

    try {
      const response = await window.brightnessAPI.setBrightness({
        value,
      });

      if (!response.success) {
        console.error("Failed to set master brightness:", response.error);
      }

      // Refresh monitors after a short delay
      setTimeout(() => this.refreshMonitors(), 100);
    } catch (error) {
      console.error("Failed to set master brightness:", error);
    }
  };

  /**
   * Handle monitor-specific brightness change
   */
  private handleMonitorBrightnessChange = async (
    monitorId: string,
    value: number,
  ): Promise<void> => {
    try {
      const response = await window.brightnessAPI.setBrightness({
        monitorId,
        value,
      });

      if (!response.success) {
        console.error("Failed to set monitor brightness:", response.error);
      }

      // Refresh monitors after a short delay
      setTimeout(() => this.refreshMonitors(), 100);
    } catch (error) {
      console.error("Failed to set monitor brightness:", error);
    }
  };

  /**
   * Handle sync toggle
   */
  private handleSyncToggle = async (): Promise<void> => {
    try {
      const response = await window.brightnessAPI.toggleSync();

      if (response.success && response.data !== undefined) {
        this.setState({ syncEnabled: response.data });
      } else {
        console.error("Failed to toggle sync:", response.error);
      }
    } catch (error) {
      console.error("Failed to toggle sync:", error);
    }
  };

  render(): React.ReactNode {
    const { monitors, masterBrightness, syncEnabled, loading, error } =
      this.state;

    if (loading) {
      return (
        <div className="app">
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading BrightSync...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="app">
          <div className="error">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={() => this.refreshMonitors()}>Retry</button>
          </div>
        </div>
      );
    }

    return (
      <div className="app">
        <header className="header">
          <h1>BrightSync</h1>
          <p className="subtitle">Cross-Display Brightness Synchronizer</p>
        </header>

        <main className="main">
          <section className="master-control">
            <div className="control-header">
              <h2>Master Brightness</h2>
              <SyncToggle
                enabled={syncEnabled}
                onToggle={this.handleSyncToggle}
              />
            </div>

            <BrightnessSlider
              value={masterBrightness}
              onChange={this.handleMasterBrightnessChange}
              disabled={!syncEnabled}
              size="large"
            />

            <div className="brightness-value">{masterBrightness}%</div>
          </section>

          <section className="monitors-section">
            <h2>Monitors ({monitors.length})</h2>

            {monitors.length === 0 ? (
              <div className="no-monitors">
                <p>No monitors detected</p>
                <button onClick={() => this.refreshMonitors()}>Refresh</button>
              </div>
            ) : (
              <div className="monitors-grid">
                {monitors.map((monitor) => (
                  <MonitorCard
                    key={monitor.id}
                    monitor={monitor}
                    onBrightnessChange={this.handleMonitorBrightnessChange}
                    disabled={syncEnabled}
                  />
                ))}
              </div>
            )}
          </section>
        </main>

        <footer className="footer">
          <p>Use Ctrl+Alt+Up/Down for global brightness control</p>
        </footer>
      </div>
    );
  }
}

// Render app
const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(React.createElement(App));
