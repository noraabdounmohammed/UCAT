# Android Studio Installation Script
Write-Host "========================================"
Write-Host "  Android Studio Installation"
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

# Android Studio download URL (latest stable)
$studioUrl = "https://redirector.gvt1.com/edgedl/android/studio/install/2024.2.1.12/android-studio-2024.2.1.12-windows.exe"
$installerPath = "$env:TEMP\android-studio-installer.exe"

Write-Host "Downloading Android Studio..." -ForegroundColor Cyan
Write-Host "Size: ~1.1 GB (this will take 5-15 minutes depending on your internet)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Please be patient, this is a large download..." -ForegroundColor Gray
Write-Host ""

try {
    # Download with progress bar
    $webClient = New-Object System.Net.WebClient
    
    Register-ObjectEvent -InputObject $webClient -EventName DownloadProgressChanged -SourceIdentifier WebClient.DownloadProgressChanged -Action {
        $percent = $EventArgs.ProgressPercentage
        Write-Progress -Activity "Downloading Android Studio" -Status "$percent% Complete" -PercentComplete $percent
    }
    
    Register-ObjectEvent -InputObject $webClient -EventName DownloadFileCompleted -SourceIdentifier WebClient.DownloadFileCompleted
    
    $webClient.DownloadFileAsync($studioUrl, $installerPath)
    
    # Wait for download to complete
    do {
        Start-Sleep -Seconds 1
    } while ($webClient.IsBusy)
    
    Unregister-Event -SourceIdentifier WebClient.DownloadProgressChanged
    Unregister-Event -SourceIdentifier WebClient.DownloadFileCompleted
    $webClient.Dispose()
    
    Write-Host ""
    Write-Host "Download complete!" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Starting Android Studio installer..." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "IMPORTANT: When the installer opens:" -ForegroundColor Yellow
    Write-Host "1. Click 'Next' through all screens" -ForegroundColor White
    Write-Host "2. Accept default installation location" -ForegroundColor White
    Write-Host "3. Select 'Standard' installation type" -ForegroundColor White
    Write-Host "4. Wait for installation to complete (10-15 minutes)" -ForegroundColor White
    Write-Host ""
    Write-Host "The installer will open in a new window..." -ForegroundColor Cyan
    Write-Host ""
    
    Start-Sleep -Seconds 3
    
    # Launch installer (user will interact with it)
    Start-Process -FilePath $installerPath -Wait
    
    Write-Host ""
    Write-Host "========================================"
    Write-Host "  Installation Complete!"
    Write-Host "========================================"
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Launch Android Studio from Start Menu" -ForegroundColor White
    Write-Host "2. Complete first-time setup wizard" -ForegroundColor White
    Write-Host "3. Wait for SDK components to download" -ForegroundColor White
    Write-Host "4. Then run: npx cap open android" -ForegroundColor White
    Write-Host "5. Click Build > Build APK in Android Studio" -ForegroundColor White
    Write-Host ""
    
    # Clean up
    Remove-Item $installerPath -Force -ErrorAction SilentlyContinue
    
} catch {
    Write-Host "Download/Installation failed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual installation:" -ForegroundColor Yellow
    Write-Host "1. Visit: https://developer.android.com/studio" -ForegroundColor White
    Write-Host "2. Click 'Download Android Studio'" -ForegroundColor White
    Write-Host "3. Run the downloaded installer" -ForegroundColor White
    Write-Host "4. Follow the setup wizard" -ForegroundColor White
    Write-Host ""
}

pause
