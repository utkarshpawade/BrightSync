/**
 * BrightSync - Monitor Hardware Abstraction Layer (HAL)
 *
 * Provides abstraction interface for monitor brightness control
 * Supports both real hardware and mock implementations for testing
 */

#ifndef MONITOR_INTERFACE_H
#define MONITOR_INTERFACE_H

#include <string>
#include <memory>

/**
 * Monitor Hardware Abstraction Interface
 *
 * All monitor implementations (real and mock) must implement this interface
 */
class IMonitor
{
public:
    /**
     * Get unique monitor identifier
     */
    virtual std::string GetId() const = 0;

    /**
     * Get human-readable monitor name
     */
    virtual std::string GetName() const = 0;

    /**
     * Get monitor type
     * @return "internal" for laptop displays, "external" for external monitors
     */
    virtual std::string GetType() const = 0;

    /**
     * Get minimum brightness value
     * @return Minimum brightness (typically 0)
     */
    virtual int GetMinBrightness() const = 0;

    /**
     * Get maximum brightness value
     * @return Maximum brightness (typically 100)
     */
    virtual int GetMaxBrightness() const = 0;

    /**
     * Get current brightness value
     * @return Current brightness level, or -1 on error
     */
    virtual int GetBrightness() const = 0;

    /**
     * Set brightness value
     * @param value Brightness level (will be clamped to min/max range)
     * @return true on success, false on failure
     */
    virtual bool SetBrightness(int value) = 0;

    /**
     * Check if monitor supports brightness control
     * @return true if monitor can be controlled, false otherwise
     */
    virtual bool IsControllable() const = 0;

    /**
     * Virtual destructor for proper cleanup
     */
    virtual ~IMonitor() {}
};

#endif // MONITOR_INTERFACE_H
