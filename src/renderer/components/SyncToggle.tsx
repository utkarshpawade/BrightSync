/**
 * Sync Toggle Component
 */

import * as React from "react";

interface SyncToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export class SyncToggle extends React.Component<SyncToggleProps> {
  render(): React.ReactNode {
    const { enabled, onToggle } = this.props;

    return (
      <div className="sync-toggle">
        <label className="toggle-label">
          <span className="toggle-text">Sync {enabled ? "ON" : "OFF"}</span>
          <button
            className={`toggle-button ${enabled ? "active" : ""}`}
            onClick={onToggle}
            aria-label="Toggle brightness sync"
          >
            <span className="toggle-slider"></span>
          </button>
        </label>
      </div>
    );
  }
}
