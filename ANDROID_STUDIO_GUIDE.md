# 🤖 Android Studio Installation & Build Guide

## Step 1: Install Android Studio

### **Automated Installation:**

Run this PowerShell script as Administrator:
```powershell
.\install-android-studio.ps1
```

This will:
- Download Android Studio (~1.1 GB)
- Launch the installer
- Guide you through setup

**Time required:** 20-30 minutes total
- Download: 5-15 minutes (depending on internet)
- Installation: 10-15 minutes
- First-time setup: 5-10 minutes

---

### **Manual Installation (Alternative):**

1. **Visit:** https://developer.android.com/studio
2. **Click:** "Download Android Studio"
3. **Run** the downloaded installer
4. **Follow** the setup wizard with default settings

---

## Step 2: First-Time Setup

When you launch Android Studio for the first time:

1. **Welcome Screen:**
   - Click "Next"

2. **Install Type:**
   - Select "Standard" (recommended)
   - Click "Next"

3. **UI Theme:**
   - Choose Light or Dark
   - Click "Next"

4. **Verify Settings:**
   - Review installation locations
   - Click "Next"

5. **Download Components:**
   - Android Studio will download SDK components (~2-3 GB)
   - This takes 5-10 minutes
   - Wait for "Finish" button to appear
   - Click "Finish"

---

## Step 3: Open Your Project

Once Android Studio setup is complete:

```bash
# Navigate to your project
cd C:\Users\Nora\Desktop\Educate\UCAT-ukmla

# Open Android project in Android Studio
npx cap open android
```

This will:
- Launch Android Studio
- Open your android/ folder
- Start Gradle sync automatically

**Wait for Gradle sync to complete** (5-10 minutes first time)
- Progress shown in bottom status bar
- Don't click anything during sync

---

## Step 4: Build Your APK

Once Gradle sync is complete:

### **Method 1: Build APK (for testing)**

1. Click **Build** menu
2. Select **Build Bundle(s) / APK(s)**
3. Click **Build APK(s)**
4. Wait 2-5 minutes
5. Click **locate** link when build completes

**APK location:**
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### **Method 2: Run on Device (direct install)**

1. Connect Android phone via USB
2. Enable USB debugging on phone
3. Click green play button ▶️ in Android Studio
4. Select your device
5. App installs and launches automatically

---

## Step 5: Install APK on Phone

### **USB Method:**
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### **Direct Transfer:**
1. Copy APK to phone
2. Open APK file on phone
3. Allow "Install from unknown sources"
4. Install and launch!

---

## 🎯 Quick Reference

### **Installation Commands:**
```powershell
# Install Android Studio
.\install-android-studio.ps1

# Open project in Android Studio
npx cap open android
```

### **Build Commands (after Android Studio is set up):**
```bash
# Build web app
npm run build

# Sync to Android
npx cap sync android

# Open in Android Studio
npx cap open android

# Then use Android Studio GUI to build APK
```

---

## 📱 What You're Building

Your APK will include:
- ✅ Full Medicu app functionality
- ✅ Offline support (PWA)
- ✅ Native splash screen
- ✅ Status bar styling
- ✅ Native performance
- ✅ ~15-20 MB app size

---

## 🚨 Troubleshooting

### **"Gradle sync failed":**
- Check internet connection
- Wait longer (first sync downloads ~500MB)
- Try: File → Invalidate Caches → Restart

### **"SDK not found":**
- Android Studio should install SDK automatically
- Check: Tools → SDK Manager
- Ensure Android SDK is installed

### **"Build failed":**
- Make sure Gradle sync completed successfully
- Try: Build → Clean Project
- Then: Build → Build APK

### **"APK won't install on phone":**
- Enable "Install from unknown sources"
- Settings → Security → Unknown sources
- Or: Settings → Apps → Special access → Install unknown apps

---

## ⏱️ Timeline

**Total time to first APK:** ~30-45 minutes

- ✅ Java 17 installed: **Done!**
- ⏳ Download Android Studio: 5-15 min
- ⏳ Install Android Studio: 10-15 min
- ⏳ First-time setup: 5-10 min
- ⏳ Open project & Gradle sync: 5-10 min
- ⏳ Build APK: 2-5 min

---

## 🎉 After Building

Once you have your APK:
1. ✅ Test on Android device
2. ✅ Take screenshots for Play Store
3. ✅ Create app icon (1024x1024)
4. ✅ Write app description
5. ✅ Submit to Google Play Store ($25)

---

## 💡 Tips

- **First build takes longest** - subsequent builds are faster
- **Keep Android Studio updated** - check for updates regularly
- **Use live reload for development:**
  ```bash
  npx cap run android --livereload
  ```
- **Check logs if app crashes:**
  ```bash
  adb logcat
  ```

---

## 📞 Need Help?

**Common Issues:**
- Gradle sync stuck → Wait longer, check internet
- Build errors → Clean project, rebuild
- APK won't install → Enable unknown sources
- App crashes → Check adb logcat logs

**Resources:**
- Android Studio: https://developer.android.com/studio
- Capacitor Docs: https://capacitorjs.com/docs/android
- Stack Overflow: https://stackoverflow.com/questions/tagged/android-studio

---

**Ready to install? Run the script and follow the steps!** 🚀
