/**
 * Monitor Card Component - Displays individual monitor info and controls
 */

import * as React from "react";
import { Monitor } from "../../shared/types";
import { BrightnessSlider } from "./BrightnessSlider";

interface MonitorCardProps {
  monitor: Monitor;
  onBrightnessChange: (monitorId: string, value: number) => void;
  disabled?: boolean;
}

export class MonitorCard extends React.Component<MonitorCardProps> {
  private handleBrightnessChange = (value: number): void => {
    this.props.onBrightnessChange(this.props.monitor.id, value);
  };

  render(): React.ReactNode {
    const { monitor, disabled = false } = this.props;
    const isInternal = monitor.type === "internal";

    return (
      <div className={`monitor-card ${isInternal ? "internal" : "external"}`}>
        <div className="monitor-header">
          <div className="monitor-icon">{isInternal ? "💻" : "🖥️"}</div>
          <div className="monitor-info">
            <h3 className="monitor-name">{monitor.name}</h3>
            <span className="monitor-type">
              {isInternal ? "Internal Display" : "External Display"}
            </span>
          </div>
        </div>

        <div className="monitor-brightness">
          <div className="brightness-label">
            <span>Brightness</span>
            <span className="brightness-value">{monitor.current}%</span>
          </div>

          <BrightnessSlider
            value={monitor.current}
            onChange={this.handleBrightnessChange}
            disabled={disabled}
            min={monitor.min}
            max={monitor.max}
          />

          <div className="brightness-range">
            <span>{monitor.min}%</span>
            <span>{monitor.max}%</span>
          </div>
        </div>
      </div>
    );
  }
}
