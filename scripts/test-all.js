/**
 * Master Test Runner
 *
 * Runs all test suites (C++, TypeScript, Integration, Stress)
 * Collects results and generates summary report
 * Returns appropriate exit codes for CI/CD integration
 */

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

// Test suite configurations
const testSuites = [
  {
    name: "C++ Native Tests",
    command: "ctest",
    args: ["--test-dir", "native/tests/build", "--output-on-failure"],
    cwd: process.cwd(),
    enabled: true,
    optional: true, // May not be built yet
  },
  {
    name: "TypeScript Unit Tests",
    command: "npm",
    args: [
      "test",
      "--",
      "--testPathPattern=sync_algorithm|edge_cases",
      "--verbose",
    ],
    cwd: process.cwd(),
    enabled: true,
    optional: false,
  },
  {
    name: "IPC Communication Tests",
    command: "npm",
    args: ["test", "--", "--testPathPattern=ipc.test", "--verbose"],
    cwd: process.cwd(),
    enabled: true,
    optional: false,
  },
  {
    name: "Integration Tests",
    command: "npm",
    args: ["test", "--", "--testPathPattern=integration.test", "--verbose"],
    cwd: process.cwd(),
    enabled: true,
    optional: false,
  },
  {
    name: "Stress Tests",
    command: "npm",
    args: ["test", "--", "--testPathPattern=stress.test", "--verbose"],
    cwd: process.cwd(),
    enabled: true,
    optional: false,
  },
];

// Test result tracking
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  duration: 0,
  suites: [],
};

/**
 * Print colored console message
 */
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Print test suite header
 */
function printHeader(title) {
  const line = "=".repeat(80);
  log(`\n${line}`, colors.cyan);
  log(`  ${title}`, colors.bright + colors.cyan);
  log(`${line}`, colors.cyan);
}

/**
 * Print summary section
 */
function printSummary() {
  printHeader("TEST SUMMARY");

  results.suites.forEach((suite) => {
    const statusColor =
      suite.status === "passed"
        ? colors.green
        : suite.status === "failed"
          ? colors.red
          : suite.status === "skipped"
            ? colors.yellow
            : colors.reset;
    const statusIcon =
      suite.status === "passed"
        ? "✓"
        : suite.status === "failed"
          ? "✗"
          : suite.status === "skipped"
            ? "○"
            : "?";

    log(`${statusIcon} ${suite.name}`, statusColor);
    if (suite.error) {
      log(`  Error: ${suite.error}`, colors.red);
    }
    if (suite.duration) {
      log(`  Duration: ${suite.duration}ms`, colors.reset);
    }
  });

  log("");
  log("─".repeat(80), colors.cyan);
  log(`Total Suites: ${results.total}`, colors.bright);
  log(`Passed: ${results.passed}`, colors.green);
  log(
    `Failed: ${results.failed}`,
    results.failed > 0 ? colors.red : colors.reset,
  );
  log(
    `Skipped: ${results.skipped}`,
    results.skipped > 0 ? colors.yellow : colors.reset,
  );
  log(`Total Duration: ${results.duration}ms`, colors.reset);
  log("─".repeat(80), colors.cyan);
  log("");

  if (results.failed > 0) {
    log("❌ TESTS FAILED", colors.bright + colors.red);
    return 1;
  } else if (results.passed === 0 && results.skipped === results.total) {
    log("⚠️  ALL TESTS SKIPPED", colors.bright + colors.yellow);
    return 0;
  } else {
    log("✅ ALL TESTS PASSED", colors.bright + colors.green);
    return 0;
  }
}

/**
 * Run a single test suite
 */
async function runTestSuite(suite) {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const suiteResult = {
      name: suite.name,
      status: "unknown",
      duration: 0,
      error: null,
    };

    log(`\n▶ Running: ${suite.name}`, colors.blue);

    const proc = spawn(suite.command, suite.args, {
      cwd: suite.cwd,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      const text = data.toString();
      stdout += text;
      process.stdout.write(text);
    });

    proc.stderr.on("data", (data) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(text);
    });

    proc.on("error", (error) => {
      suiteResult.status = suite.optional ? "skipped" : "failed";
      suiteResult.error = error.message;
      suiteResult.duration = Date.now() - startTime;

      if (suite.optional) {
        log(
          `○ Skipped: ${suite.name} (optional suite not available)`,
          colors.yellow,
        );
        results.skipped++;
      } else {
        log(`✗ Failed: ${suite.name}`, colors.red);
        log(`  Error: ${error.message}`, colors.red);
        results.failed++;
      }

      results.total++;
      results.duration += suiteResult.duration;
      results.suites.push(suiteResult);
      resolve();
    });

    proc.on("close", (code) => {
      suiteResult.duration = Date.now() - startTime;

      if (code === 0) {
        suiteResult.status = "passed";
        log(
          `✓ Passed: ${suite.name} (${suiteResult.duration}ms)`,
          colors.green,
        );
        results.passed++;
      } else {
        if (
          suite.optional &&
          (stderr.includes("not found") || stderr.includes("cannot find"))
        ) {
          suiteResult.status = "skipped";
          suiteResult.error = "Test suite not built or not available";
          log(
            `○ Skipped: ${suite.name} (optional suite not available)`,
            colors.yellow,
          );
          results.skipped++;
        } else {
          suiteResult.status = "failed";
          suiteResult.error = `Exit code ${code}`;
          log(`✗ Failed: ${suite.name}`, colors.red);
          results.failed++;
        }
      }

      results.total++;
      results.duration += suiteResult.duration;
      results.suites.push(suiteResult);
      resolve();
    });
  });
}

/**
 * Check prerequisites
 */
function checkPrerequisites() {
  printHeader("CHECKING PREREQUISITES");

  const checks = [
    { name: "package.json", path: "package.json" },
    { name: "jest.config.js", path: "jest.config.js" },
    { name: "TypeScript tests", path: "src/tests" },
  ];

  let allOk = true;

  checks.forEach((check) => {
    const exists = fs.existsSync(path.join(process.cwd(), check.path));
    if (exists) {
      log(`✓ ${check.name}`, colors.green);
    } else {
      log(`✗ ${check.name} not found`, colors.red);
      allOk = false;
    }
  });

  // Check optional C++ tests
  const cppTestsBuilt = fs.existsSync(
    path.join(process.cwd(), "native/tests/build"),
  );
  if (cppTestsBuilt) {
    log(`✓ C++ tests built`, colors.green);
  } else {
    log(`○ C++ tests not built (will be skipped)`, colors.yellow);
  }

  log("");
  return allOk;
}

/**
 * Main execution
 */
async function main() {
  const startTime = Date.now();

  printHeader("BRIGHTSYNC - MASTER TEST RUNNER");

  // Check prerequisites
  if (!checkPrerequisites()) {
    log("❌ Prerequisites check failed", colors.red);
    process.exit(1);
  }

  // Run all enabled test suites
  for (const suite of testSuites) {
    if (suite.enabled) {
      await runTestSuite(suite);
    }
  }

  // Print summary
  const exitCode = printSummary();

  // Write JSON report for CI/CD
  const report = {
    timestamp: new Date().toISOString(),
    duration: results.duration,
    summary: {
      total: results.total,
      passed: results.passed,
      failed: results.failed,
      skipped: results.skipped,
    },
    suites: results.suites,
  };

  const reportPath = path.join(process.cwd(), "test-results.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`\n📊 Test report written to: ${reportPath}`, colors.cyan);

  process.exit(exitCode);
}

// Run
main().catch((error) => {
  log(`\n❌ Fatal error: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
