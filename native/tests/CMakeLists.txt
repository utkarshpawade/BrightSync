cmake_minimum_required(VERSION 3.14)
project(BrightSyncTests)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Download and configure GoogleTest
include(FetchContent)
FetchContent_Declare(
  googletest
  URL https://github.com/google/googletest/archive/release-1.12.1.zip
)
# For Windows: Prevent overriding the parent project's compiler/linker settings
set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(googletest)

# Enable testing
enable_testing()

# Include directories
include_directories(
  ${CMAKE_SOURCE_DIR}/..
  ${CMAKE_SOURCE_DIR}/../node_modules/node-addon-api
)

# Source files to test (mock mode only)
set(SOURCES_TO_TEST
  ../mock_monitor.cpp
  ../monitor_factory.cpp
)

# Test executable
add_executable(
  mock_monitor_test
  mock_monitor_test.cpp
  ${SOURCES_TO_TEST}
)

# Link against GoogleTest
target_link_libraries(
  mock_monitor_test
  GTest::gtest_main
)

# Add test to CTest
include(GoogleTest)
gtest_discover_tests(mock_monitor_test)

# Print configuration
message(STATUS "BrightSync Native Tests Configuration:")
message(STATUS "  C++ Standard: ${CMAKE_CXX_STANDARD}")
message(STATUS "  Build Type: ${CMAKE_BUILD_TYPE}")
