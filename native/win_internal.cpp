/**
 * Windows Internal Display Brightness Control
 *
 * Uses WMI (Windows Management Instrumentation) to control laptop internal display brightness
 */

#include "brightness.h"
#include <windows.h>
#include <wbemidl.h>
#include <comdef.h>
#include <vector>
#include <string>

#pragma comment(lib, "wbemuuid.lib")

// COM initialization guard
class COMInitializer
{
public:
    COMInitializer() : initialized(false)
    {
        HRESULT hr = CoInitializeEx(0, COINIT_MULTITHREADED);
        if (SUCCEEDED(hr))
        {
            initialized = true;
        }
    }

    ~COMInitializer()
    {
        if (initialized)
        {
            CoUninitialize();
        }
    }

    bool IsInitialized() const { return initialized; }

private:
    bool initialized;
};

// COM security initializer
class COMSecurityInitializer
{
public:
    COMSecurityInitializer() : initialized(false)
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

        if (SUCCEEDED(hr) || hr == RPC_E_TOO_LATE)
        {
            initialized = true;
        }
    }

    bool IsInitialized() const { return initialized; }

private:
    bool initialized;
};

/**
 * Get WMI service for brightness control
 */
static IWbemServices *GetWMIService()
{
    static COMInitializer comInit;
    static COMSecurityInitializer comSecInit;

    if (!comInit.IsInitialized() || !comSecInit.IsInitialized())
    {
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

/**
 * Get brightness for internal display using WMI
 */
int GetInternalBrightness()
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

/**
 * Set brightness for internal display using WMI
 */
bool SetInternalBrightness(int brightness)
{
    // Clamp brightness
    if (brightness < 0)
        brightness = 0;
    if (brightness > 100)
        brightness = 100;

    IWbemServices *pSvc = GetWMIService();
    if (!pSvc)
    {
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
        pSvc->Release();
        return false;
    }

    bool success = false;
    IWbemClassObject *pclsObj = nullptr;
    ULONG uReturn = 0;

    while (pEnumerator)
    {
        hr = pEnumerator->Next(WBEM_INFINITE, 1, &pclsObj, &uReturn);

        if (uReturn == 0)
        {
            break;
        }

        // Get object path
        VARIANT vtPath;
        VariantInit(&vtPath);
        hr = pclsObj->Get(L"__PATH", 0, &vtPath, NULL, NULL);

        if (SUCCEEDED(hr))
        {
            // Get the method class
            IWbemClassObject *pClass = nullptr;
            hr = pSvc->GetObject(bstr_t("WmiMonitorBrightnessMethods"), 0, NULL, &pClass, NULL);

            if (SUCCEEDED(hr))
            {
                IWbemClassObject *pInParamsDefinition = nullptr;
                hr = pClass->GetMethod(L"WmiSetBrightness", 0, &pInParamsDefinition, NULL);

                if (SUCCEEDED(hr))
                {
                    IWbemClassObject *pClassInstance = nullptr;
                    hr = pInParamsDefinition->SpawnInstance(0, &pClassInstance);

                    if (SUCCEEDED(hr))
                    {
                        // Set timeout parameter (must be 0 for immediate change or > 0 for transition)
                        VARIANT vtTimeout;
                        VariantInit(&vtTimeout);
                        vtTimeout.uiVal = 0;
                        vtTimeout.vt = VT_UI4;
                        pClassInstance->Put(L"Timeout", 0, &vtTimeout, 0);
                        VariantClear(&vtTimeout);

                        // Set brightness parameter
                        VARIANT vtBrightness;
                        VariantInit(&vtBrightness);
                        vtBrightness.uiVal = brightness;
                        vtBrightness.vt = VT_UI1;
                        pClassInstance->Put(L"Brightness", 0, &vtBrightness, 0);
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
                            success = true;
                            if (pOutParams)
                            {
                                pOutParams->Release();
                            }
                        }

                        pClassInstance->Release();
                    }

                    pInParamsDefinition->Release();
                }

                pClass->Release();
            }
        }

        VariantClear(&vtPath);
        pclsObj->Release();
        break; // Only set first monitor
    }

    pEnumerator->Release();
    pSvc->Release();

    return success;
}
