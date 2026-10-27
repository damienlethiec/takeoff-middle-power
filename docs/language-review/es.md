# Spanish review (es)

Native-level review of `src/i18n/es.json` against the reviewed English (`src/i18n/en.json`), 27 Oct 2026. Every
string was read, family by family: endings, epilogues and letters; requests; policy cards; headlines, voices and
social events; threats, Breaking news, milestones and leaks; interface, help, tips and glossary; the engine's
templates. About 430 strings changed. Meanings, facts, numbers and placeholders are unchanged (`npm run i18n:check --
es`: 0 errors). Commits are titled "Spanish review: …".

The target is neutral European Spanish that reads naturally in Latin America: written as a Spanish game writer
would write it, not translated.

## Register

- **tú** to the player everywhere (interface, tips, cards, characters); the friends also use **vosotros** when they
  speak to "you lot" in Brussels. Li Wen says "quedaos con vuestras fábricas" to Europe as a whole.
- **No gender for the player.** No adjective or noun agrees with the player: Léa opens "¡Hola, cuánto tiempo!"
  (not "querido amigo"), Li Wen no longer says "amigo mío", the critics accuse you "de blandura" (not "blando"),
  threats show "con protección / sin protección" and "a salvo" (not "preparado").
- **Léa**: oral, warm, concrete ("qué nivel", "meter la pata", "Cansada, nada más"); signs "L.".
- **Your mother**: "Cariño," … "Un beso, mamá"; a nurse's words (historia clínica, planta, triaje, turnos, boli rojo).
- **Malik**: "¡Soy Malik!" while enthusiastic, shorter as the race closes in; signs "M.". "Back home" is "en Europa",
  never "en casa" (which reads as his flat).
- **Pan-Hispanic** words where Spain-only slang diverges: detectar/descubrir/sorprender (not pillar), regañar (not
  echar la bronca), simpáticos (not monos), habladurías (not cotilleo), "Por fin, a la luz del día" (not "luz y
  taquígrafos").
- Headlines terse, present tense; voices oral, with one concrete detail.

## Terms

| Concept | Spanish |
|---|---|
| AI progress / takeoff | Progreso de la IA / el despegue, la IA despega. "At takeoff" in the endings: "Cuando la IA despegó, …" |
| AI safety, verified, claimed | Seguridad de la IA; lo verificado / la parte verificada; lo que dicen los laboratorios (not "declarado") |
| US–China cooperation, zones | Cooperación EE. UU.–China; Pausa, Carrera, Ruptura. "Broke apart": rompieron relaciones; "raced": se lanzaron a la carrera |
| Social cohesion, Influence | Cohesión social, Influencia |
| Europe's AI | IA de Europa: Abierta / Dependiente |
| Plateau worlds | Estancamiento, grandes laboratorios / modelos abiertos (on the heading line: "un Estancamiento con …") |
| Cut Europe off | dejar a Europa sin servicio (everywhere: endings, epilogues, threat, chips) |
| AI Office | la Oficina de IA |
| Chip-making machines (ASML) | máquinas de chips / máquinas para fabricar chips (not "herramientas de chips") |
| Data / computer centres | centros de datos; centros de computación (not "de cálculo"); potencia de cálculo |
| AI remote worker | teletrabajador de IA |
| Theft "cut short" | interrumpir el robo (it is interrupted, part gets out), not "cortar a tiempo" |
| Retraining | formación, reciclaje profesional; card: "Ayudar a los trabajadores a reciclarse" |
| Goodwill | capital político, crédito diplomático, apoyos (not the calque "buena voluntad") |
| Redacted leak | filtración tachada (not "censurada") |
| Odds | Probable, Incierto, Difícil |
| Bars to reach | el listón (not "la exigencia") |

## Typography

- Quotes « », nested “ ”. The full stop goes after the closing guillemet, also after ? or !: «¡Frenad!».
- Numbers: 931.690 €, 3.000, 1.250 megavatios, 37,4 millones, "20 %". Large sums keep "mil millones" so the numbers
  match the English for the check.
- Dates: 1.er sem. 2027, 2.º sem. 2027. Ranges in prose: "de 22 a 25 años"; the en dash stays in gauge zones
  (30–59) and the minus sign in numbers (−3).
- EE. UU. with its space; la India; el Reino Unido (with the article in prose).

## Ten significant fixes

| Key | Before → after | English |
|---|---|---|
| `threat.opaque.ifUnprepared` | "crece **a la mitad**" (wrong: shrinks by half) → "aumenta **un cincuenta por ciento**" | grows by half |
| `ending.cognitive_revolution.story` | present tense in a past story ("la economía crece… elige") → "creció… decidió, unida, frenar y pararse a pensar" | grew… chose |
| `epilogue.hot_war.lea` | "La guerra está en la otra punta del mundo, y en mi cocina" → "…, y también en mi cocina: el pan cuesta el doble…" | half a world away, and in my kitchen |
| `epilogue.silicon_blackmail.mother` | "la planificación del hospital se quedó a oscuras" (calque) → "el sistema de turnos del hospital se cayó" | the scheduling went dark |
| `ending.silicon_blackmail.story` | "lo apagaron todo" → "la dejaron sin servicio" (the game's term) | they cut it off |
| `card.talks.text` | "te llaman **blando** con los rivales" (assumes a man) → "hay quien te acusa **de blandura**" | some call you soft on rivals |
| `request.ai_draft_laws.text` | "más rápido y más justas que tus juristas" (agreement) → "más rápidas y más justas que las de tus juristas" | faster and fairer than your lawyers |
| `letter.mum1_diabetic` | "Se le olvidó con mucha seguridad y muy limpio." → "Lo olvidó con toda limpieza y aplomo." | Neatly, confidently forgot. |
| `ui.heading.early` | "Primero, vigila Progreso de la IA y Seguridad de la IA" (no articles possible) → "Primero, vigila estos indicadores: {a} y {b}" | First, watch {a} and {b} |
| `event.theft.*`, `threat.theft.*` | "Cortado a tiempo el robo" → "Interrumpen el robo… una parte del modelo se escapa" | theft cut short |

Other recurring fixes: "Pagan otros presupuestos" → "Sale de otras partidas"; "En 80" → "Al llegar a 80"; "juega todas
las cartas que…" (sounds compulsory) → "juega tantas cartas como te permita tu Influencia"; answer labels shortened
back where a rewrite had made them long (≤ 27 characters).

## Visual check

`SHOTS_QUERY=lang=es node scripts/shots.mjs` on the production build, 1280×800 and 390×844: no overflow or cut text on
the landing, main screen, decisions, a request, Breaking news, the worlds and the ending. "Cooperación EE. UU.–China"
wraps after the dash on narrow gauges, as the English does.
