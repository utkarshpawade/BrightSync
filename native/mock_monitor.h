/**
 * BrightSync - Mock Monitor Implementation
 *
 * Provides simulated monitor implementation for testing without hardware
 * No actual Windows API calls - all operations are simulated in memory
 */

#ifndef MOCK_MONITOR_H
#define MOCK_MONITOR_H

#include "monitor_interface.h"
#include <string>
#include <iostream>

/**
 * Mock monitor implementation for testing
 *
 * Simulates monitor behavior without any hardware calls
 * Stores brightness state in memory and logs all operations
 */
class MockMonitor : public IMonitor
{
public:
    /**
     * Constructor for mock monitor
     * @param id Unique monitor identifier
     * @param name Human-readable monitor name
     * @param type Monitor type ("internal" or "external")
     * @param initialBrightness Initial brightness value (default 50)
     */
    MockMonitor(
        const std::string &id,
        const std::string &name,
        const std::string &type,
        int initialBrightness = 50);

    /**
     * Destructor
     */
    virtual ~MockMonitor();

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
    int m_minBrightness;
    int m_maxBrightness;
    int m_currentBrightness;

    /**
     * Log operation to console
     * @param message Log message
     */
    void Log(const std::string &message) const;
};

#endif // MOCK_MONITOR_H
