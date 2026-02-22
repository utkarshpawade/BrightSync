/**
 * BrightSync Native Addon - Header File
 *
 * Provides interfaces for monitor brightness control on Windows
 */

#ifndef BRIGHTNESS_H
#define BRIGHTNESS_H

#include <string>
#include <vector>
#include <windows.h>

/**
 * Monitor information structure
 */
struct MonitorInfo
{
    std::string id;
    std::string name;
    std::string type; // "internal" or "external"
    int min;
    int max;
    int current;
    HMONITOR hMonitor;
    bool supportsWMI;
    bool supportsDDC;
};

/**
 * Get all connected monitors
 */
std::vector<MonitorInfo> GetAllMonitors();

/**
 * Get brightness for internal display using WMI
 */
int GetInternalBrightness();

/**
 * Set brightness for internal display using WMI
 */
bool SetInternalBrightness(int brightness);

/**
 * Get brightness for external display using DDC/CI
 */
int GetExternalBrightness(HMONITOR hMonitor);

/**
 * Set brightness for external display using DDC/CI
 */
bool SetExternalBrightness(HMONITOR hMonitor, int brightness);

/**
 * Find monitor by ID
 */
MonitorInfo *FindMonitorById(const std::string &id, std::vector<MonitorInfo> &monitors);

/**
 * Convert wide string to UTF-8 string
 */
std::string WideToUtf8(const std::wstring &wstr);

/**
 * Convert UTF-8 string to wide string
 */
std::wstring Utf8ToWide(const std::string &str);

#endif // BRIGHTNESS_H
