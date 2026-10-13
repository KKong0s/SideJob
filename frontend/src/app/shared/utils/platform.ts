import { Capacitor } from '@capacitor/core';

/** True inside the Android / iOS app (Capacitor), false in a browser */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}
