/**
 * BrightSync - Real Monitor Implementation
 *
 * Implements actual hardware communication for monitor brightness control
 * Uses Windows WMI for internal displays and DDC/CI for external monitors
 */

#ifndef REAL_MONITOR_H
#define REAL_MONITOR_H

#include "monitor_interface.h"
#include <windows.h>
#include <string>

/**
 * Real monitor implementation using Windows APIs
 *
 * Internal Display: Uses WMI (Windows Management Instrumentation)
 * External Display: Uses DDC/CI (Display Data Channel Command Interface)
 */
class RealMonitor : public IMonitor
{
public:
    /**
     * Constructor for real monitor
     * @param id Unique monitor identifier
     * @param name Human-readable monitor name
     * @param type Monitor type ("internal" or "external")
     * @param hMonitor Windows monitor handle
     * @param supportsWMI Whether monitor supports WMI control
     * @param supportsDDC Whether monitor supports DDC/CI control
     */
    RealMonitor(
        const std::string &id,
        const std::string &name,
        const std::string &type,
        HMONITOR hMonitor,
        bool supportsWMI,
        bool supportsDDC);

    /**
     * Destructor - cleanup resources
     */
    virtual ~RealMonitor();

    // IMonitor interface implementation
    virtual std::string GetId() const override;
    virtual std::string GetName() const override;
    virtual std::string GetType() const override;
    virtual int GetMinBrightness() const override;
    virtual int GetMaxBrightness() const override;
    virtual int GetBrightness() const override;
    virtual bool SetBrightness(int value) override;
    virtual bool IsControllable() const override;

private:
    std::string m_id;
    std::string m_name;
    std::string m_type;
    HMONITOR m_hMonitor;
    bool m_supportsWMI;
    bool m_supportsDDC;
    int m_minBrightness;
    int m_maxBrightness;
    mutable int m_currentBrightness;

    /**
     * Get brightness for internal display using WMI
     * @return Brightness value or -1 on error
     */
    int GetInternalBrightnessWMI() const;

    /**
     * Set brightness for internal display using WMI
     * @param brightness Brightness value
     * @return true on success, false on failure
     */
    bool SetInternalBrightnessWMI(int brightness);

    /**
     * Get brightness for external display using DDC/CI
     * @return Brightness value or -1 on error
     */
    int GetExternalBrightnessDDC() const;

    /**
     * Set brightness for external display using DDC/CI
     * @param brightness Brightness value
     * @return true on success, false on failure
     */
    bool SetExternalBrightnessDDC(int brightness);
};

#endif // REAL_MONITOR_H
