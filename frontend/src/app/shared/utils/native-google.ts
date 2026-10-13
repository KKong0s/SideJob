// Google Sign-In inside the phone app. Google blocks its OAuth pages in a WebView, so the app uses
// the native account picker (Credential Manager on Android) through @capgo/capacitor-social-login.
// The plugin is asked for an ID token issued to the *web* client ID, so the API verifies it exactly
// like a token from the web button. The Android OAuth client (package + SHA-1) only has to exist in
// Google Cloud Console; its ID is never used here.

import { environment } from '../../../environments/environment';

let ready: Promise<typeof import('@capgo/capacitor-social-login')> | null = null;

function plugin(): Promise<typeof import('@capgo/capacitor-social-login')> {
  ready ??= import('@capgo/capacitor-social-login')
    .then(async (mod) => {
      await mod.SocialLogin.initialize({ google: { webClientId: environment.googleClientId } });
      return mod;
    })
    .catch((err: unknown) => {
      ready = null;
      throw err;
    });
  return ready;
}

/** Opens the native Google account picker. Resolves to the ID token, or null when the user cancels. */
export async function nativeGoogleIdToken(): Promise<string | null> {
  const { SocialLogin } = await plugin();
  try {
    const res = await SocialLogin.login({ provider: 'google', options: {} });
    if (res.result.responseType !== 'online' || !res.result.idToken) throw new Error('No ID token from Google');
    return res.result.idToken;
  } catch (err) {
    if ((err as { code?: string } | null)?.code === 'USER_CANCELLED') return null;
    throw err;
  }
}
