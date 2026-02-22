/**
 * BrightSync - Real Monitor Implementation
 *
 * Implements actual hardware communication for monitor brightness control
 */

#include "real_monitor.h"
#include <windows.h>
#include <wbemidl.h>
#include <comdef.h>
#include <physicalmonitorenumerationapi.h>
#include <highlevelmonitorconfigurationapi.h>
#include <lowlevelmonitorconfigurationapi.h>
#include <vector>
#include <iostream>
#include <iomanip>

#pragma comment(lib, "wbemuuid.lib")
#pragma comment(lib, "Dxva2.lib")

// ============================================================================
// Constructor / Destructor
// ============================================================================

RealMonitor::RealMonitor(
    const std::string &id,
    const std::string &name,
    const std::string &type,
    HMONITOR hMonitor,
    bool supportsWMI,
    bool supportsDDC)
    : m_id(id),
      m_name(name),
      m_type(type),
      m_hMonitor(hMonitor),
      m_supportsWMI(supportsWMI),
      m_supportsDDC(supportsDDC),
      m_minBrightness(0),
      m_maxBrightness(100),
      m_currentBrightness(50)
{
    // Try to get current brightness on initialization
    int current = GetBrightness();
    if (current >= 0)
    {
        m_currentBrightness = current;
    }
}

RealMonitor::~RealMonitor()
{
    // No explicit cleanup needed for HMONITOR (system-owned)
}

// ============================================================================
// IMonitor Interface Implementation
// ============================================================================

std::string RealMonitor::GetId() const
{
    return m_id;
}

std::string RealMonitor::GetName() const
{
    return m_name;
}

std::string RealMonitor::GetType() const
{
    return m_type;
}

int RealMonitor::GetMinBrightness() const
{
    return m_minBrightness;
}

int RealMonitor::GetMaxBrightness() const
{
    return m_maxBrightness;
}

int RealMonitor::GetBrightness() const
{
    if (m_type == "internal" && m_supportsWMI)
    {
        int brightness = GetInternalBrightnessWMI();
        if (brightness >= 0)
        {
            m_currentBrightness = brightness;
            return brightness;
        }
    }
    else if (m_type == "external" && m_supportsDDC)
    {
        int brightness = GetExternalBrightnessDDC();
        if (brightness >= 0)
        {
            m_currentBrightness = brightness;
            return brightness;
        }
    }

    return m_currentBrightness;
}

bool RealMonitor::SetBrightness(int value)
{
    // Clamp value to valid range
    if (value < m_minBrightness)
        value = m_minBrightness;
    if (value > m_maxBrightness)
        value = m_maxBrightness;

    bool success = false;

    if (m_type == "internal" && m_supportsWMI)
    {
        success = SetInternalBrightnessWMI(value);
    }
    else if (m_type == "external" && m_supportsDDC)
    {
        success = SetExternalBrightnessDDC(value);
    }

    if (success)
    {
        m_currentBrightness = value;
    }

    return success;
}

bool RealMonitor::IsControllable() const
{
    return (m_type == "internal" && m_supportsWMI) ||
           (m_type == "external" && m_supportsDDC);
}

// ============================================================================
// WMI Implementation (Internal Display)
// ============================================================================

// Thread-local COM initialization helper
static bool InitializeCOM()
{
    // Try to initialize COM on this thread
    HRESULT hr = CoInitializeEx(0, COINIT_MULTITHREADED);
    
    // S_OK means we initialized it successfully
    // S_FALSE means COM was already initialized on this thread (also success)
    // RPC_E_CHANGED_MODE means COM is initialized but with different threading model (still usable)
    if (SUCCEEDED(hr) || hr == S_FALSE || hr == RPC_E_CHANGED_MODE)
    {
        return true;
    }
    
    std::cout << "[WMI] ERROR: Failed to initialize COM (HRESULT: 0x"
              << std::hex << hr << std::dec << ")" << std::endl;
    return false;
}

// Initialize COM security
static bool InitializeCOMSecurity()
{
    HRESULT hr = CoInitializeSecurity(
        NULL,
        -1,
        NULL,
        NULL,
        RPC_C_AUTHN_LEVEL_DEFAULT,
        RPC_C_IMP_LEVEL_IMPERSONATE,
        NULL,
        EOAC_NONE,
        NULL);

    // S_OK means success
    // RPC_E_TOO_LATE means it was already initialized (also success)
    if (SUCCEEDED(hr) || hr == RPC_E_TOO_LATE)
    {
        return true;
    }

    std::cout << "[WMI] ERROR: Failed to initialize COM security (HRESULT: 0x"
              << std::hex << hr << std::dec << ")" << std::endl;
    return false;
}

/**
 * Check if running with administrator privileges
 */
static bool IsRunningAsAdmin()
{
    BOOL isAdmin = FALSE;
    PSID adminGroup = NULL;
    SID_IDENTIFIER_AUTHORITY ntAuthority = SECURITY_NT_AUTHORITY;

    if (AllocateAndInitializeSid(&ntAuthority, 2,
                                 SECURITY_BUILTIN_DOMAIN_RID,
                                 DOMAIN_ALIAS_RID_ADMINS,
                                 0, 0, 0, 0, 0, 0, &adminGroup))
    {
        CheckTokenMembership(NULL, adminGroup, &isAdmin);
        FreeSid(adminGroup);
    }

    return isAdmin != FALSE;
}

/**
 * Get WMI service for brightness control
 */
static IWbemServices *GetWMIService()
{
    // Initialize COM on this thread
    if (!InitializeCOM())
    {
        std::cout << "[WMI] ERROR: Failed to initialize COM" << std::endl;
        return nullptr;
    }

    // Initialize COM security (safe to call multiple times)
    static bool securityInitialized = false;
    if (!securityInitialized)
    {
        if (!InitializeCOMSecurity())
        {
            std::cout << "[WMI] ERROR: Failed to initialize COM security" << std::endl;
            return nullptr;
        }
        securityInitialized = true;
    }

    // Check admin privileges
    if (!IsRunningAsAdmin())
    {
        std::cout << "[WMI] ERROR: Not running as Administrator!" << std::endl;
        std::cout << "[WMI] Internal display brightness control requires admin privileges." << std::endl;
        std::cout << "[WMI] Please run the app as Administrator." << std::endl;
        return nullptr;
    }

    IWbemLocator *pLoc = nullptr;
    HRESULT hr = CoCreateInstance(
        CLSID_WbemLocator,
        0,
        CLSCTX_INPROC_SERVER,
        IID_IWbemLocator,
        (LPVOID *)&pLoc);

    if (FAILED(hr))
    {
        std::cout << "[WMI] ERROR: Failed to create WbemLocator (HRESULT: 0x"
                  << std::hex << hr << std::dec << ")" << std::endl;
        return nullptr;
    }

    IWbemServices *pSvc = nullptr;
    hr = pLoc->ConnectServer(
        _bstr_t(L"ROOT\\WMI"),
        NULL,
        NULL,
        0,
        NULL,
        0,
        0,
        &pSvc);

    pLoc->Release();

    if (FAILED(hr))
    {
        std::cout << "[WMI] ERROR: Failed to connect to WMI (HRESULT: 0x"
                  << std::hex << hr << std::dec << ")" << std::endl;
        if (hr == 0x80041003)
        {
            std::cout << "[WMI] This error usually means access denied - run as Administrator!" << std::endl;
        }
        return nullptr;
    }

    // Set security levels on proxy
    hr = CoSetProxyBlanket(
        pSvc,
        RPC_C_AUTHN_WINNT,
        RPC_C_AUTHZ_NONE,
        NULL,
        RPC_C_AUTHN_LEVEL_CALL,
        RPC_C_IMP_LEVEL_IMPERSONATE,
        NULL,
        EOAC_NONE);

    if (FAILED(hr))
    {
        pSvc->Release();
        return nullptr;
    }

    return pSvc;
}

int RealMonitor::GetInternalBrightnessWMI() const
{
    IWbemServices *pSvc = GetWMIService();
    if (!pSvc)
    {
        return -1;
    }

    IEnumWbemClassObject *pEnumerator = nullptr;
    HRESULT hr = pSvc->ExecQuery(
        bstr_t("WQL"),
        bstr_t("SELECT CurrentBrightness FROM WmiMonitorBrightness"),
        WBEM_FLAG_FORWARD_ONLY | WBEM_FLAG_RETURN_IMMEDIATELY,
        NULL,
        &pEnumerator);

    if (FAILED(hr))
    {
        pSvc->Release();
        return -1;
    }

    int brightness = -1;
    IWbemClassObject *pclsObj = nullptr;
    ULONG uReturn = 0;

    while (pEnumerator)
    {
        hr = pEnumerator->Next(WBEM_INFINITE, 1, &pclsObj, &uReturn);

        if (uReturn == 0)
        {
            break;
        }

        VARIANT vtProp;
        VariantInit(&vtProp);

        hr = pclsObj->Get(L"CurrentBrightness", 0, &vtProp, 0, 0);
        if (SUCCEEDED(hr))
        {
            brightness = vtProp.uiVal;
        }

        VariantClear(&vtProp);
        pclsObj->Release();
        break; // Only get first monitor
    }

    pEnumerator->Release();
    pSvc->Release();

    return brightness;
}

bool RealMonitor::SetInternalBrightnessWMI(int brightness)
{
    // Clamp brightness
    if (brightness < 0)
        brightness = 0;
    if (brightness > 100)
        brightness = 100;

    std::cout << "[WMI] Attempting to set brightness to " << brightness << "%" << std::endl;

    IWbemServices *pSvc = GetWMIService();
    if (!pSvc)
    {
        std::cout << "[WMI] ERROR: Failed to get WMI service" << std::endl;
        return false;
    }

    // Get the WmiMonitorBrightnessMethods instance
    IEnumWbemClassObject *pEnumerator = nullptr;
    HRESULT hr = pSvc->ExecQuery(
        bstr_t("WQL"),
        bstr_t("SELECT * FROM WmiMonitorBrightnessMethods"),
        WBEM_FLAG_FORWARD_ONLY | WBEM_FLAG_RETURN_IMMEDIATELY,
        NULL,
        &pEnumerator);

    if (FAILED(hr))
    {
        std::cout << "[WMI] ERROR: Failed to query WmiMonitorBrightnessMethods (HRESULT: 0x"
                  << std::hex << hr << std::dec << ")" << std::endl;
        pSvc->Release();
        return false;
    }

    std::cout << "[WMI] Successfully queried WmiMonitorBrightnessMethods" << std::endl;

    bool success = false;
    IWbemClassObject *pclsObj = nullptr;
    ULONG uReturn = 0;

    while (pEnumerator)
    {
        hr = pEnumerator->Next(WBEM_INFINITE, 1, &pclsObj, &uReturn);

        if (uReturn == 0)
        {
            std::cout << "[WMI] ERROR: No WmiMonitorBrightnessMethods instances found" << std::endl;
            break;
        }

        std::cout << "[WMI] Found WmiMonitorBrightnessMethods instance" << std::endl;

        // Get Active property
        VARIANT vtActive;
        VariantInit(&vtActive);
        hr = pclsObj->Get(L"Active", 0, &vtActive, NULL, NULL);
        if (SUCCEEDED(hr))
        {
            bool isActive = (vtActive.boolVal != 0);
            std::cout << "[WMI] Instance Active: " << (isActive ? "Yes" : "No") << std::endl;
            if (!isActive)
            {
                std::cout << "[WMI] Skipping inactive instance" << std::endl;
                VariantClear(&vtActive);
                pclsObj->Release();
                continue;
            }
        }
        VariantClear(&vtActive);

        // Get InstanceName for debugging
        VARIANT vtInstanceName;
        VariantInit(&vtInstanceName);
        hr = pclsObj->Get(L"InstanceName", 0, &vtInstanceName, NULL, NULL);
        if (SUCCEEDED(hr) && vtInstanceName.vt == VT_BSTR)
        {
            std::wcout << L"[WMI] InstanceName: " << vtInstanceName.bstrVal << std::endl;
        }
        VariantClear(&vtInstanceName);

        // Get object path
        VARIANT vtPath;
        VariantInit(&vtPath);
        hr = pclsObj->Get(L"__PATH", 0, &vtPath, NULL, NULL);

        if (FAILED(hr))
        {
            std::cout << "[WMI] ERROR: Failed to get object path (HRESULT: 0x"
                      << std::hex << hr << std::dec << ")" << std::endl;
            VariantClear(&vtPath);
            pclsObj->Release();
            break;
        }

        std::wcout << L"[WMI] Object path: " << vtPath.bstrVal << std::endl;

        // Get the method class
        IWbemClassObject *pClass = nullptr;
        hr = pSvc->GetObject(bstr_t("WmiMonitorBrightnessMethods"), 0, NULL, &pClass, NULL);

        if (FAILED(hr))
        {
            std::cout << "[WMI] ERROR: Failed to get method class (HRESULT: 0x"
                      << std::hex << hr << std::dec << ")" << std::endl;
            VariantClear(&vtPath);
            pclsObj->Release();
            break;
        }

        std::cout << "[WMI] Got method class" << std::endl;

        IWbemClassObject *pInParamsDefinition = nullptr;
        hr = pClass->GetMethod(L"WmiSetBrightness", 0, &pInParamsDefinition, NULL);

        if (FAILED(hr))
        {
            std::cout << "[WMI] ERROR: Failed to get WmiSetBrightness method (HRESULT: 0x"
                      << std::hex << hr << std::dec << ")" << std::endl;
            pClass->Release();
            VariantClear(&vtPath);
            pclsObj->Release();
            break;
        }

        std::cout << "[WMI] Got WmiSetBrightness method definition" << std::endl;

        IWbemClassObject *pClassInstance = nullptr;
        hr = pInParamsDefinition->SpawnInstance(0, &pClassInstance);

        if (FAILED(hr))
        {
            std::cout << "[WMI] ERROR: Failed to spawn instance (HRESULT: 0x"
                      << std::hex << hr << std::dec << ")" << std::endl;
            pInParamsDefinition->Release();
            pClass->Release();
            VariantClear(&vtPath);
            pclsObj->Release();
            break;
        }

        std::cout << "[WMI] Spawned method instance" << std::endl;

        // Set timeout parameter - try VT_I4 (signed) instead of VT_UI4
        VARIANT vtTimeout;
        VariantInit(&vtTimeout);
        vtTimeout.lVal = 1;   // lVal for VT_I4
        vtTimeout.vt = VT_I4; // Try signed int instead
        hr = pClassInstance->Put(L"Timeout", 0, &vtTimeout, 0);
        if (FAILED(hr))
        {
            std::cout << "[WMI] ERROR: Failed to set Timeout parameter (HRESULT: 0x"
                      << std::hex << hr << std::dec << ")" << std::endl;
        }
        else
        {
            std::cout << "[WMI] Set Timeout parameter = 1" << std::endl;
        }
        VariantClear(&vtTimeout);

        // Set brightness parameter
        VARIANT vtBrightness;
        VariantInit(&vtBrightness);
        vtBrightness.bVal = (BYTE)brightness; // Use bVal for UI1 (BYTE)
        vtBrightness.vt = VT_UI1;             // BYTE type
        hr = pClassInstance->Put(L"Brightness", 0, &vtBrightness, 0);
        if (FAILED(hr))
        {
            std::cout << "[WMI] ERROR: Failed to set Brightness parameter (HRESULT: 0x"
                      << std::hex << hr << std::dec << ")" << std::endl;
        }
        else
        {
            std::cout << "[WMI] Set Brightness parameter = " << (int)brightness << std::endl;
        }
        VariantClear(&vtBrightness);

        // Execute method
        IWbemClassObject *pOutParams = nullptr;
        hr = pSvc->ExecMethod(
            vtPath.bstrVal,
            bstr_t("WmiSetBrightness"),
            0,
            NULL,
            pClassInstance,
            &pOutParams,
            NULL);

        if (SUCCEEDED(hr))
        {
            std::cout << "[WMI] SUCCESS: Brightness set successfully!" << std::endl;
            success = true;
            if (pOutParams)
            {
                pOutParams->Release();
            }
        }
        else
        {
            std::cout << "[WMI] ERROR: Failed to execute WmiSetBrightness (HRESULT: 0x"
                      << std::hex << hr << std::dec << ")" << std::endl;
        }

        pClassInstance->Release();
        pInParamsDefinition->Release();
        pClass->Release();
        VariantClear(&vtPath);
        pclsObj->Release();
        break; // Only set first monitor
    }

    pEnumerator->Release();
    pSvc->Release();

    return success;
}

// ============================================================================
// DDC/CI Implementation (External Display)
// ============================================================================

int RealMonitor::GetExternalBrightnessDDC() const
{
    DWORD numPhysicalMonitors;
    if (!GetNumberOfPhysicalMonitorsFromHMONITOR(m_hMonitor, &numPhysicalMonitors))
    {
        return -1;
    }

    if (numPhysicalMonitors == 0)
    {
        return -1;
    }

    std::vector<PHYSICAL_MONITOR> physicalMonitors(numPhysicalMonitors);

    if (!GetPhysicalMonitorsFromHMONITOR(m_hMonitor, numPhysicalMonitors, &physicalMonitors[0]))
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

bool RealMonitor::SetExternalBrightnessDDC(int brightness)
{
    // Clamp brightness
    if (brightness < 0)
        brightness = 0;
    if (brightness > 100)
        brightness = 100;

    DWORD numPhysicalMonitors;
    if (!GetNumberOfPhysicalMonitorsFromHMONITOR(m_hMonitor, &numPhysicalMonitors))
    {
        return false;
    }

    if (numPhysicalMonitors == 0)
    {
        return false;
    }

    std::vector<PHYSICAL_MONITOR> physicalMonitors(numPhysicalMonitors);

    if (!GetPhysicalMonitorsFromHMONITOR(m_hMonitor, numPhysicalMonitors, &physicalMonitors[0]))
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
