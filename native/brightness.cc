/**
 * BrightSync Native Addon - Main Entry Point
 *
 * N-API based native addon for Windows brightness control
 */

#include <napi.h>
#include "brightness.h"
#include <vector>
#include <string>

// Global monitor cache
static std::vector<MonitorInfo> g_monitorCache;
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
        g_monitorCache = GetAllMonitors();
        g_lastCacheUpdate = currentTime;
    }
}

/**
 * Convert MonitorInfo to Napi::Object
 */
Napi::Object MonitorInfoToObject(Napi::Env env, const MonitorInfo &monitor)
{
    Napi::Object obj = Napi::Object::New(env);

    obj.Set("id", Napi::String::New(env, monitor.id));
    obj.Set("name", Napi::String::New(env, monitor.name));
    obj.Set("type", Napi::String::New(env, monitor.type));
    obj.Set("min", Napi::Number::New(env, monitor.min));
    obj.Set("max", Napi::Number::New(env, monitor.max));
    obj.Set("current", Napi::Number::New(env, monitor.current));

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

        // Create array to return
        Napi::Array result = Napi::Array::New(env, g_monitorCache.size());

        for (size_t i = 0; i < g_monitorCache.size(); i++)
        {
            result[i] = MonitorInfoToObject(env, g_monitorCache[i]);
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
        MonitorInfo *monitor = FindMonitorById(monitorId, g_monitorCache);
        if (!monitor)
        {
            Napi::Error::New(env, "Monitor not found: " + monitorId).ThrowAsJavaScriptException();
            return Napi::Number::New(env, -1);
        }

        int brightness = -1;

        if (monitor->type == "internal" && monitor->supportsWMI)
        {
            brightness = GetInternalBrightness();
        }
        else if (monitor->type == "external" && monitor->supportsDDC)
        {
            brightness = GetExternalBrightness(monitor->hMonitor);
        }

        if (brightness >= 0)
        {
            monitor->current = brightness;
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
        MonitorInfo *monitor = FindMonitorById(monitorId, g_monitorCache);
        if (!monitor)
        {
            Napi::Error::New(env, "Monitor not found: " + monitorId).ThrowAsJavaScriptException();
            return Napi::Boolean::New(env, false);
        }

        bool success = false;

        if (monitor->type == "internal" && monitor->supportsWMI)
        {
            success = SetInternalBrightness(brightness);
        }
        else if (monitor->type == "external" && monitor->supportsDDC)
        {
            success = SetExternalBrightness(monitor->hMonitor, brightness);
        }

        if (success)
        {
            monitor->current = brightness;
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
 * Initialize N-API module
 */
Napi::Object Init(Napi::Env env, Napi::Object exports)
{
    // Export functions
    exports.Set("getMonitors", Napi::Function::New(env, GetMonitors));
    exports.Set("getBrightness", Napi::Function::New(env, GetBrightness));
    exports.Set("setBrightness", Napi::Function::New(env, SetBrightness));

    return exports;
}

// Register N-API module
NODE_API_MODULE(brightness, Init)
