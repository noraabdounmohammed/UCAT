# Plan 16 — Native iOS / Android via Capacitor

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Ship the existing PWA as native iOS + Android apps via Capacitor. Capacitor is already wired into `package.json` (the original Bolt MVP scaffolded it; Plan 1 inherited it). This plan focuses on **actually building, signing, and submitting** to the App Store and Google Play Console — most of the work is operator-side runbook, not code.

The strategic value: native-app distribution unlocks a discovery channel students search in (App Store / Play Store), enables push notifications later, and keeps existing in-app web checkout via Stripe (no IAP fee for now).

**Spec:** §11 (distribution channels). Builds on every shipped plan (1–15).

**Architecture:**

1. **Existing Capacitor configuration** — verify `capacitor.config.ts` exists and points at the right web build dir (`dist/`).
2. **Add native platforms** — `npx cap add ios` and `npx cap add android` (verify whether already added; if not, add and commit the generated `ios/` and `android/` directories).
3. **Asset generation** — use `@capacitor/assets` (or equivalent) to generate icons and splash screens from a single source file (`branding/icon.png` 1024×1024, `branding/splash.png` 2732×2732).
4. **Build pipeline** — `npm run build` (Vite) → `npx cap copy` (sync `dist/` into native projects) → open Xcode / Android Studio → archive + sign → upload.
5. **In-app purchases — out of scope.** Existing Stripe checkout opens in an in-app browser via Capacitor's `Browser` plugin. Apple's IAP-required-for-digital-goods rule is an open question; current read is that the web subscription model is acceptable so long as we don't pitch the upgrade inside the app. Revisit when a reviewer flags it.

**This plan is mostly a runbook.** The codebase already has Capacitor; the human work is the App Store / Play Console flow.

---

## File structure

### Created
- `branding/icon.png` (1024×1024) — source for icon generation
- `branding/splash.png` (2732×2732) — source for splash generation
- `docs/operator-runbook/ios-build-and-submit.md`
- `docs/operator-runbook/android-build-and-submit.md`
- `docs/operator-runbook/capacitor-troubleshooting.md`
- `scripts/build-native.sh` — one-shot wrapper around `npm run build && npx cap copy && npx cap sync`

### Modified (verify)
- `capacitor.config.ts` — confirm `webDir: 'dist'`, `appId: 'com.studyedit.app'` (or update), `appName: 'studyedit'`
- `package.json` — pin Capacitor versions; add `@capacitor/assets` if missing
- `OPERATOR-RUNBOOK.md` — link to the three new runbook docs
- `docs/superpowers/specs/CHANGELOG-atomic-engine.md` — log Plan 16 ship

### Possibly created (depends on whether `cap add` already ran)
- `ios/` directory (Xcode project) — committed
- `android/` directory (Gradle project) — committed
- `.gitignore` updates — ignore `ios/App/Pods/`, `android/.idea/`, build artefacts

### Untouched
- All `src/` code (PWA is the app — no native-specific code in v1)
- All test files (no new automated tests; manual smoke via TestFlight + Play internal track)

---

## Phase + task breakdown — 9 commits

### Phase A — Verify Capacitor configuration + asset generation (3 tasks)

**Task 1: `chore(capacitor): audit existing config and pin versions`**
- Read `capacitor.config.ts`; confirm `webDir: 'dist'`, `appId`, `appName`.
- If missing, create with sensible defaults (`appId: 'com.studyedit.app'`, `appName: 'studyedit'`).
- Pin `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android` to matching minor versions.
- Document the pinned versions in CHANGELOG.

**Task 2: `chore(capacitor): add native platforms if missing`**
- Run `npx cap add ios` if `ios/` doesn't exist.
- Run `npx cap add android` if `android/` doesn't exist.
- Commit the generated directories. Add `.gitignore` entries for build artefacts (`ios/App/Pods/`, `android/build/`, `android/app/build/`, `android/.gradle/`).
- Run `npx cap sync` and verify it completes cleanly.

**Task 3: `chore(branding): add icon + splash sources and generate assets`**
- Place `branding/icon.png` (1024×1024, transparent background) and `branding/splash.png` (2732×2732, centred logo on brand colour).
- Run `npx @capacitor/assets generate --iconBackgroundColor '#FFFFFF' --splashBackgroundColor '#FFFFFF'` (or equivalent); confirm icons + splashes generated for both platforms.
- Commit the generated assets.
- Verify by running `npx cap open ios` and `npx cap open android` — icons preview in Xcode and Android Studio.

### Phase B — iOS build pipeline (1 task — operator-led)

**Task 4: `docs(runbook): iOS build, sign, and submit`**

New file `docs/operator-runbook/ios-build-and-submit.md`. Sections:

- **Prerequisites (operator).** Apple Developer Program membership ($99/year). Mac with Xcode 15+. App Store Connect access. App Store Connect API key (for fastlane / CLI submission). Privacy Policy URL (already at `/privacy` from Plan 12). App support URL (e.g. `mailto:nora@studyedit.com`).
- **One-time setup.** Create App ID in Apple Developer portal (`com.studyedit.app`). Create app record in App Store Connect. Provisioning profiles + signing certificate (managed automatically by Xcode signs-in flow).
- **Build steps.**
  1. `npm run build` — produces `dist/`.
  2. `npx cap copy ios` — syncs `dist/` into `ios/App/App/public/`.
  3. `npx cap open ios` — opens Xcode.
  4. Xcode: select "Any iOS Device", Product → Archive.
  5. Organizer → Distribute App → App Store Connect → Upload.
- **App Store Connect metadata.**
  - App name: `studyedit`
  - Subtitle: `UKMLA / AKT spaced retrieval`
  - Description (use the existing landing page copy)
  - Keywords (UKMLA, AKT, MLA, medical, retrieval, spaced, repetition, MCQ, NICE)
  - Screenshots: 6.7", 6.5", 5.5" iPhone + 12.9" iPad (use real device or simulator screenshots of `/study`, `/review`, `/mistakes`, `/mock`, `/voice`)
  - Privacy Policy URL: `https://studyedit.com/privacy`
  - Support URL
  - Age rating: 4+
  - Category: Education
  - Pricing: Free (with in-app web checkout for Pro)
- **Submission.** Submit for review. Expect 1–2 weeks for first submission. Common rejection reasons + responses (subscription terms not visible, missing privacy disclosure, Stripe checkout flagged as IAP avoidance).
- **TestFlight.** Internal testing track for the operator + Nora before public submission.

This task is a docs commit — no code change required for the operator's actual work.

### Phase C — Android build pipeline (1 task — operator-led)

**Task 5: `docs(runbook): Android build, sign, and submit`**

New file `docs/operator-runbook/android-build-and-submit.md`. Sections:

- **Prerequisites (operator).** Google Play Console developer account ($25 one-off). Android Studio. Java JDK 17+. Privacy Policy URL.
- **One-time setup.**
  - Generate signing key: `keytool -genkey -v -keystore studyedit-release.keystore -alias studyedit -keyalg RSA -keysize 2048 -validity 10000`. Store the keystore + passwords in 1Password (operator-side).
  - Configure `android/app/build.gradle` with the release signing config (referenced from environment, not committed).
  - Create app record in Play Console (`com.studyedit.app`).
- **Build steps.**
  1. `npm run build`.
  2. `npx cap copy android`.
  3. `npx cap open android`.
  4. Android Studio: Build → Generate Signed Bundle (AAB), select the keystore, target the release variant.
  5. Upload the resulting `.aab` to Play Console internal testing track.
- **Play Console metadata.**
  - Same fields as iOS (description, screenshots, category, content rating).
  - Data safety form: declare what we collect (email + usage analytics via PostHog) and how (encrypted in transit, third-party processors named).
  - Target API level (must match Play's current minimum, typically API 34+).
- **Submission.** Internal track → closed track → open track → production. Each promotion requires a fresh review (typically <24h after the first).

### Phase D — Push notifications (deferred)

**Task 6: `docs: defer push notifications to Plan 16B`**

Push notifications would significantly extend Plan 16. Defer:
- iOS: Apple Push Notification service (APNs) keys + Capacitor `@capacitor/push-notifications` plugin
- Android: Firebase Cloud Messaging (FCM) project + `google-services.json`
- Backend: a notification scheduler (probably a Supabase scheduled function) that fires when a user has atoms due
- UI: notification permission prompt + settings page

Plan 16B will pick this up once Plan 16 ships and we have real users on the native track.

### Phase E — Build script + CHANGELOG + verify

**Task 7: `chore(scripts): add build-native.sh wrapper`**

`scripts/build-native.sh`:
- Sequence: clean install → `npm run build` → `npx cap copy` → `npx cap sync`.
- Echoes next steps for the operator (open Xcode for iOS, open Android Studio for Android).

**Task 8: `docs(runbook): Capacitor troubleshooting + CHANGELOG`**

New file `docs/operator-runbook/capacitor-troubleshooting.md`:
- Common Xcode signing issues (provisioning profile mismatch, certificate expiry, bundle ID drift).
- Common Android Gradle errors (target SDK mismatch, signing config not found, AAB upload rejected).
- How to refresh native projects after a Capacitor upgrade.
- Where the keystore + passwords live (1Password reference, not the actual values).

Append to `CHANGELOG-atomic-engine.md`:
- Plan 16 ships: native iOS + Android via Capacitor.
- Capacitor config audited + version-pinned.
- `ios/` + `android/` directories committed.
- Branding sources (`branding/icon.png`, `branding/splash.png`) committed; assets generated via `@capacitor/assets`.
- Three new operator runbook docs.
- Push notifications deferred to Plan 16B.

**Task 9: `chore: verification battery + push`**
- `npm run build` — clean (still produces `dist/`).
- `npx cap sync` — completes cleanly on both platforms.
- `npx tsc --noEmit` — clean (no `src/` changes).
- `npm test` — still green at existing total.
- `gitleaks` — no signing secrets leaked (keystore + passwords must NOT be in the repo).
- Manual: open both native projects in Xcode and Android Studio, run on simulator, confirm the PWA loads.
- Push + PR.

---

## Operator-only checklist

The following items are **operator action**, not code. The plan is complete when the runbook docs are committed; the operator follows the runbook to actually ship to the stores.

- [ ] Apple Developer Program membership active ($99/year)
- [ ] Mac with Xcode 15+ installed
- [ ] App Store Connect app record created (`com.studyedit.app`)
- [ ] Apple signing certificate + provisioning profile configured
- [ ] Privacy Policy URL live at `https://studyedit.com/privacy` (Plan 12)
- [ ] Google Play Console developer account active ($25 one-off)
- [ ] Android signing keystore generated + stored in 1Password
- [ ] Play Console app record created (`com.studyedit.app`)
- [ ] App icons (1024×1024) + screenshots prepared per store specs
- [ ] App Store + Play Store descriptions written
- [ ] Submit for review (allow 1–2 weeks for first iOS submission)
- [ ] TestFlight internal track tested by operator + Nora before public submission

---

## Constraints

1. **In-app purchase is out of scope.** Stripe web checkout via the in-app browser stays. If Apple rejects on the IAP-required rule, switch to a "marketing site only — no upgrade inside the app" pattern (the upgrade button links to a hidden web route that Stripe handles).
2. **No native code beyond Capacitor scaffolding.** All UI is the existing PWA. No Swift, no Kotlin in v1.
3. **Don't commit signing artefacts.** Keystores, provisioning profiles, App Store Connect API keys all live in 1Password. The runbook references them; the repo never holds them.
4. **Privacy Policy URL must be live.** Plan 12 ships `/privacy`; Plan 16 depends on it.
5. **Don't break the web build.** All Capacitor work is additive; `npm run build` + Netlify deploy must keep working.
6. **`@capacitor/assets` is dev-only.** Don't pull it into the runtime bundle.
7. **Bundle ID consistency.** `com.studyedit.app` everywhere — `capacitor.config.ts`, App Store Connect, Play Console. Drift causes provisioning failures.
8. **Test on real devices before public submission.** Simulators + emulators miss touch / camera / network-edge bugs.

---

## Out of scope

- In-app purchase (Apple IAP / Google Play Billing) — Stripe web checkout stays
- Push notifications — Plan 16B
- Deep linking (universal links / app links) — Plan 16C
- Native widgets (iOS home screen widget for streak / due-count)
- Apple Watch companion app
- App Clips / Instant Apps
- Background sync (iOS BGAppRefreshTask, Android WorkManager)
- Native camera integration for image stems (Plan 15 uses the web file picker)
- Localisation beyond English (i18n is a separate plan)
- App Store ASO optimisation (keyword research, A/B testing of screenshots)

---

## Verification

- [ ] `npm run build` — dist/ produced cleanly.
- [ ] `npx cap sync` — completes cleanly for both ios and android.
- [ ] `npx tsc --noEmit` — clean.
- [ ] `npm test` — still green.
- [ ] `gitleaks` — no signing secrets in commits.
- [ ] Operator: PWA loads on iOS simulator + Android emulator with no console errors.
- [ ] Operator: TestFlight internal build delivered + smoke-tested.
- [ ] Operator: Play Console internal track build uploaded + smoke-tested.
- [ ] Plans 1–15 tests still green.
- [ ] No remote push of plan code until verification battery is clean.

## Reporting

After execution, log:
- Commit SHAs (9 total).
- Final test count (unchanged from Plan 15 — no test additions).
- Build / cap-sync / tsc / gitleaks clean status.
- Operator action items remaining (the operator-only checklist above).
- Whether `ios/` and `android/` were already present (just verify) or had to be added (full directories committed).
- Any deviations from this plan.

The native ship is **not done** when this plan merges — it's done when Apple and Google both flip the app to "Available". Expect 1–2 weeks of review on the first iOS submission; track the wait in `OPERATOR-RUNBOOK.md`.
