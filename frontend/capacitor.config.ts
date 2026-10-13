import type { CapacitorConfig } from '@capacitor/cli';

// Debug builds talk to the local Node-RED over plain http (http://10.0.2.2:1881 from the emulator).
// The WebView itself runs on https://localhost, so http API calls count as mixed content.
// Build a release with CAP_RELEASE=1 (and an https API in environment.android.ts) to turn this off.
const release = process.env['CAP_RELEASE'] === '1';

const config: CapacitorConfig = {
  appId: 'th.sidejob.app',
  appName: 'SideJob',
  webDir: 'www',
  android: {
    allowMixedContent: !release,
  },
  server: {
    cleartext: !release,
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
