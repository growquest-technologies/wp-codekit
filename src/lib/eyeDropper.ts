/**
 * Screen colour picking via the EyeDropper API.
 *
 * This is one of the rare cases where the platform gives you more than you could
 * build yourself: the browser hands control to the OS compositor, so it samples
 * anywhere on the screen — other windows, the desktop, a video — not just the
 * page. The magnified circular loupe that follows the cursor is the browser's
 * own UI and is not stylable from here.
 *
 * We deliberately do not attempt a DIY version. Reading pixels outside the
 * document is blocked by the same-origin model for good reason, and the only
 * workaround (getDisplayMedia screen capture) costs a screen-share permission
 * prompt on every use and still cannot see the cursor's exact target reliably.
 *
 * Chromium-only today: Chrome/Edge/Opera 95+. Firefox and Safari have not
 * shipped it, so `isEyeDropperSupported()` gates the UI rather than letting a
 * button fail silently.
 */

interface EyeDropperResult {
  sRGBHex: string;
}

interface EyeDropperInstance {
  open(options?: { signal?: AbortSignal }): Promise<EyeDropperResult>;
}

declare global {
  interface Window {
    EyeDropper?: new () => EyeDropperInstance;
  }
}

export function isEyeDropperSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.EyeDropper === 'function';
}

/**
 * Opens the system picker and resolves with the chosen hex, or `null` if the
 * user dismissed it (Escape / click-away throws AbortError, which is a normal
 * outcome and not an error worth surfacing).
 *
 * Must be called from a user gesture — the API requires transient activation.
 */
export async function pickScreenColor(signal?: AbortSignal): Promise<string | null> {
  const Ctor = window.EyeDropper;
  if (!Ctor) return null;
  try {
    const { sRGBHex } = await new Ctor().open(signal ? { signal } : undefined);
    return sRGBHex;
  } catch {
    return null;
  }
}
