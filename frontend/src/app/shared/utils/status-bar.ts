import { isNativeApp } from './platform';

/**
 * Phone app status bar: dark green with light icons while the splash is up (matches the native
 * splash in capacitor.config.ts), white with dark icons for the app. No-op in a browser, where
 * `<meta name="theme-color">` does the same job.
 */
export async function setStatusBar(mode: 'splash' | 'app'): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setBackgroundColor({ color: mode === 'splash' ? '#1F3A13' : '#FFFFFF' });
    await StatusBar.setStyle({ style: mode === 'splash' ? Style.Dark : Style.Light });
  } catch {
    // cosmetic only
  }
}
