export function isStandaloneDisplayMode() {
  if (typeof window === 'undefined') return false;

  const modes = ['standalone', 'fullscreen', 'minimal-ui'];
  return modes.some(mode => window.matchMedia(`(display-mode: ${mode})`).matches) ||
    window.navigator.standalone === true;
}