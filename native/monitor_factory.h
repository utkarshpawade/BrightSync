/**
 * BrightSync - Monitor Factory Header
 *
 * Factory for creating monitor instances (real or mock)
 */

#ifndef MONITOR_FACTORY_H
#define MONITOR_FACTORY_H

#include "monitor_interface.h"
#include <vector>
#include <memory>

/**
 * Create monitor instances based on mode
 *
 * @param useMock If true, creates mock monitors for testing;
 *                if false, creates real monitors using Windows APIs
 * @return Vector of monitor instances (IMonitor shared pointers)
 */
std::vector<std::shared_ptr<IMonitor>> CreateMonitors(bool useMock);

#endif // MONITOR_FACTORY_H
