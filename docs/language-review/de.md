# German review (de)

Reviewed 27 Oct 2026 against the English reference (`docs/LANGUAGE_REVIEW.md`). Every one of the 2,074 strings of
`src/i18n/de.json` was read beside its English, family by family: endings, worlds, epilogues and the friends' letters;
requests; policy cards; headlines, voices and social events; threats, Breaking news, milestones and leaks; interface,
help, tips, intro and glossary; the engine's templates. About 460 strings were changed. The commits are titled
"German review: …". The game was then screenshotted in German (`SHOTS_QUERY=lang=de node scripts/shots.mjs`) at
1280×800 and 390×844: nothing is cut.

## Register

- **du** to the player everywhere (interface, cards, characters). Characters speaking for their country or firm use
  **ihr / euer** for Europe ("Eure KI-Regeln bremsen uns"). In-world speech that would really be formal stays formal
  (a Riga radio show asks its listeners "Trauen Sie …?").
- Imperatives in their full written form: *Fördere, Unterstütze, Dränge, Benenne* (not *Förder, Unterstütz*).
- Buttons and answer labels as infinitives or short noun phrases (*Offenlegung erzwingen, Ja zum Labor, Diskret regeln*).
- Headlines terse, often without article (*Kostenloses chinesisches KI-Modell führt Rangliste … an*); voices oral.
- Léa: warm and colloquial (*Hallo, altes Haus*, *Mir geht’s gut. Bin nur müde.*). Mum: *Mein Schatz … Alles Liebe,
  Mama*, practical, nurse's vocabulary (*Pflegeberichte, Station, Dienstpläne*). Malik: enthusiastic, then quiet;
  Wei is always *mein (alter) Teamkollege*.

## Terms (use them, and only them)

| English | German |
|---|---|
| AI progress | **KI-Fortschritt** |
| takeoff / AI takes off | **das Abheben** / **die KI hebt ab** ("Als die KI abhob, …"; "Wenn die KI jetzt abhöbe:") |
| AI safety; verified / claimed | **KI-Sicherheit**; **belegt** / **behauptet** ("42 belegt · Labore behaupten 55") |
| real safety | **echte Sicherheit** |
| US–China cooperation; Pause / Race / Rupture | **Kooperation USA–China**; **Pause / Wettrennen / Bruch** |
| Social cohesion | **Zusammenhalt** |
| Influence | **Einfluss** |
| Europe's AI: Open / Dependent | **Europas KI: Offen / Abhängig** |
| request | **Anliegen** (never *Anfrage*) |
| policy card | **Politik-Karte** |
| the AI Office | **Büro für Künstliche Intelligenz**, **KI-Büro** in short |
| cut Europe off | **Europa abschneiden** (system, threat name); **Europa den Hahn zudrehen** (story, letters, events) |
| deal (an agreement) | **Abkommen** (not *Deal*) |
| chip-making tools | **Chipmaschinen** |
| job shocks | **Jobschocks** |
| near miss (hospital) | **Beinahe-Zwischenfall** |
| AI safety research | **KI-Sicherheitsforschung** |
| goodwill / political capital | **Wohlwollen** / **politisches Kapital** |
| Breaking news | **Eilmeldung** |
| H1 2027 | **1. Hj. 2027** |
| keys | **Leertaste**, **Enter**, **Esc** |

AI 2027's endings keep their names: *das „Race“-Ende*, *das „Slowdown“-Ende*. CFG's scenario names stay in English.

## Typography

- Quotes „ “ ; dash – with spaces; minus − in numbers; arrows →.
- Numbers: *931.690 €*, *1.250 Megawatt*, *85 %*, *200 Mrd. €*, *15 Mio. £*.
- Compounds without needless hyphens (*Chipmaschinen, Cyberbehörden, Jobschocks*), hyphen after an abbreviation
  (*KI-Büro, US-Labore*).
- No comma before *oder* between two choices (*Mitziehen oder protestieren – …?*).

## Templates (`engine.*`)

Names of threats, cards and worlds go after a colon so that no article or ending has to agree with them:
*Wächst: {threat}*, *Schützt vor: {threat}*, *Das würde uns schützen: {card}*, *Akute Gefahr: {threat}*. The heading
line uses nominatives after its colon (*Wenn die KI jetzt abhöbe: ein Bruch*); *Falls die KI stagniert:* replaces a
lead that needed a dative.

## The ten most significant fixes

1. `epilogue.hot_war.lea` — *Der Krieg ist am anderen Ende der Welt und in meiner Küche: …* → *Der Krieg ist am
   anderen Ende der Welt – und in meiner Küche: Brot kostet das Doppelte, die Züge bleiben ohne Vorwarnung stehen …*
   (the turn now lands; trains "stop" mid-line, not at stations).
2. `epilogue.decentralised_mayhem.mother` — *Hacker haben wieder die Computer des Krankenhauses erpresst* ("hackers
   blackmailed the computers") → *Hacker haben die Computer des Krankenhauses wieder mit Erpressersoftware lahmgelegt*
   ("crippled them with ransomware").
3. `tip.request.text` — *Fragen kostet nichts* ("asking costs nothing", the wrong way round) → *Gefragt zu werden
   kostet nichts* ("being asked costs nothing").
4. `ending.agent_economy.story` — *hielten die großen Firmen ehrlich* (calque of "kept them honest") → *hielten die
   großen Firmen in Schach*; *und es ist immer noch Europas Art* → *aber Europa bestimmt noch selbst* ("still Europe's").
5. `ending.cognitive_revolution.story` (and the other "At takeoff" endings) — *Beim Abheben … wächst … behalten*
   (present tense in a past story) → *Als die KI abhob, … wuchs … behielten* (consistent past).
6. `request.us_security_pact.right.reaction` — *Willkommen im Zelt* ("welcome to the tent", meaningless in German) →
   *Willkommen im inneren Kreis* ("welcome to the inner circle").
7. `request.jn_whistleblowers.right.why` — *Washington sieht Europa seine Whistleblower schützen* ("its" read as
   Europe's) → *Washington sieht Europa US-Whistleblower decken* ("cover for US whistleblowers").
8. `request.os_gigafactory.text` — *die großen Firmen mit tiefen Taschen* (calque of "deep pockets") → *die
   finanzstarken Großkonzerne*.
9. `card.*.text` — *Förder offene Modelle*, *Unterstütz das dänische Modell*, *Dräng auf …* (clipped imperatives) →
   *Fördere*, *Unterstütze*, *Dränge*; *Knüpf ihren Verkauf an einen Deal* → *… an Bedingungen*.
10. `voice.v_toolmaker_comply` — *Washington hat gepfiffen* ("Washington whistled") → *Washington pfeift, wir
    springen* ("Washington said jump").

Also: *Ex-Krankenschwester* (sounded as if she quit) → *Krankenschwester im Ruhestand*; *Im Inneren* (card family "At
home") → *Innenpolitik*; *marschieren* for protest marches → *demonstrieren / gehen auf die Straße*; *Bremsen-Ende /
Rennen-Ende* → the scenario's own names; the glossary's *abhöbe* → *abhob, abgehoben*.

## Left as is, for the team

- On a phone, the gauge titles *KI-Fortschritt* and *KI-Sicherheit* break onto two lines (*KI-Fort-schritt*) while the
  round's delta chip is shown beside them. Readable, not cut; a layout tweak (smaller chip, or the title over the
  chip) would fix it in every long language.
- Length warnings that remain (`npm run i18n:check -- de`) are the glossary's word lists and three short labels
  (*Krankenschwester im Ruhestand in Lyon*, *Die Supermächte rasten um die Wette*): accepted.
