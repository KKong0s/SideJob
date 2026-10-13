# Boot splash on the phone apps (Capacitor)

> **Done in Phase 9 (Android):** `capacitor.config.ts` (SplashScreen + StatusBar), `frontend/assets/*.png` sources,
> generated `android/app/src/main/res` sizes, Android 12+ splash colors in `values/styles.xml`, and
> `shared/utils/status-bar.ts` (switched from `splash.ts`). The notes below are the original plan.

The web boot splash (runner illustration) lives in `frontend/src/index.html` and is faded out by
`hideSplash()` in `frontend/src/app/shared/utils/splash.ts`, called from `main.ts` once the first
navigation settles. It already has a phone layout (dark green #1F3A13, logo on top, three dots,
tagline at the bottom) that respects safe areas, short screens and landscape.

Capacitor is **not set up yet** (only `@capacitor/core` and `@capacitor/preferences` are installed;
there is no `capacitor.config.ts` and no `android/` or `ios/` folder), so the native part was skipped.
When Phase 9 adds the platforms, do this so the native splash hands over seamlessly to the HTML one:

## 1. Native splash — `@capacitor/splash-screen`

```ts
// capacitor.config.ts
plugins: {
  SplashScreen: {
    launchShowDuration: 300,   // short: the HTML splash (same look) takes over
    launchAutoHide: true,
    backgroundColor: '#1F3A13',
    showSpinner: false,
    androidScaleType: 'CENTER',
    splashFullScreen: false,
    splashImmersive: false,
  },
},
```

Image: the SideJob logo (lime dot with cream ring + "SideJob" in Prompt 700) in cream #F6F6F1,
centered on #1F3A13. Generate the platform sizes from two source files with `@capacitor/assets`:

| Source file | Size | Notes |
|---|---|---|
| `assets/splash.png` | 2732 × 2732 px | logo centered, kept inside the middle ~1200 × 1200 px safe zone |
| `assets/icon-only.png` | 1024 × 1024 px | app icon (needed by the same tool) |

`npx @capacitor/assets generate --splashBackgroundColor "#1F3A13"` then produces:

- **Android 12+** splash icon: 288 × 288 dp canvas, icon inside a 192 dp circle (shown at ~240 dp)
- **Android (older)** `drawable*/splash.png` from ldpi to xxxhdpi (e.g. 480 × 800 up to 1280 × 1920 portrait, plus landscape)
- **iOS** `Splash.imageset` at 2732 × 2732 (@1x / @2x / @3x), shown with "Aspect Fill" on the storyboard

## 2. Status bar — `@capacitor/status-bar`

- While the splash is up: `StatusBar.setBackgroundColor({ color: '#1F3A13' })` and `StatusBar.setStyle({ style: Style.Dark })` (light text).
- After `hideSplash()` resolves: switch back to the app's normal bar (white background, `Style.Light` = dark text).
  The natural place is right after the `hideSplash()` call in `main.ts`, guarded by `Capacitor.isNativePlatform()`.
- The web build already does the same with `<meta name="theme-color">` (dark green during the splash, white after).
