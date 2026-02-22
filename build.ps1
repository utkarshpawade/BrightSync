# Build Script for BrightSync
# This script helps automate the build process

Write-Host "BrightSync Build Script" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "ERROR: Node.js not found. Please install Node.js 18+ first." -ForegroundColor Red
    exit 1
}
Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
Write-Host ""

# Check if dependencies are installed
Write-Host "Checking dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
}
Write-Host "Dependencies OK" -ForegroundColor Green
Write-Host ""

# Clean previous builds
Write-Host "Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
}
if (Test-Path "build/Release") {
    Remove-Item -Recurse -Force "build/Release"
}
Write-Host "Clean complete" -ForegroundColor Green
Write-Host ""

# Build TypeScript
Write-Host "Building TypeScript..." -ForegroundColor Yellow
npm run build:ts
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: TypeScript build failed" -ForegroundColor Red
    exit 1
}
Write-Host "TypeScript build complete" -ForegroundColor Green
Write-Host ""

# Build Native Addon
Write-Host "Building native addon..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Gray
npm run build:native
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Native addon build failed" -ForegroundColor Red
    Write-Host "Make sure Visual Studio Build Tools are installed" -ForegroundColor Yellow
    exit 1
}
Write-Host "Native addon build complete" -ForegroundColor Green
Write-Host ""

# Verify build outputs
Write-Host "Verifying build outputs..." -ForegroundColor Yellow
$allGood = $true

if (-not (Test-Path "dist/main/main.js")) {
    Write-Host "ERROR: Main process not built" -ForegroundColor Red
    $allGood = $false
}

if (-not (Test-Path "dist/preload/preload.js")) {
    Write-Host "ERROR: Preload script not built" -ForegroundColor Red
    $allGood = $false
}

if (-not (Test-Path "build/Release/brightness.node")) {
    Write-Host "ERROR: Native addon not built" -ForegroundColor Red
    $allGood = $false
}

if ($allGood) {
    Write-Host "All build outputs verified" -ForegroundColor Green
} else {
    Write-Host "Some build outputs are missing" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Build Complete!" -ForegroundColor Green
Write-Host "===============" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  - Run application:     npm start" -ForegroundColor White
Write-Host "  - Create installer:    npm run dist" -ForegroundColor White
Write-Host "  - Development mode:    npm run dev" -ForegroundColor White
Write-Host ""
