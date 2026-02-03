# 🚀 Quick Start: Install Java & Build Android APK

## Step 1: Install Java 17 (Required)

### **Automated Installation (Easiest):**

**Run this PowerShell script as Administrator:**

1. **Right-click on PowerShell** and select "Run as Administrator"
2. **Navigate to project folder:**
   ```powershell
   cd "C:\Users\Nora\Desktop\Educate\UCAT-ukmla"
   ```
3. **Run the installation script:**
   ```powershell
   .\install-java17.ps1
   ```
4. **Wait 3-5 minutes** for download and installation
5. **Close and reopen terminal** after installation

---

### **Manual Installation (Alternative):**

If the script doesn't work:

1. **Visit:** https://adoptium.net/temurin/releases/
2. **Select:**
   - Version: **17 - LTS**
   - Operating System: **Windows**
   - Architecture: **x64**
   - Package Type: **JDK**
3. **Download** the .msi installer (~180 MB)
4. **Run installer** with default settings
5. **Check:** "Set JAVA_HOME variable" during installation
6. **Restart terminal** after installation

---

## Step 2: Verify Java Installation

**Open a NEW terminal and run:**
```bash
java -version
```

**Expected output:**
```
openjdk version "17.0.x"
OpenJDK Runtime Environment Temurin-17.0.x
```

If you still see Java 8, restart your computer.

---

## Step 3: Build Android APK

**Once Java 17 is installed:**

```bash
# Navigate to android folder
cd android

# Build debug APK
.\gradlew.bat assembleDebug
```

**Build time:** 2-5 minutes (first build takes longer)

**Output location:**
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Step 4: Install on Android Device

### **Method 1: USB Cable**

1. **Enable USB Debugging** on your phone:
   - Settings → About Phone → Tap "Build Number" 7 times
   - Settings → Developer Options → Enable "USB Debugging"

2. **Connect phone** to computer via USB

3. **Install APK:**
   ```bash
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```

### **Method 2: Direct Transfer**

1. **Copy APK** to your phone (email, USB, cloud)
2. **Open APK** on phone
3. **Allow** "Install from unknown sources" if prompted
4. **Install** and launch!

---

## 🎯 Quick Commands

```bash
# Full build process
npm run build                    # Build web app
npx cap sync android            # Sync to Android
cd android                      # Enter Android folder
.\gradlew.bat assembleDebug     # Build APK

# Install on device
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Check Java version
java -version

# Clean build (if issues)
cd android
.\gradlew.bat clean
.\gradlew.bat assembleDebug
```

---

## 🚨 Troubleshooting

### **"Java version wrong" after installation:**
- Close ALL terminals and IDE
- Reopen terminal
- Run: `java -version`
- If still wrong, restart computer

### **"Gradle sync failed":**
- Check internet connection
- Wait longer (first build downloads ~500MB)
- Try: `.\gradlew.bat clean`

### **"APK won't install on phone":**
- Enable "Install from unknown sources"
- Settings → Security → Unknown sources
- Or: Settings → Apps → Special access → Install unknown apps

### **"Build failed with error":**
- Run: `.\gradlew.bat clean`
- Then: `.\gradlew.bat assembleDebug`
- Check Android version (need 5.1+)

---

## 📱 What You'll Get

Your APK will include:
- ✅ Full web app functionality
- ✅ Offline support (PWA)
- ✅ Native splash screen
- ✅ Status bar styling
- ✅ Native performance
- ✅ ~15-20 MB app size

---

## 🎉 After Building

**Test your app:**
- Launch from phone home screen
- Test all features
- Check offline functionality
- Verify navigation works

**Next steps:**
- Take screenshots for Play Store
- Create app icon (1024x1024)
- Write app description
- Submit to Google Play Store ($25)

---

## 💡 Need Help?

**Common issues:**
- Java 8 still showing → Restart computer
- Gradle errors → Check internet, wait longer
- APK won't install → Enable unknown sources
- App crashes → Check logs: `adb logcat`

**Resources:**
- Java 17: https://adoptium.net/
- Android Studio: https://developer.android.com/studio
- Capacitor Docs: https://capacitorjs.com/docs/android

---

## ✅ Checklist

- [ ] Java 17 installed
- [ ] Terminal restarted
- [ ] `java -version` shows 17.x
- [ ] Web app built (`npm run build`)
- [ ] Synced to Android (`npx cap sync android`)
- [ ] APK built (`.\gradlew.bat assembleDebug`)
- [ ] APK installed on device
- [ ] App tested and working

**You're ready to build! 🚀**
