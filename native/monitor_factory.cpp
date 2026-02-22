/**
 * BrightSync - Monitor Factory
 *
 * Creates monitor instances (real or mock) based on runtime configuration
 */

#include "monitor_interface.h"
#include "real_monitor.h"
#include "mock_monitor.h"
#include "monitor_factory.h"
#include <windows.h>
#include <physicalmonitorenumerationapi.h>
#include <highlevelmonitorconfigurationapi.h>
#include <lowlevelmonitorconfigurationapi.h>
#include <vector>
#include <memory>
#include <string>
#include <sstream>
#include <iomanip>
#include <iostream>

#pragma comment(lib, "Dxva2.lib")
#pragma comment(lib, "User32.lib")

// Structure for monitor enumeration callback
struct MonitorEnumContext
{
    std::vector<std::shared_ptr<IMonitor>> monitors;
    int internalCount;
    int externalCount;
};

// Forward declarations
static std::string WideToUtf8(const std::wstring &wstr);
static std::string GenerateMonitorId(HMONITOR hMonitor, int index);
static bool IsInternalMonitor(HMONITOR hMonitor);
static int GetInternalBrightnessForInit();
static int GetExternalBrightnessForInit(HMONITOR hMonitor);
static BOOL CALLBACK MonitorEnumProc(HMONITOR hMonitor, HDC hdcMonitor, LPRECT lprcMonitor, LPARAM dwData);

/**
 * Create mock monitors for testing
 *
 * Creates a simulated monitor setup:
 * - 1 internal laptop display
 * - 2 external monitors
 */
static std::vector<std::shared_ptr<IMonitor>> CreateMockMonitors()
{
    std::cout << "[MOCK MODE] Creating simulated monitors..." << std::endl;

    std::vector<std::shared_ptr<IMonitor>> monitors;

    // Create 1 internal monitor
    monitors.push_back(std::make_shared<MockMonitor>(
        "mock_internal_0",
        "Mock Internal Display",
        "internal",
        50));

    // Create 2 external monitors
    monitors.push_back(std::make_shared<MockMonitor>(
        "mock_external_0",
        "Mock External Display 1",
        "external",
        50));

    monitors.push_back(std::make_shared<MockMonitor>(
        "mock_external_1",
        "Mock External Display 2",
        "external",
        50));

    std::cout << "[MOCK MODE] Created " << monitors.size() << " mock monitors" << std::endl;

    return monitors;
}

/**
 * Create real monitors using Windows APIs
 *
 * Enumerates physical monitors and creates RealMonitor instances
 */
static std::vector<std::shared_ptr<IMonitor>> CreateRealMonitors()
{
    std::cout << "Creating real monitors..." << std::endl;

    MonitorEnumContext context;
    context.internalCount = 0;
    context.externalCount = 0;

    // Enumerate all monitors
    EnumDisplayMonitors(NULL, NULL, MonitorEnumProc, reinterpret_cast<LPARAM>(&context));

    std::cout << "Found " << context.monitors.size() << " real monitors" << std::endl;

    return context.monitors;
}

/**
 * Main factory function - creates monitors based on mode
 *
 * @param useMock If true, creates mock monitors; if false, creates real monitors
 * @return Vector of monitor instances
 */
std::vector<std::shared_ptr<IMonitor>> CreateMonitors(bool useMock)
{
    if (useMock)
    {
        return CreateMockMonitors();
    }
    else
    {
        return CreateRealMonitors();
    }
}

// ============================================================================
// Helper Functions for Real Monitor Creation
// ============================================================================

/**
 * Convert wide string to UTF-8
 */
static std::string WideToUtf8(const std::wstring &wstr)
{
    if (wstr.empty())
        return std::string();

    int size_needed = WideCharToMultiByte(CP_UTF8, 0, &wstr[0], (int)wstr.size(), NULL, 0, NULL, NULL);
    std::string strTo(size_needed, 0);
    WideCharToMultiByte(CP_UTF8, 0, &wstr[0], (int)wstr.size(), &strTo[0], size_needed, NULL, NULL);

    return strTo;
}

/**
 * Generate unique monitor ID
 */
static std::string GenerateMonitorId(HMONITOR hMonitor, int index)
{
    std::stringstream ss;
    ss << "monitor_" << std::hex << std::setfill('0') << std::setw(8)
       << reinterpret_cast<uintptr_t>(hMonitor) << "_" << std::dec << index;
    return ss.str();
}

/**
 * Check if monitor is internal (laptop display)
 */
static bool IsInternalMonitor(HMONITOR hMonitor)
{
    MONITORINFOEX mi;
    mi.cbSize = sizeof(MONITORINFOEX);

    if (!GetMonitorInfo(hMonitor, &mi))
    {
        return false;
    }

    // Check if this is the primary monitor and might be internal
    DISPLAY_DEVICE dd;
    dd.cb = sizeof(DISPLAY_DEVICE);

    if (EnumDisplayDevices(mi.szDevice, 0, &dd, 0))
    {
        // Check if it's a laptop internal display
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
    return (mi.dwFlags & MONITORINFOF_PRIMARY) != 0;
}

/**
 * Get internal brightness for initialization
 */
static int GetInternalBrightnessForInit()
{
    // Create a temporary real monitor to get the brightness
    // This is a simplified approach - in production you might want to cache this
    RealMonitor tempMonitor("temp", "temp", "internal", NULL, true, false);
    return tempMonitor.GetBrightness();
}

/**
 * Get external brightness for initialization
 */
static int GetExternalBrightnessForInit(HMONITOR hMonitor)
{
    // Create a temporary real monitor to get the brightness
    RealMonitor tempMonitor("temp", "temp", "external", hMonitor, false, true);
    return tempMonitor.GetBrightness();
}

/**
 * Monitor enumeration callback for real monitors
 */
static BOOL CALLBACK MonitorEnumProc(HMONITOR hMonitor, HDC hdcMonitor, LPRECT lprcMonitor, LPARAM dwData)
{
    MonitorEnumContext *context = reinterpret_cast<MonitorEnumContext *>(dwData);

    // Get monitor info
    MONITORINFOEX mi;
    mi.cbSize = sizeof(MONITORINFOEX);

    if (!GetMonitorInfo(hMonitor, &mi))
    {
        return TRUE; // Continue enumeration
    }

    // Determine if internal or external
    bool isInternal = IsInternalMonitor(hMonitor);

    if (isInternal)
    {
        // Internal monitor
        std::string id = "internal_0";
        std::string name = "Internal Display";
        std::string type = "internal";

        // Get current brightness
        int currentBrightness = GetInternalBrightnessForInit();

        // Create RealMonitor instance
        auto monitor = std::make_shared<RealMonitor>(
            id,
            name,
            type,
            hMonitor,
            true, // supportsWMI
            false // supportsDDC
        );

        context->monitors.push_back(monitor);
        context->internalCount++;
    }
    else
    {
        // External monitor
        std::string id = GenerateMonitorId(hMonitor, context->externalCount);
        std::string name;

        // Get monitor name from device
        DISPLAY_DEVICE dd;
        dd.cb = sizeof(DISPLAY_DEVICE);

        if (EnumDisplayDevices(mi.szDevice, 0, &dd, 0))
        {
            name = WideToUtf8(dd.DeviceString);
        }
        else
        {
            name = "External Display " + std::to_string(context->externalCount + 1);
        }

        // Test DDC/CI support
        bool supportsDDC = false;
        int currentBrightness = GetExternalBrightnessForInit(hMonitor);
        if (currentBrightness >= 0)
        {
            supportsDDC = true;
        }

        // Create RealMonitor instance
        auto monitor = std::make_shared<RealMonitor>(
            id,
            name,
            "external",
            hMonitor,
            false,      // supportsWMI
            supportsDDC // supportsDDC
        );

        context->monitors.push_back(monitor);
        context->externalCount++;
    }

    return TRUE; // Continue enumeration
}
