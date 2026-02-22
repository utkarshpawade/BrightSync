/**
 * BrightSync - Mock Monitor Implementation
 *
 * Provides simulated monitor implementation for testing without hardware
 */

#include "mock_monitor.h"
#include <iostream>
#include <sstream>
#include <algorithm>

// ============================================================================
// Constructor / Destructor
// ============================================================================

MockMonitor::MockMonitor(
    const std::string &id,
    const std::string &name,
    const std::string &type,
    int initialBrightness)
    : m_id(id),
      m_name(name),
      m_type(type),
      m_minBrightness(0),
      m_maxBrightness(100),
      m_currentBrightness(initialBrightness)
{
    // Clamp initial brightness to valid range
    m_currentBrightness = std::max(m_minBrightness, std::min(m_maxBrightness, m_currentBrightness));

    std::ostringstream oss;
    oss << "Monitor '" << m_name << "' (ID: " << m_id << ", Type: " << m_type << ") initialized with brightness " << m_currentBrightness;
    Log(oss.str());
}

MockMonitor::~MockMonitor()
{
    std::ostringstream oss;
    oss << "Monitor '" << m_name << "' (ID: " << m_id << ") destroyed";
    Log(oss.str());
}

// ============================================================================
// IMonitor Interface Implementation
// ============================================================================

std::string MockMonitor::GetId() const
{
    return m_id;
}

std::string MockMonitor::GetName() const
{
    return m_name;
}

std::string MockMonitor::GetType() const
{
    return m_type;
}

int MockMonitor::GetMinBrightness() const
{
    return m_minBrightness;
}

int MockMonitor::GetMaxBrightness() const
{
    return m_maxBrightness;
}

int MockMonitor::GetBrightness() const
{
    std::ostringstream oss;
    oss << "Monitor '" << m_name << "' brightness read: " << m_currentBrightness;
    Log(oss.str());

    return m_currentBrightness;
}

bool MockMonitor::SetBrightness(int value)
{
    // Clamp value to valid range
    int clampedValue = std::max(m_minBrightness, std::min(m_maxBrightness, value));

    // Check if value was clamped
    if (clampedValue != value)
    {
        std::ostringstream oss;
        oss << "Monitor '" << m_name << "' brightness value " << value << " clamped to " << clampedValue;
        Log(oss.str());
    }

    m_currentBrightness = clampedValue;

    std::ostringstream oss;
    oss << "Monitor '" << m_name << "' brightness set to " << m_currentBrightness;
    Log(oss.str());

    return true;
}

bool MockMonitor::IsControllable() const
{
    // Mock monitors are always controllable
    return true;
}

// ============================================================================
// Private Methods
// ============================================================================

void MockMonitor::Log(const std::string &message) const
{
    std::cout << "[MOCK MODE] " << message << std::endl;
}
