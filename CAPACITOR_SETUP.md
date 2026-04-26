# 📱 Capacitor Setup Complete - Native App Stores

## ✅ What's Been Installed

### **Capacitor Core:**
- ✅ `@capacitor/core` - Core functionality
- ✅ `@capacitor/cli` - Command line tools
- ✅ `@capacitor/ios` - iOS platform
- ✅ `@capacitor/android` - Android platform

### **Capacitor Plugins:**
- ✅ `@capacitor/splash-screen` - Splash screen support
- ✅ `@capacitor/status-bar` - Status bar customization
- ✅ `@capacitor/app` - App lifecycle events
- ✅ `@capacitor/keyboard` - Keyboard management

### **Project Structure:**
```
UCAT-ukmla/
├── android/          ← Android Studio project
├── ios/              ← Xcode project
├── dist/             ← Built web assets
└── capacitor.config.ts
```

---

## 🎯 App Configuration

### **App Details:**
- **App ID:** `com.medicu.app`
- **App Name:** Medicu
- **Bundle ID (iOS):** com.medicu.app
- **Package Name (Android):** com.medicu.app

### **Theme:**
- **Primary Color:** #1c1917 (stone-900)
- **Background:** #fafaf9 (stone-50)
- **Status Bar:** Dark style
- **Splash Screen:** 2 second duration

---

## 🚀 Build & Deploy Process

### **Step 1: Build Your Web App**
```bash
npm run build
```
This creates the `dist` folder with your optimized app.

### **Step 2: Sync to Native Projects**
```bash
npx cap sync
```
This copies your web assets to iOS and Android projects.

### **Step 3: Open Native IDEs**

**For Android (Windows/Mac/Linux):**
```bash
npx cap open android
```
Opens Android Studio

**For iOS (Mac only):**
```bash
npx cap open ios
```
Opens Xcode

---

## 📱 Android Build Process

### **Requirements:**
- ✅ Android Studio installed
- ✅ Java JDK 11 or higher
- ✅ Android SDK (API 33+)

### **Steps:**

**1. Open Android Studio**
```bash
npx cap open android
```

**2. Wait for Gradle Sync**
- Android Studio will sync dependencies
- This takes 2-5 minutes first time

**3. Create Signing Key (For Release)**
```bash
keytool -genkey -v -keystore medicu-release-key.keystore -alias medicu -keyalg RSA -keysize 2048 -validity 10000
```
- Store this file safely!
- Remember the passwords!

**4. Configure Signing (android/app/build.gradle)**
```gradle
android {
    signingConfigs {
        release {
            storeFile file('medicu-release-key.keystore')
            storePassword 'your-store-password'
            keyAlias 'medicu'
            keyPassword 'your-key-password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

**5. Build Release APK/AAB**
- Click Build → Generate Signed Bundle / APK
- Choose "Android App Bundle" (AAB) for Play Store
- Select "release" build variant
- Sign with your keystore
- Output: `android/app/release/app-release.aab`

**6. Test APK Locally**
- Build → Build Bundle(s) / APK(s) → Build APK(s)
- Install on device: `adb install app-debug.apk`

---

## 🍎 iOS Build Process

### **Requirements:**
- ✅ Mac computer
- ✅ Xcode 14+ installed
- ✅ Apple Developer Account ($99/year)
- ✅ iOS device or simulator

### **Steps:**

**1. Open Xcode**
```bash
npx cap open ios
```

**2. Configure Signing**
- Select "App" target in Xcode
- Go to "Signing & Capabilities"
- Select your Team (Apple Developer Account)
- Xcode auto-generates provisioning profile

**3. Update Bundle Identifier (if needed)**
- Change from `com.medicu.app` to your own
- Must be unique in App Store

**4. Configure App Icons**
- Open `ios/App/App/Assets.xcassets/AppIcon.appiconset`
- Add icons for all sizes (20x20 to 1024x1024)
- Use https://appicon.co/ to generate

**5. Build for Device**
- Select "Any iOS Device" or your connected device
- Click Product → Archive
- Wait for build (2-5 minutes)

**6. Upload to App Store Connect**
- Window → Organizer
- Select your archive
- Click "Distribute App"
- Choose "App Store Connect"
- Follow prompts to upload

---

## 🎨 App Icons & Splash Screens

### **Android Icons:**
Location: `android/app/src/main/res/`

Required sizes:
- `mipmap-mdpi/` - 48x48
- `mipmap-hdpi/` - 72x72
- `mipmap-xhdpi/` - 96x96
- `mipmap-xxhdpi/` - 144x144
- `mipmap-xxxhdpi/` - 192x192

### **iOS Icons:**
Location: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

Required sizes:
- 20x20, 29x29, 40x40, 60x60, 76x76, 83.5x83.5, 1024x1024

### **Generate All Icons:**
Use: https://www.appicon.co/
- Upload 1024x1024 icon
- Download all sizes
- Replace in native projects

### **Splash Screens:**
- Android: `android/app/src/main/res/drawable/splash.png`
- iOS: `ios/App/App/Assets.xcassets/Splash.imageset/`

---

## 📝 App Store Submission

### **Google Play Store:**

**1. Create Developer Account**
- Visit: https://play.google.com/console
- Pay $25 one-time fee
- Complete registration

**2. Create App Listing**
- App name: "Medicu - Medical Education"
- Short description (80 chars)
- Full description (4000 chars)
- Screenshots (phone + tablet)
- Feature graphic (1024x500)
- App icon (512x512)

**3. Upload AAB**
- Production → Create new release
- Upload `app-release.aab`
- Set version name & code
- Add release notes

**4. Content Rating**
- Complete questionnaire
- Medical/educational app
- No ads, no in-app purchases

**5. Submit for Review**
- Review takes 1-7 days
- Fix any issues
- App goes live!

### **Apple App Store:**

**1. Create App Store Connect Account**
- Visit: https://appstoreconnect.apple.com
- Requires Apple Developer Program ($99/year)

**2. Create App Record**
- Click "+" → New App
- Platform: iOS
- Name: "Medicu"
- Bundle ID: com.medicu.app
- SKU: MEDICU001

**3. App Information**
- Category: Medical / Education
- Content Rights: You own the rights
- Age Rating: 4+ or 12+

**4. Pricing**
- Free or Paid
- Select countries

**5. Prepare for Submission**
- App screenshots (6.5" & 5.5" displays)
- App preview video (optional)
- Description (4000 chars)
- Keywords (100 chars)
- Support URL
- Privacy policy URL

**6. Upload Build**
- Use Xcode Organizer
- Or Transporter app
- Select build in App Store Connect

**7. Submit for Review**
- Review takes 1-3 days
- Respond to any questions
- App goes live!

---

## 🔄 Update Process

### **When You Make Changes:**

**1. Build Web App**
```bash
npm run build
```

**2. Sync to Native**
```bash
npx cap sync
```

**3. Rebuild Native Apps**
- Android: Build new AAB
- iOS: Archive new build

**4. Upload to Stores**
- Increment version number
- Upload new build
- Submit for review

---

## 🛠️ Development Workflow

### **Live Reload (Development):**
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Run on device with live reload
npx cap run android --livereload --external
npx cap run ios --livereload --external
```

### **Testing:**
```bash
# Android
npx cap run android

# iOS (Mac only)
npx cap run ios
```

---

## 📊 App Store Requirements

### **Google Play Store:**
- ✅ Minimum SDK: API 22 (Android 5.1)
- ✅ Target SDK: API 33+ (Android 13+)
- ✅ 64-bit support required
- ✅ Privacy policy URL
- ✅ Content rating
- ✅ Screenshots (2-8 images)

### **Apple App Store:**
- ✅ Minimum iOS: 13.0+
- ✅ Privacy policy URL
- ✅ App Store screenshots
- ✅ App icon (1024x1024)
- ✅ Age rating
- ✅ App description

---

## 💰 Costs

### **One-Time:**
- Google Play Developer: $25
- Apple Developer Program: $99/year

### **Optional:**
- App icon design: $5-50
- Screenshots design: $10-100
- App Store Optimization: $50-500

---

## 🎯 Next Steps

**Immediate:**
1. ✅ Generate app icons (1024x1024)
2. ✅ Create splash screens
3. ✅ Build and test on devices
4. ✅ Take screenshots

**For Submission:**
1. ✅ Write app description
2. ✅ Create privacy policy
3. ✅ Set up developer accounts
4. ✅ Submit to stores

**After Launch:**
1. ✅ Monitor reviews
2. ✅ Fix bugs
3. ✅ Add features
4. ✅ Update regularly

---

## 🎉 You're Ready!

Your app is now configured for:
- ✅ iOS App Store
- ✅ Google Play Store
- ✅ Native performance
- ✅ Full device features

**Build, test, and submit!** 🚀
