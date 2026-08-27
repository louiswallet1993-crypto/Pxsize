'use strict';
window.PX = window.PX || {};

PX.theme = (function () {

  const state = PX.state;

  function apply(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    PX.dom.themeBright.classList.toggle('is-active', theme === 'bright');
    PX.dom.themeDark.classList.toggle('is-active', theme === 'dark');
  }

  function set(theme) {
    if (theme === state.theme) return;
    // La bascule se fait au milieu du fondu glitché
    PX.fx.themeTransition(() => {
      apply(theme);
      PX.prefs.saveTheme(theme);
    });
  }

  function init() {
    apply(PX.prefs.loadTheme());
    PX.dom.themeBright.addEventListener('click', () => set('bright'));
    PX.dom.themeDark.addEventListener('click', () => set('dark'));
  }

  return { init, set, apply };

})();
