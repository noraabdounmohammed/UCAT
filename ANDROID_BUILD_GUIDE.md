# 📱 Android App Build Guide

## ❌ Current Issue
Your system has **Java 8** but Android requires **Java 11 or newer**.

## ✅ Solution Options

### **Option 1: Install Java 11+ (Recommended)**

**Download Java 17 (LTS):**
1. Visit: https://adoptium.net/
2. Download **Temurin JDK 17** for Windows x64
3. Run installer with default settings
4. Restart terminal/IDE

**Verify Installation:**
```bash
java -version
# Should show: openjdk version "17.0.x"
```

**Then build APK:**
```bash
cd android
.\gradlew.bat assembleDebug
```

---

### **Option 2: Install Android Studio (Easiest)**

**Why Android Studio?**
- Includes correct Java version
- Visual build tools
- Easy device testing
- APK signing tools
- No command line needed

**Steps:**
1. Download: https://developer.android.com/studio
2. Install with default settings (includes Java)
3. Open Android Studio
4. File → Open → Select: `C:\Users\Nora\Desktop\Educate\UCAT-ukmla\android`
5. Wait for Gradle sync (5-10 min first time)
6. Click green play button ▶️ or Build → Build APK

---

## 📦 What You'll Get

### **Debug APK (for testing):**
- Location: `android/app/build/outputs/apk/debug/app-debug.apk`
- Can install on any Android device
- Not for Play Store (not signed)

### **Release APK (for Play Store):**
- Requires signing key
- Optimized and minified
- Ready for distribution

---

## 🚀 After Building

### **Install on Android Device:**

**Method 1: USB Cable**
```bash
# Enable USB debugging on phone
# Connect phone to computer
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

**Method 2: Direct Transfer**
1. Copy APK to phone (email, USB, cloud)
2. Open APK on phone
3. Allow "Install from unknown sources"
4. Install app

**Method 3: Android Studio**
1. Connect phone via USB
2. Click green play button ▶️
3. Select your device
4. App installs and runs automatically

---

## 🎯 Current Status

### **✅ What's Ready:**
- Capacitor configured
- Android project created
- Web assets synced
- Plugins installed
- App ID: com.medicu.app
- App Name: Medicu

### **⏳ What's Needed:**
- Java 11+ installed
- OR Android Studio installed
- Then build APK

---

## 🔧 Build Commands Reference

### **Debug Build (Testing):**
```bash
cd android
.\gradlew.bat assembleDebug
```

### **Release Build (Play Store):**
```bash
cd android
.\gradlew.bat assembleRelease
```

### **Clean Build:**
```bash
cd android
.\gradlew.bat clean
.\gradlew.bat assembleDebug
```

---

## 📱 Testing Your App

### **What to Test:**
- ✅ App launches
- ✅ All pages load
- ✅ Navigation works
- ✅ Supabase auth works
- ✅ Offline functionality
- ✅ Splash screen shows
- ✅ Status bar styling
- ✅ Back button behavior

### **Known Differences from Web:**
- Native navigation (back button)
- Native keyboard
- Native file picker
- Better performance
- Native splash screen

---

## 🎨 Customizing Your App

### **App Icon:**
Replace icons in: `android/app/src/main/res/mipmap-*/`
- mdpi: 48x48
- hdpi: 72x72
- xhdpi: 96x96
- xxhdpi: 144x144
- xxxhdpi: 192x192

### **Splash Screen:**
Replace: `android/app/src/main/res/drawable*/splash.png`

### **App Name:**
Edit: `android/app/src/main/res/values/strings.xml`

### **Colors:**
Edit: `android/app/src/main/res/values/styles.xml`

---

## 🚀 Next Steps

**Immediate:**
1. Install Java 17 OR Android Studio
2. Build debug APK
3. Test on Android device

**For Play Store:**
1. Create signing key
2. Build release APK
3. Create Play Console account ($25)
4. Upload APK
5. Submit for review

---

## 💡 Quick Decision

**If you want to:**
- **Just test quickly** → Install Java 17, build APK
- **Develop & debug** → Install Android Studio
- **Deploy to Play Store** → Need Android Studio anyway

**Recommendation:** Install Android Studio (it's the full solution)

---

## 📞 Need Help?

**Common Issues:**
- "Java version wrong" → Install Java 17
- "Gradle sync failed" → Check internet, wait longer
- "APK not installing" → Enable unknown sources
- "App crashes" → Check Android logs (adb logcat)

**Resources:**
- Android Studio: https://developer.android.com/studio
- Java 17: https://adoptium.net/
- Capacitor Docs: https://capacitorjs.com/docs/android
