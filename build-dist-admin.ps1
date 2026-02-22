# BrightSync - Build Distribution with Administrator Privileges
# This script builds the distributable .exe with elevated privileges

$Host.UI.RawUI.WindowTitle = "BrightSync - Build Distribution (Admin Mode)"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  BrightSync - Distribution Builder" -ForegroundColor Cyan
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

Write-Host "Building distributable..." -ForegroundColor Cyan
Write-Host ""

npm run dist

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "  Build Successful!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your .exe installer is located in:" -ForegroundColor White
    Write-Host "  build\" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Red
    Write-Host "  Build Failed!" -ForegroundColor Red
    Write-Host "============================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Exit code: $LASTEXITCODE" -ForegroundColor Red
    Write-Host ""
}

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
