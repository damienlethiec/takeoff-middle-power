import './ui/fonts.css';
import './ui/styles.css';
import { engine } from './engine';
import { App } from './ui/app';
import { installGlossary } from './ui/glossary';

installGlossary();
const app = new App(document.getElementById('app')!, engine);
if (import.meta.env.DEV) (window as unknown as { __takeoff: unknown }).__takeoff = { app, engine, debug: () => app.debug };
void app.boot();
