// Apply the language before paint; boot-theme.js owns the theme.
// i18n.js replaces this. Boot must still render if that script fails to load.
window.lfT = window.lfT || ((zh) => zh);
(() => {
  const root = document.documentElement;
  const htmlLang = { zh: 'zh-CN', en: 'en', it: 'it' };
  let lang = 'zh';
  try {
    const saved = localStorage.getItem('loopforge.lang');
    lang = Object.prototype.hasOwnProperty.call(htmlLang, saved) ? saved : 'zh';
  } catch (_) { /* Restricted storage still permits the default interface. */ }
  root.dataset.lang = lang;
  root.lang = htmlLang[lang];
})();
