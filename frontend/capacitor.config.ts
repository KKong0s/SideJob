import type { CapacitorConfig } from '@capacitor/cli';

// Debug builds talk to the local Node-RED over plain http (http://10.0.2.2:1881 from the emulator).
// The app page is served from http://localhost in debug so http API calls and images are not mixed
// content (the WebView blocks http images on an https page). Cleartext is allowed only in the debug
// manifest (android/app/src/debug/AndroidManifest.xml).
// Build a release with CAP_RELEASE=1 (and an https API in environment.android.ts): https://localhost.
const release = process.env['CAP_RELEASE'] === '1';

const config: CapacitorConfig = {
  appId: 'th.sidejob.app',
  appName: 'SideJob',
  webDir: 'www',
  server: {
    androidScheme: release ? 'https' : 'http',
  },
  plugins: {
    SplashScreen: {
      // Short native splash: the HTML runner splash in index.html (same colours) takes over
      launchShowDuration: 300,
      launchAutoHide: true,
      backgroundColor: '#1F3A13',
      showSpinner: false,
      androidScaleType: 'CENTER',
      splashFullScreen: false,
      splashImmersive: false,
    },
    StatusBar: {
      backgroundColor: '#1F3A13',
      style: 'DARK',
      overlaysWebView: false,
    },
    SocialLogin: {
      providers: {
        google: true,
        facebook: false,
        apple: false,
        twitter: false,
      },
      logLevel: 1,
    },
  },
};

export default config;
