/**
 * Test Monitor Detection Script
 *
 * This script tests monitor detection and brightness control
 * to help diagnose why laptop brightness isn't working
 */

const path = require("path");

// Load the native addon
let addon;
try {
  addon = require("./build/Release/brightness.node");
  console.log("✓ Successfully loaded native addon\n");
} catch (error) {
  console.error("✗ Failed to load native addon:", error.message);
  console.error("  Build the addon first with: npm run build");
  process.exit(1);
}

// Test function
async function testMonitors() {
  console.log("=".repeat(60));
  console.log("  BrightSync - Monitor Detection Test");
  console.log("=".repeat(60));
  console.log();

  try {
    // Get all monitors
    console.log("1. Getting monitors...");
    const monitors = addon.getMonitors();
    console.log(`   Found ${monitors.length} monitor(s)\n`);

    if (monitors.length === 0) {
      console.log("✗ No monitors detected!");
      console.log("  This is unexpected. Try running as administrator.");
      return;
    }

    // Display monitor details
    console.log("2. Monitor Details:");
    console.log("-".repeat(60));
    monitors.forEach((monitor, index) => {
      console.log(`   Monitor ${index + 1}:`);
      console.log(`     ID:      ${monitor.id}`);
      console.log(`     Name:    ${monitor.name}`);
      console.log(`     Type:    ${monitor.type}`);
      console.log(`     Current: ${monitor.current}%`);
      console.log(`     Range:   ${monitor.min}% - ${monitor.max}%`);
      console.log();
    });

    // Find internal monitor
    const internalMonitor = monitors.find((m) => m.type === "internal");

    if (!internalMonitor) {
      console.log("⚠ WARNING: No internal monitor detected!");
      console.log("  Your laptop display was not detected.");
      console.log("  Possible reasons:");
      console.log("    - Not running on a laptop");
      console.log("    - WMI permissions issue");
      console.log("    - Display driver issue");
      console.log();
    } else {
      console.log("✓ Internal monitor detected!");
      console.log(`  Current brightness: ${internalMonitor.current}%\n`);

      // Test getting brightness
      console.log("3. Testing brightness control...");
      console.log("-".repeat(60));

      const currentBrightness = addon.getBrightness(internalMonitor.id);
      console.log(`   Current brightness: ${currentBrightness}%`);

      // Test setting brightness
      console.log(`   Attempting to change brightness...`);

      // Save current value
      const originalBrightness = currentBrightness;

      // Try setting to a different value (increase by 5%)
      const testBrightness = Math.min(100, currentBrightness + 5);
      console.log(`   Setting brightness to ${testBrightness}%...`);

      const setResult = addon.setBrightness(internalMonitor.id, testBrightness);

      if (setResult) {
        console.log("   ✓ setBrightness() returned success");

        // Wait a moment and verify
        await new Promise((resolve) => setTimeout(resolve, 500));

        const newBrightness = addon.getBrightness(internalMonitor.id);
        console.log(`   New brightness value: ${newBrightness}%`);

        if (newBrightness === testBrightness) {
          console.log("   ✓ Brightness change SUCCESSFUL!");
        } else {
          console.log("   ✗ Brightness did not change as expected");
          console.log("     This suggests a permission or driver issue");
        }

        // Restore original brightness
        console.log(`   Restoring brightness to ${originalBrightness}%...`);
        addon.setBrightness(internalMonitor.id, originalBrightness);
      } else {
        console.log("   ✗ setBrightness() FAILED");
        console.log("     Possible causes:");
        console.log("       - WMI service not available");
        console.log("       - Insufficient permissions (try running as admin)");
        console.log("       - Display driver issue");
        console.log("       - Brightness control not supported by hardware");
      }
    }

    // Check external monitors
    const externalMonitors = monitors.filter((m) => m.type === "external");
    if (externalMonitors.length > 0) {
      console.log();
      console.log("4. External Monitors:");
      console.log("-".repeat(60));
      externalMonitors.forEach((monitor) => {
        console.log(`   ${monitor.name}:`);
        if (monitor.current >= 0) {
          console.log(`     DDC/CI: Supported`);
          console.log(`     Brightness: ${monitor.current}%`);
        } else {
          console.log(
            `     DDC/CI: Not supported (this is normal for your monitor)`,
          );
        }
      });
    }

    console.log();
    console.log("=".repeat(60));
    console.log("Test complete!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("✗ Test failed:", error);
    console.error(error.stack);
  }
}

// Run the test
testMonitors();
