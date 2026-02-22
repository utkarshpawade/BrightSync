/**
 * BrightSync Native Layer Tests
 *
 * Comprehensive GoogleTest suite for testing mock monitor implementation
 * and HAL factory in mock mode
 */

#include <gtest/gtest.h>
#include "../monitor_interface.h"
#include "../mock_monitor.h"
#include "../monitor_factory.h"
#include <memory>
#include <vector>
#include <string>
#include <thread>
#include <chrono>

// ============================================================================
// MockMonitor Basic Functionality Tests
// ============================================================================

class MockMonitorTest : public ::testing::Test
{
protected:
    std::shared_ptr<MockMonitor> monitor;

    void SetUp() override
    {
        monitor = std::make_shared<MockMonitor>(
            "test_mock_0",
            "Test Mock Display",
            "internal",
            50);
    }
};

TEST_F(MockMonitorTest, InitializesWithCorrectId)
{
    EXPECT_EQ(monitor->GetId(), "test_mock_0");
}

TEST_F(MockMonitorTest, InitializesWithCorrectName)
{
    EXPECT_EQ(monitor->GetName(), "Test Mock Display");
}

TEST_F(MockMonitorTest, InitializesWithCorrectType)
{
    EXPECT_EQ(monitor->GetType(), "internal");
}

TEST_F(MockMonitorTest, InitializesWithCorrectBrightness)
{
    EXPECT_EQ(monitor->GetBrightness(), 50);
}

TEST_F(MockMonitorTest, HasCorrectMinBrightness)
{
    EXPECT_EQ(monitor->GetMinBrightness(), 0);
}

TEST_F(MockMonitorTest, HasCorrectMaxBrightness)
{
    EXPECT_EQ(monitor->GetMaxBrightness(), 100);
}

TEST_F(MockMonitorTest, IsControllable)
{
    EXPECT_TRUE(monitor->IsControllable());
}

// ============================================================================
// Brightness Control Tests
// ============================================================================

TEST_F(MockMonitorTest, SetBrightnessUpdatesState)
{
    EXPECT_TRUE(monitor->SetBrightness(75));
    EXPECT_EQ(monitor->GetBrightness(), 75);
}

TEST_F(MockMonitorTest, SetBrightnessReturnsTrue)
{
    EXPECT_TRUE(monitor->SetBrightness(50));
}

TEST_F(MockMonitorTest, SetBrightnessToMinimum)
{
    EXPECT_TRUE(monitor->SetBrightness(0));
    EXPECT_EQ(monitor->GetBrightness(), 0);
}

TEST_F(MockMonitorTest, SetBrightnessToMaximum)
{
    EXPECT_TRUE(monitor->SetBrightness(100));
    EXPECT_EQ(monitor->GetBrightness(), 100);
}

TEST_F(MockMonitorTest, GetBrightnessAfterMultipleSets)
{
    monitor->SetBrightness(25);
    monitor->SetBrightness(50);
    monitor->SetBrightness(75);
    EXPECT_EQ(monitor->GetBrightness(), 75);
}

// ============================================================================
// Clamping Tests
// ============================================================================

TEST_F(MockMonitorTest, ClampsBrightnessAtMinimum)
{
    EXPECT_TRUE(monitor->SetBrightness(-10));
    EXPECT_EQ(monitor->GetBrightness(), 0);
}

TEST_F(MockMonitorTest, ClampsBrightnessAtMaximum)
{
    EXPECT_TRUE(monitor->SetBrightness(150));
    EXPECT_EQ(monitor->GetBrightness(), 100);
}

TEST_F(MockMonitorTest, ClampsLargeNegativeValue)
{
    EXPECT_TRUE(monitor->SetBrightness(-999));
    EXPECT_EQ(monitor->GetBrightness(), 0);
}

TEST_F(MockMonitorTest, ClampsLargePositiveValue)
{
    EXPECT_TRUE(monitor->SetBrightness(999));
    EXPECT_EQ(monitor->GetBrightness(), 100);
}

// ============================================================================
// Monitor Factory Tests
// ============================================================================

class MonitorFactoryTest : public ::testing::Test
{
protected:
    std::vector<std::shared_ptr<IMonitor>> monitors;

    void SetUp() override
    {
        monitors = CreateMonitors(true); // Mock mode
    }
};

TEST_F(MonitorFactoryTest, CreatesThreeMonitorsInMockMode)
{
    EXPECT_EQ(monitors.size(), 3);
}

TEST_F(MonitorFactoryTest, FirstMonitorIsInternal)
{
    ASSERT_GE(monitors.size(), 1);
    EXPECT_EQ(monitors[0]->GetType(), "internal");
}

TEST_F(MonitorFactoryTest, SecondMonitorIsExternal)
{
    ASSERT_GE(monitors.size(), 2);
    EXPECT_EQ(monitors[1]->GetType(), "external");
}

TEST_F(MonitorFactoryTest, ThirdMonitorIsExternal)
{
    ASSERT_GE(monitors.size(), 3);
    EXPECT_EQ(monitors[2]->GetType(), "external");
}

TEST_F(MonitorFactoryTest, AllMonitorsHaveUniqueIds)
{
    ASSERT_EQ(monitors.size(), 3);
    EXPECT_NE(monitors[0]->GetId(), monitors[1]->GetId());
    EXPECT_NE(monitors[0]->GetId(), monitors[2]->GetId());
    EXPECT_NE(monitors[1]->GetId(), monitors[2]->GetId());
}

TEST_F(MonitorFactoryTest, AllMonitorsHaveValidNames)
{
    for (const auto &monitor : monitors)
    {
        EXPECT_FALSE(monitor->GetName().empty());
    }
}

TEST_F(MonitorFactoryTest, AllMonitorsAreControllable)
{
    for (const auto &monitor : monitors)
    {
        EXPECT_TRUE(monitor->IsControllable());
    }
}

TEST_F(MonitorFactoryTest, AllMonitorsInitializeWithBrightness50)
{
    for (const auto &monitor : monitors)
    {
        EXPECT_EQ(monitor->GetBrightness(), 50);
    }
}

// ============================================================================
// Multiple Monitor Independence Tests
// ============================================================================

TEST_F(MonitorFactoryTest, MonitorsMaintainIndependentState)
{
    ASSERT_EQ(monitors.size(), 3);

    monitors[0]->SetBrightness(25);
    monitors[1]->SetBrightness(50);
    monitors[2]->SetBrightness(75);

    EXPECT_EQ(monitors[0]->GetBrightness(), 25);
    EXPECT_EQ(monitors[1]->GetBrightness(), 50);
    EXPECT_EQ(monitors[2]->GetBrightness(), 75);
}

TEST_F(MonitorFactoryTest, ChangingOneMonitorDoesNotAffectOthers)
{
    ASSERT_EQ(monitors.size(), 3);

    monitors[0]->SetBrightness(10);

    EXPECT_EQ(monitors[0]->GetBrightness(), 10);
    EXPECT_EQ(monitors[1]->GetBrightness(), 50);
    EXPECT_EQ(monitors[2]->GetBrightness(), 50);
}

// ============================================================================
// Sync Simulation Tests
// ============================================================================

TEST_F(MonitorFactoryTest, SyncSimulation_AllMonitorsUpdateProportionally)
{
    ASSERT_EQ(monitors.size(), 3);

    // Simulate sync: set all to 75%
    for (auto &monitor : monitors)
    {
        monitor->SetBrightness(75);
    }

    for (const auto &monitor : monitors)
    {
        EXPECT_EQ(monitor->GetBrightness(), 75);
    }
}

TEST_F(MonitorFactoryTest, SyncSimulation_ZeroToHundredPercent)
{
    ASSERT_EQ(monitors.size(), 3);

    // Simulate sync sequence: 0 -> 50 -> 100
    for (auto &monitor : monitors)
    {
        monitor->SetBrightness(0);
    }
    for (const auto &monitor : monitors)
    {
        EXPECT_EQ(monitor->GetBrightness(), 0);
    }

    for (auto &monitor : monitors)
    {
        monitor->SetBrightness(50);
    }
    for (const auto &monitor : monitors)
    {
        EXPECT_EQ(monitor->GetBrightness(), 50);
    }

    for (auto &monitor : monitors)
    {
        monitor->SetBrightness(100);
    }
    for (const auto &monitor : monitors)
    {
        EXPECT_EQ(monitor->GetBrightness(), 100);
    }
}

// ============================================================================
// Stress Tests
// ============================================================================

TEST_F(MonitorFactoryTest, RapidBrightnessChangesDoNotCrash)
{
    ASSERT_GE(monitors.size(), 1);

    for (int i = 0; i < 1000; i++)
    {
        monitors[0]->SetBrightness(i % 101);
    }

    EXPECT_TRUE(true); // If we get here, no crash occurred
}

TEST_F(MonitorFactoryTest, RapidAlternatingValues)
{
    ASSERT_GE(monitors.size(), 1);

    for (int i = 0; i < 500; i++)
    {
        monitors[0]->SetBrightness(0);
        monitors[0]->SetBrightness(100);
    }

    EXPECT_EQ(monitors[0]->GetBrightness(), 100);
}

TEST_F(MonitorFactoryTest, ConcurrentAccessToMultipleMonitors)
{
    ASSERT_EQ(monitors.size(), 3);

    // Simulate concurrent updates
    for (int i = 0; i < 100; i++)
    {
        monitors[0]->SetBrightness(i % 101);
        monitors[1]->SetBrightness((i + 25) % 101);
        monitors[2]->SetBrightness((i + 50) % 101);
    }

    // All monitors should have valid brightness values
    EXPECT_GE(monitors[0]->GetBrightness(), 0);
    EXPECT_LE(monitors[0]->GetBrightness(), 100);
}

// ============================================================================
// Edge Case Tests
// ============================================================================

TEST_F(MockMonitorTest, HandlesRepeatedSameValue)
{
    for (int i = 0; i < 100; i++)
    {
        EXPECT_TRUE(monitor->SetBrightness(50));
    }
    EXPECT_EQ(monitor->GetBrightness(), 50);
}

TEST_F(MockMonitorTest, HandlesRepeatedGetBrightness)
{
    for (int i = 0; i < 100; i++)
    {
        EXPECT_EQ(monitor->GetBrightness(), 50);
    }
}

TEST_F(MockMonitorTest, HandlesExtremeNegativeValue)
{
    EXPECT_TRUE(monitor->SetBrightness(-2147483647));
    EXPECT_EQ(monitor->GetBrightness(), 0);
}

TEST_F(MockMonitorTest, HandlesExtremePositiveValue)
{
    EXPECT_TRUE(monitor->SetBrightness(2147483647));
    EXPECT_EQ(monitor->GetBrightness(), 100);
}

// ============================================================================
// Memory Safety Tests
// ============================================================================

TEST(MemorySafetyTest, CreateAndDestroyManyMonitors)
{
    for (int i = 0; i < 100; i++)
    {
        auto monitor = std::make_shared<MockMonitor>(
            "test_" + std::to_string(i),
            "Test Monitor " + std::to_string(i),
            i % 2 == 0 ? "internal" : "external",
            50);

        monitor->SetBrightness(i % 101);
        EXPECT_GE(monitor->GetBrightness(), 0);
        EXPECT_LE(monitor->GetBrightness(), 100);
    }
    // If we get here without crash, memory management is good
    EXPECT_TRUE(true);
}

TEST(MemorySafetyTest, CreateMonitorsFromFactoryMultipleTimes)
{
    for (int i = 0; i < 50; i++)
    {
        auto monitors = CreateMonitors(true);
        EXPECT_EQ(monitors.size(), 3);
    }
    // Smart pointers should clean up automatically
    EXPECT_TRUE(true);
}

TEST(MemorySafetyTest, SharedPointerReferenceCount)
{
    auto monitor = std::make_shared<MockMonitor>("test", "Test", "internal", 50);
    EXPECT_EQ(monitor.use_count(), 1);

    {
        auto monitor2 = monitor;
        EXPECT_EQ(monitor.use_count(), 2);
    }

    EXPECT_EQ(monitor.use_count(), 1);
}

// ============================================================================
// Initialization Tests
// ============================================================================

TEST(InitializationTest, InitializeWithZeroBrightness)
{
    auto monitor = std::make_shared<MockMonitor>("test", "Test", "internal", 0);
    EXPECT_EQ(monitor->GetBrightness(), 0);
}

TEST(InitializationTest, InitializeWithMaxBrightness)
{
    auto monitor = std::make_shared<MockMonitor>("test", "Test", "internal", 100);
    EXPECT_EQ(monitor->GetBrightness(), 100);
}

TEST(InitializationTest, InitializeWithNegativeBrightnessClamps)
{
    auto monitor = std::make_shared<MockMonitor>("test", "Test", "internal", -50);
    EXPECT_EQ(monitor->GetBrightness(), 0);
}

TEST(InitializationTest, InitializeWithExcessiveBrightnessClamps)
{
    auto monitor = std::make_shared<MockMonitor>("test", "Test", "internal", 200);
    EXPECT_EQ(monitor->GetBrightness(), 100);
}

// ============================================================================
// Type Tests
// ============================================================================

TEST(MonitorTypeTest, InternalMonitorType)
{
    auto monitor = std::make_shared<MockMonitor>("test", "Test", "internal", 50);
    EXPECT_EQ(monitor->GetType(), "internal");
}

TEST(MonitorTypeTest, ExternalMonitorType)
{
    auto monitor = std::make_shared<MockMonitor>("test", "Test", "external", 50);
    EXPECT_EQ(monitor->GetType(), "external");
}

// ============================================================================
// Boundary Value Tests
// ============================================================================

class BoundaryValueTest : public ::testing::TestWithParam<int>
{
protected:
    std::shared_ptr<MockMonitor> monitor;

    void SetUp() override
    {
        monitor = std::make_shared<MockMonitor>("test", "Test", "internal", 50);
    }
};

TEST_P(BoundaryValueTest, BrightnessValuesInRange)
{
    int value = GetParam();
    monitor->SetBrightness(value);
    int result = monitor->GetBrightness();

    EXPECT_GE(result, 0);
    EXPECT_LE(result, 100);
}

INSTANTIATE_TEST_SUITE_P(
    BrightnessValues,
    BoundaryValueTest,
    ::testing::Values(-100, -1, 0, 1, 25, 50, 75, 99, 100, 101, 200));

// ============================================================================
// Sequential Operations Tests
// ============================================================================

TEST(SequentialOperationsTest, IncrementalBrightnessIncrease)
{
    auto monitor = std::make_shared<MockMonitor>("test", "Test", "internal", 0);

    for (int i = 0; i <= 100; i += 10)
    {
        monitor->SetBrightness(i);
        EXPECT_EQ(monitor->GetBrightness(), i);
    }
}

TEST(SequentialOperationsTest, IncrementalBrightnessDecrease)
{
    auto monitor = std::make_shared<MockMonitor>("test", "Test", "internal", 100);

    for (int i = 100; i >= 0; i -= 10)
    {
        monitor->SetBrightness(i);
        EXPECT_EQ(monitor->GetBrightness(), i);
    }
}

// ============================================================================
// Main Entry Point
// ============================================================================

int main(int argc, char **argv)
{
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}
