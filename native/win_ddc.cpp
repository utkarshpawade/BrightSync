/**
 * Windows External Display Brightness Control
 *
 * Uses DDC/CI (Display Data Channel Command Interface) to control external monitor brightness
 */

#include "brightness.h"
#include <windows.h>
#include <physicalmonitorenumerationapi.h>
#include <highlevelmonitorconfigurationapi.h>
#include <lowlevelmonitorconfigurationapi.h>
#include <vector>
#include <string>
#include <sstream>
#include <iomanip>

#pragma comment(lib, "Dxva2.lib")

// Structure for monitor enumeration callback
struct MonitorEnumData
{
    std::vector<MonitorInfo> monitors;
    int internalCount;
    int externalCount;
};

/**
 * Convert wide string to UTF-8
 */
std::string WideToUtf8(const std::wstring &wstr)
{
    if (wstr.empty())
        return std::string();

    int size_needed = WideCharToMultiByte(CP_UTF8, 0, &wstr[0], (int)wstr.size(), NULL, 0, NULL, NULL);
    std::string strTo(size_needed, 0);
    WideCharToMultiByte(CP_UTF8, 0, &wstr[0], (int)wstr.size(), &strTo[0], size_needed, NULL, NULL);

    return strTo;
}

/**
 * Convert UTF-8 to wide string
 */
std::wstring Utf8ToWide(const std::string &str)
{
    if (str.empty())
        return std::wstring();

    int size_needed = MultiByteToWideChar(CP_UTF8, 0, &str[0], (int)str.size(), NULL, 0);
    std::wstring wstrTo(size_needed, 0);
    MultiByteToWideChar(CP_UTF8, 0, &str[0], (int)str.size(), &wstrTo[0], size_needed);

    return wstrTo;
}

/**
 * Generate unique monitor ID
 */
std::string GenerateMonitorId(HMONITOR hMonitor, int index)
{
    std::stringstream ss;
    ss << "monitor_" << std::hex << std::setfill('0') << std::setw(8)
       << reinterpret_cast<uintptr_t>(hMonitor) << "_" << std::dec << index;
    return ss.str();
}

/**
 * Check if monitor is internal (laptop display)
 */
bool IsInternalMonitor(HMONITOR hMonitor)
{
    MONITORINFOEX mi;
    mi.cbSize = sizeof(MONITORINFOEX);

    if (!GetMonitorInfo(hMonitor, &mi))
    {
        return false;
    }

    // Check if this is the primary monitor and might be internal
    // On laptops, the internal display is often the primary monitor
    // However, this is not foolproof
    DISPLAY_DEVICE dd;
    dd.cb = sizeof(DISPLAY_DEVICE);

    if (EnumDisplayDevices(mi.szDevice, 0, &dd, 0))
    {
        // Check if it's a laptop internal display
        // Internal displays typically have specific device names or are flagged differently
        std::wstring deviceString(dd.DeviceString);

        // Common patterns for internal displays
        if (deviceString.find(L"Internal") != std::wstring::npos ||
            deviceString.find(L"Laptop") != std::wstring::npos ||
            deviceString.find(L"Built-in") != std::wstring::npos)
        {
            return true;
        }
    }

    // Fallback: assume primary monitor on laptop is internal
    // This is a heuristic - not always accurate
    return (mi.dwFlags & MONITORINFOF_PRIMARY) != 0;
}

/**
 * Monitor enumeration callback
 */
BOOL CALLBACK MonitorEnumProc(HMONITOR hMonitor, HDC hdcMonitor, LPRECT lprcMonitor, LPARAM dwData)
{
    MonitorEnumData *data = reinterpret_cast<MonitorEnumData *>(dwData);

    // Get monitor info
    MONITORINFOEX mi;
    mi.cbSize = sizeof(MONITORINFOEX);

    if (!GetMonitorInfo(hMonitor, &mi))
    {
        return TRUE; // Continue enumeration
    }

    // Create monitor info structure
    MonitorInfo monitor;
    monitor.hMonitor = hMonitor;
    monitor.min = 0;
    monitor.max = 100;
    monitor.current = 50; // Default, will be updated later
    monitor.supportsWMI = false;
    monitor.supportsDDC = false;

    // Determine if internal or external
    bool isInternal = IsInternalMonitor(hMonitor);

    if (isInternal)
    {
        monitor.type = "internal";
        monitor.id = "internal_0";
        monitor.name = "Internal Display";
        monitor.supportsWMI = true;
        data->internalCount++;

        // Try to get current brightness via WMI
        int brightness = GetInternalBrightness();
        if (brightness >= 0)
        {
            monitor.current = brightness;
        }
    }
    else
    {
        // External monitor
        monitor.type = "external";
        monitor.id = GenerateMonitorId(hMonitor, data->externalCount);

        // Get monitor name from device
        DISPLAY_DEVICE dd;
        dd.cb = sizeof(DISPLAY_DEVICE);

        if (EnumDisplayDevices(mi.szDevice, 0, &dd, 0))
        {
            monitor.name = WideToUtf8(dd.DeviceString);
        }
        else
        {
            monitor.name = "External Display " + std::to_string(data->externalCount + 1);
        }

        // Try to get physical monitor handle for DDC/CI
        DWORD numPhysicalMonitors;
        if (GetNumberOfPhysicalMonitorsFromHMONITOR(hMonitor, &numPhysicalMonitors))
        {
            if (numPhysicalMonitors > 0)
            {
                std::vector<PHYSICAL_MONITOR> physicalMonitors(numPhysicalMonitors);

                if (GetPhysicalMonitorsFromHMONITOR(hMonitor, numPhysicalMonitors, &physicalMonitors[0]))
                {
                    // Test DDC/CI support by trying to get brightness
                    int brightness = GetExternalBrightness(hMonitor);
                    if (brightness >= 0)
                    {
                        monitor.supportsDDC = true;
                        monitor.current = brightness;
                    }

                    // Clean up physical monitor handles
                    DestroyPhysicalMonitors(numPhysicalMonitors, &physicalMonitors[0]);
                }
            }
        }

        data->externalCount++;
    }

    data->monitors.push_back(monitor);

    return TRUE; // Continue enumeration
}

/**
 * Get all connected monitors
 */
std::vector<MonitorInfo> GetAllMonitors()
{
    MonitorEnumData data;
    data.internalCount = 0;
    data.externalCount = 0;

    // Enumerate all monitors
    EnumDisplayMonitors(NULL, NULL, MonitorEnumProc, reinterpret_cast<LPARAM>(&data));

    return data.monitors;
}

/**
 * Get brightness for external display using DDC/CI
 */
int GetExternalBrightness(HMONITOR hMonitor)
{
    DWORD numPhysicalMonitors;
    if (!GetNumberOfPhysicalMonitorsFromHMONITOR(hMonitor, &numPhysicalMonitors))
    {
        return -1;
    }

    if (numPhysicalMonitors == 0)
    {
        return -1;
    }

    std::vector<PHYSICAL_MONITOR> physicalMonitors(numPhysicalMonitors);

    if (!GetPhysicalMonitorsFromHMONITOR(hMonitor, numPhysicalMonitors, &physicalMonitors[0]))
    {
        return -1;
    }

    int brightness = -1;
    DWORD minBrightness, currentBrightness, maxBrightness;

    // Try to get brightness using high-level API first
    if (GetMonitorBrightness(physicalMonitors[0].hPhysicalMonitor, &minBrightness, &currentBrightness, &maxBrightness))
    {
        brightness = currentBrightness;
    }
    else
    {
        // Fallback to low-level DDC/CI
        DWORD currentValue = 0;
        DWORD maxValue = 0;
        MC_VCP_CODE_TYPE codeType;

        if (GetVCPFeatureAndVCPFeatureReply(physicalMonitors[0].hPhysicalMonitor, 0x10, &codeType, &currentValue, &maxValue))
        {
            if (maxValue > 0)
            {
                // Convert to percentage
                brightness = (int)((currentValue * 100) / maxValue);
            }
        }
    }

    // Clean up
    DestroyPhysicalMonitors(numPhysicalMonitors, &physicalMonitors[0]);

    return brightness;
}

/**
 * Set brightness for external display using DDC/CI
 */
bool SetExternalBrightness(HMONITOR hMonitor, int brightness)
{
    // Clamp brightness
    if (brightness < 0)
        brightness = 0;
    if (brightness > 100)
        brightness = 100;

    DWORD numPhysicalMonitors;
    if (!GetNumberOfPhysicalMonitorsFromHMONITOR(hMonitor, &numPhysicalMonitors))
    {
        return false;
    }

    if (numPhysicalMonitors == 0)
    {
        return false;
    }

    std::vector<PHYSICAL_MONITOR> physicalMonitors(numPhysicalMonitors);

    if (!GetPhysicalMonitorsFromHMONITOR(hMonitor, numPhysicalMonitors, &physicalMonitors[0]))
    {
        return false;
    }

    bool success = false;

    // Try to set brightness using high-level API first
    if (SetMonitorBrightness(physicalMonitors[0].hPhysicalMonitor, brightness))
    {
        success = true;
    }
    else
    {
        // Fallback to low-level DDC/CI
        // VCP code 0x10 is brightness
        if (SetVCPFeature(physicalMonitors[0].hPhysicalMonitor, 0x10, brightness))
        {
            success = true;
        }
    }

    // Clean up
    DestroyPhysicalMonitors(numPhysicalMonitors, &physicalMonitors[0]);

    return success;
}

/**
 * Find monitor by ID
 */
MonitorInfo *FindMonitorById(const std::string &id, std::vector<MonitorInfo> &monitors)
{
    for (auto &monitor : monitors)
    {
        if (monitor.id == id)
        {
            return &monitor;
        }
    }
    return nullptr;
}
