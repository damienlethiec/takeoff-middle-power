import './ui/fonts.css';
import './ui/styles.css';
import './ui/theme-newspaper.css';
import { engine } from './engine';
import { onLangChange, setLang, t } from './i18n';
import { App } from './ui/app';
import { installGlossary } from './ui/glossary';
import { initialLang } from './ui/lang';

// the language first (?lang=, or the player's saved choice; English by default), then the game
void (async () => {
  try {
    await setLang(initialLang());
  } catch (err) {
    console.warn('language not loaded, playing in English', err);
  }
  const title = () => (document.title = t('ui.brand.title', 'Takeoff: Europe’s Next Move'));
  title();
  onLangChange(title);
  installGlossary();
  const app = new App(document.getElementById('app')!, engine);
  if (import.meta.env.DEV) (window as unknown as { __takeoff: unknown }).__takeoff = { app, engine, debug: () => app.debug };
  void app.boot();
})();
