/**
 * Brightness Slider Component
 */

import * as React from "react";

interface BrightnessSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  size?: "small" | "large";
  min?: number;
  max?: number;
}

export class BrightnessSlider extends React.Component<BrightnessSliderProps> {
  private handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const value = parseInt(event.target.value, 10);
    this.props.onChange(value);
  };

  render(): React.ReactNode {
    const {
      value,
      disabled = false,
      size = "small",
      min = 0,
      max = 100,
    } = this.props;

    const sliderClass = `brightness-slider ${size} ${disabled ? "disabled" : ""}`;

    return (
      <div className={sliderClass}>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={this.handleChange}
          disabled={disabled}
          className="slider"
        />
      </div>
    );
  }
}
