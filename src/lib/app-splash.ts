/** HTML boot splash lives outside `#root` until React fades it out. */

const SPLASH_ID = 'app-splash';
const EXIT_CLASS = 'app-splash-exiting';
const DISMISS_EVENT = 'app-splash-dismissed';

/** True while the pre-React `#app-splash` overlay is still in the document. */
export function isAppSplashActive(): boolean {
  return document.getElementById(SPLASH_ID) != null;
}

/** Subscribe once when the boot splash finishes its exit transition (or is removed). */
export function onAppSplashDismissed(callback: () => void): () => void {
  if (!isAppSplashActive()) {
    callback();
    return () => undefined;
  }
  window.addEventListener(DISMISS_EVENT, callback, { once: true });
  return () => window.removeEventListener(DISMISS_EVENT, callback);
}

/**
 * Fade out the HTML boot loader after React has painted underneath.
 * Idempotent — safe to call multiple times.
 */
export function dismissAppSplash(): void {
  const splash = document.getElementById(SPLASH_ID);
  if (!splash || splash.classList.contains(EXIT_CLASS)) return;

  splash.classList.add(EXIT_CLASS);

  const finish = () => {
    splash.remove();
    window.dispatchEvent(new CustomEvent(DISMISS_EVENT));
  };

  splash.addEventListener('transitionend', finish, { once: true });
  window.setTimeout(finish, 480);
}

/** Wait for the next two animation frames (post-layout paint). */
export function afterPaint(callback: () => void): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(callback);
  });
}
