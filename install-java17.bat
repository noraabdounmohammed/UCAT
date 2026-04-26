@echo off
echo ========================================
echo   Java 17 Installation for Android
echo ========================================
echo.

:: Check for admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo This script needs Administrator privileges.
    echo.
    echo Please:
    echo 1. Right-click on this file
    echo 2. Select "Run as Administrator"
    echo.
    pause
    exit /b 1
)

echo Running with Administrator privileges...
echo.

:: Download Java 17
echo Downloading Java 17 (Temurin)...
echo This will take a few minutes (180 MB download)...
echo.

powershell -Command "& {$ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri 'https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.13%%2B11/OpenJDK17U-jdk_x64_windows_hotspot_17.0.13_11.msi' -OutFile '%TEMP%\OpenJDK17-installer.msi'}"

if %errorLevel% neq 0 (
    echo.
    echo Download failed!
    echo Please download manually from: https://adoptium.net/temurin/releases/
    echo.
    pause
    exit /b 1
)

echo Download complete!
echo.

:: Install Java 17
echo Installing Java 17...
echo This will take 2-3 minutes...
echo.

msiexec /i "%TEMP%\OpenJDK17-installer.msi" /quiet /norestart ADDLOCAL=FeatureMain,FeatureEnvironment,FeatureJarFileRunWith,FeatureJavaHome INSTALLDIR="C:\Program Files\Eclipse Adoptium\jdk-17.0.13.11-hotspot\"

if %errorLevel% neq 0 (
    echo.
    echo Installation failed!
    echo Please install manually from: https://adoptium.net/temurin/releases/
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Installation Complete!
echo ========================================
echo.
echo Next Steps:
echo 1. Close this window
echo 2. Close and reopen your terminal/IDE
echo 3. Verify: java -version
echo 4. Build your Android app!
echo.
echo To build Android APK:
echo   cd android
echo   .\gradlew.bat assembleDebug
echo.
pause
