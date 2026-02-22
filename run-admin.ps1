# BrightSync - Run with Administrator Privileges
# This script builds and runs BrightSync with elevated privileges for WMI brightness control

$Host.UI.RawUI.WindowTitle = "BrightSync (Admin Mode)"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  BrightSync - Admin Mode Launcher" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "[!] Not running as Administrator" -ForegroundColor Yellow
    Write-Host "[!] Requesting elevation..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please accept the UAC prompt to continue." -ForegroundColor White
    Write-Host "A new admin window will open." -ForegroundColor White
    Write-Host ""
    
    # Restart script with admin rights
    $scriptPath = $MyInvocation.MyCommand.Path
    try {
        Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`"" -Verb RunAs
        Write-Host "Admin window launched. You can close this window." -ForegroundColor Green
    }
    catch {
        Write-Host "[ERROR] Failed to request elevation: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Press any key to exit..."
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
    exit
}

Write-Host "[OK] Running with Administrator privileges" -ForegroundColor Green
Write-Host ""

# Change to the project directory
$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectDir

Write-Host "Project Directory: $projectDir" -ForegroundColor Gray
Write-Host ""

Write-Host "[1/2] Building project..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Build successful" -ForegroundColor Green
    Write-Host ""
    Write-Host "[2/2] Starting BrightSync..." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  App is running with admin rights" -ForegroundColor Green
    Write-Host "  Internal display control enabled" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    
    npm start
    
    Write-Host ""
    Write-Host "BrightSync closed." -ForegroundColor Yellow
}
else {
    Write-Host "[ERROR] Build failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
