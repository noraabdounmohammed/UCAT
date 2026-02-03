# Java 17 Installation Script
Write-Host "========================================"
Write-Host "  Java 17 Installation for Android"
Write-Host "========================================"
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "This script needs Administrator privileges." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please right-click PowerShell and select 'Run as Administrator'" -ForegroundColor White
    Write-Host ""
    pause
    exit
}

Write-Host "Running with Administrator privileges" -ForegroundColor Green
Write-Host ""

# Java 17 download URL
$javaUrl = "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.13%2B11/OpenJDK17U-jdk_x64_windows_hotspot_17.0.13_11.msi"
$installerPath = "$env:TEMP\OpenJDK17-installer.msi"

Write-Host "Downloading Java 17..." -ForegroundColor Cyan
Write-Host "Size: ~180 MB" -ForegroundColor Gray
Write-Host ""

try {
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $javaUrl -OutFile $installerPath -UseBasicParsing
    $ProgressPreference = 'Continue'
    
    Write-Host "Download complete!" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Installing Java 17..." -ForegroundColor Cyan
    Write-Host "This will take 2-3 minutes..." -ForegroundColor Gray
    Write-Host ""
    
    # Install silently
    $arguments = "/i `"$installerPath`" /quiet /norestart ADDLOCAL=FeatureMain,FeatureEnvironment,FeatureJarFileRunWith,FeatureJavaHome"
    
    Start-Process "msiexec.exe" -ArgumentList $arguments -Wait -NoNewWindow
    
    Write-Host "Java 17 installed successfully!" -ForegroundColor Green
    Write-Host ""
    
    # Set JAVA_HOME
    Write-Host "Configuring environment variables..." -ForegroundColor Cyan
    $javaHome = "C:\Program Files\Eclipse Adoptium\jdk-17.0.13.11-hotspot"
    
    [System.Environment]::SetEnvironmentVariable("JAVA_HOME", $javaHome, [System.EnvironmentVariableTarget]::Machine)
    
    # Add to PATH
    $currentPath = [System.Environment]::GetEnvironmentVariable("Path", [System.EnvironmentVariableTarget]::Machine)
    if ($currentPath -notlike "*$javaHome\bin*") {
        $newPath = "$javaHome\bin;$currentPath"
        [System.Environment]::SetEnvironmentVariable("Path", $newPath, [System.EnvironmentVariableTarget]::Machine)
    }
    
    Write-Host "Environment variables configured!" -ForegroundColor Green
    Write-Host ""
    
    # Clean up
    Remove-Item $installerPath -Force -ErrorAction SilentlyContinue
    
    Write-Host "========================================"
    Write-Host "  Installation Complete!"
    Write-Host "========================================"
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Close this window" -ForegroundColor White
    Write-Host "2. Close and reopen your terminal" -ForegroundColor White
    Write-Host "3. Verify: java -version" -ForegroundColor White
    Write-Host "4. Build your Android app!" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host "Installation failed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual installation:" -ForegroundColor Yellow
    Write-Host "1. Visit: https://adoptium.net/temurin/releases/" -ForegroundColor White
    Write-Host "2. Download Java 17 MSI installer" -ForegroundColor White
    Write-Host "3. Run installer with default settings" -ForegroundColor White
    Write-Host ""
}

pause
