import './ui/styles.css';
import { engine } from './engine-source';
import { App } from './ui/app';

const app = new App(document.getElementById('app')!, engine);
if (import.meta.env.DEV) (window as unknown as { __takeoff: unknown }).__takeoff = { app, engine, debug: () => app.debug };
void app.boot();
