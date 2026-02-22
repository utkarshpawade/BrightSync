/**
 * BrightSync Native Addon - Main Entry Point
 *
 * N-API based native addon for Windows brightness control
 * Supports Hardware Abstraction Layer (HAL) with mock implementation
 */

#include <napi.h>
#include "monitor_interface.h"
#include "monitor_factory.h"
#include <windows.h>
#include <vector>
#include <string>
#include <memory>
#include <iostream>

// Global configuration
static bool g_mockMode = false;

// Global monitor cache
static std::vector<std::shared_ptr<IMonitor>> g_monitorCache;
static DWORD g_lastCacheUpdate = 0;
static const DWORD CACHE_TIMEOUT_MS = 500;

/**
 * Refresh monitor cache if needed
 */
void RefreshMonitorCache()
{
    DWORD currentTime = GetTickCount();
    if (g_monitorCache.empty() || (currentTime - g_lastCacheUpdate) > CACHE_TIMEOUT_MS)
    {
        if (g_mockMode)
        {
            std::cout << "[MOCK MODE] Refreshing monitor cache..." << std::endl;
        }

        g_monitorCache = CreateMonitors(g_mockMode);
        g_lastCacheUpdate = currentTime;
    }
}

/**
 * Convert IMonitor to Napi::Object
 */
Napi::Object MonitorToObject(Napi::Env env, const std::shared_ptr<IMonitor> &monitor)
{
    Napi::Object obj = Napi::Object::New(env);

    obj.Set("id", Napi::String::New(env, monitor->GetId()));
    obj.Set("name", Napi::String::New(env, monitor->GetName()));
    obj.Set("type", Napi::String::New(env, monitor->GetType()));
    obj.Set("min", Napi::Number::New(env, monitor->GetMinBrightness()));
    obj.Set("max", Napi::Number::New(env, monitor->GetMaxBrightness()));
    obj.Set("current", Napi::Number::New(env, monitor->GetBrightness()));

    return obj;
}

/**
 * N-API: Get all monitors
 * Returns: Array of monitor objects
 */
Napi::Value GetMonitors(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    try
    {
        // Refresh monitor cache
        RefreshMonitorCache();

        if (g_mockMode)
        {
            std::cout << "[MOCK MODE] Returning " << g_monitorCache.size() << " monitors" << std::endl;
        }

        // Create array to return
        Napi::Array result = Napi::Array::New(env, g_monitorCache.size());

        for (size_t i = 0; i < g_monitorCache.size(); i++)
        {
            result[i] = MonitorToObject(env, g_monitorCache[i]);
        }

        return result;
    }
    catch (const std::exception &e)
    {
        Napi::Error::New(env, std::string("Failed to get monitors: ") + e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

/**
 * N-API: Get brightness for a specific monitor
 * Args: monitorId (string)
 * Returns: brightness value (number) or -1 on error
 */
Napi::Value GetBrightness(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    // Validate arguments
    if (info.Length() < 1 || !info[0].IsString())
    {
        Napi::TypeError::New(env, "String expected for monitorId").ThrowAsJavaScriptException();
        return Napi::Number::New(env, -1);
    }

    std::string monitorId = info[0].As<Napi::String>().Utf8Value();

    try
    {
        // Refresh monitor cache
        RefreshMonitorCache();

        // Find monitor
        std::shared_ptr<IMonitor> monitor = nullptr;
        for (const auto &m : g_monitorCache)
        {
            if (m->GetId() == monitorId)
            {
                monitor = m;
                break;
            }
        }

        if (!monitor)
        {
            Napi::Error::New(env, "Monitor not found: " + monitorId).ThrowAsJavaScriptException();
            return Napi::Number::New(env, -1);
        }

        int brightness = monitor->GetBrightness();

        if (g_mockMode && brightness >= 0)
        {
            std::cout << "[MOCK MODE] GetBrightness(" << monitorId << ") = " << brightness << std::endl;
        }

        return Napi::Number::New(env, brightness);
    }
    catch (const std::exception &e)
    {
        Napi::Error::New(env, std::string("Failed to get brightness: ") + e.what()).ThrowAsJavaScriptException();
        return Napi::Number::New(env, -1);
    }
}

/**
 * N-API: Set brightness for a specific monitor
 * Args: monitorId (string), brightness (number)
 * Returns: success (boolean)
 */
Napi::Value SetBrightness(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    // Validate arguments
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsNumber())
    {
        Napi::TypeError::New(env, "String and Number expected").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }

    std::string monitorId = info[0].As<Napi::String>().Utf8Value();
    int brightness = info[1].As<Napi::Number>().Int32Value();

    // Clamp brightness to 0-100
    if (brightness < 0)
        brightness = 0;
    if (brightness > 100)
        brightness = 100;

    try
    {
        // Refresh monitor cache
        RefreshMonitorCache();

        // Find monitor
        std::shared_ptr<IMonitor> monitor = nullptr;
        for (const auto &m : g_monitorCache)
        {
            if (m->GetId() == monitorId)
            {
                monitor = m;
                break;
            }
        }

        if (!monitor)
        {
            Napi::Error::New(env, "Monitor not found: " + monitorId).ThrowAsJavaScriptException();
            return Napi::Boolean::New(env, false);
        }

        bool success = monitor->SetBrightness(brightness);

        if (g_mockMode)
        {
            std::cout << "[MOCK MODE] SetBrightness(" << monitorId << ", " << brightness << ") = " << (success ? "success" : "failed") << std::endl;
        }

        return Napi::Boolean::New(env, success);
    }
    catch (const std::exception &e)
    {
        Napi::Error::New(env, std::string("Failed to set brightness: ") + e.what()).ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }
}

/**
 * N-API: Initialize the addon with configuration
 * Args: config object with { mockMode: boolean }
 * Returns: success (boolean)
 */
Napi::Value Initialize(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    try
    {
        // Check if config object is provided
        if (info.Length() > 0 && info[0].IsObject())
        {
            Napi::Object config = info[0].As<Napi::Object>();

            // Get mockMode flag
            if (config.Has("mockMode"))
            {
                Napi::Value mockModeValue = config.Get("mockMode");
                if (mockModeValue.IsBoolean())
                {
                    g_mockMode = mockModeValue.As<Napi::Boolean>().Value();

                    if (g_mockMode)
                    {
                        std::cout << "[MOCK MODE] Hardware abstraction layer initialized in MOCK mode" << std::endl;
                        std::cout << "[MOCK MODE] All monitor operations will be simulated" << std::endl;
                    }
                    else
                    {
                        std::cout << "Hardware abstraction layer initialized in REAL mode" << std::endl;
                    }
                }
            }
        }

        // Clear cache to force reinitialization with new mode
        g_monitorCache.clear();
        g_lastCacheUpdate = 0;

        return Napi::Boolean::New(env, true);
    }
    catch (const std::exception &e)
    {
        Napi::Error::New(env, std::string("Failed to initialize: ") + e.what()).ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }
}

/**
 * Initialize N-API module
 */
Napi::Object Init(Napi::Env env, Napi::Object exports)
{
    // Export functions
    exports.Set("initialize", Napi::Function::New(env, Initialize));
    exports.Set("getMonitors", Napi::Function::New(env, GetMonitors));
    exports.Set("getBrightness", Napi::Function::New(env, GetBrightness));
    exports.Set("setBrightness", Napi::Function::New(env, SetBrightness));

    return exports;
}

// Register N-API module
NODE_API_MODULE(brightness, Init)
