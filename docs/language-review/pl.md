# Polish language review (pl.json)

Reviewed 27–28 Oct 2026 against the polished English (`src/i18n/en.json`, see `docs/LANGUAGE_REVIEW.md`). All 2,074
keys were read family by family: endings, epilogues and letters; requests; cards; headlines, voices and social events;
threats, Breaking news, milestones and leaks; interface, help, tips and intro; the engine's templates. About 360
strings were rewritten (commits titled "Polish review: …"), plus one typography pass. Meanings, numbers and
placeholders are unchanged; `npm run i18n:check -- pl` passes with no length warning outside the glossary's word lists.

For Marcin: the fastest review is to read the strings in the game with `?lang=pl`, or `git log -p --grep "Polish review"
-- src/i18n/pl.json`. Anything below marked *to confirm* is a choice I would like a native check on.

## Terms (use them, and only them)

| English | Polish | Notes |
|---|---|---|
| AI progress (gauge) | **Postęp AI** | |
| takeoff, AI takes off | **przełom**, „następuje przełom” | never „punkt krytyczny” (was left in `engine.eta.few/many`, fixed) |
| AI safety (gauge) | **Bezpieczeństwo AI** | the gauge label carries soft hyphens (Bez·pie·czeń·stwo) so it breaks cleanly on phones |
| verified / labs claim | **zweryfikowane** / **laboratoria deklarują**, **deklaracje laboratoriów** | |
| real safety (hidden) | **realne bezpieczeństwo … (ukryte)** | „prawdziwe Bezpieczeństwo AI” only for the audit's true value |
| US–China cooperation | **Współpraca USA–Chiny**; zones **Pauza / Wyścig / Rozłam** | zones capitalised |
| Social cohesion | **Spójność społeczna**; „Europa trzyma się razem” | |
| Influence | **Wpływ** (capitalised), „pkt Wpływu” where a number needs a noun | |
| Europe's AI: Open / Dependent | **AI Europy: Otwarta / Zależna** | |
| plateau (CFG) | **zastój** | |
| the AI Office | **Urząd ds. AI** | |
| cut Europe off | **odciąć Europę**, „groźba odcięcia Europy” | |
| round / half-year | **runda**, **półrocze**; dates „1. półr. 2027” | |
| emergency triage | **ustalać kolejność przyjęć na SOR-ze** | „segregacja pacjentów” sounded like sorting rubbish |
| post-editor | **postedytor**, **postedycja** | |
| "AI" | **AI**, never „SI”; feminine („ta AI”), plural „te AI” | |

## Register

- The player is **„ty”** everywhere, and never gendered: no past-tense 2nd-person forms (-łeś/-łaś). Where English
  says "you did", Polish uses an impersonal or a noun („Dzięki za całą twoją robotę tam na górze”, „Wszystkie
  przecieki przeczytane”). Characters speaking to Europe as a whole use „wy” („Wasze przepisy…”, „którego
  ochroniliście”), to the player alone „ty”; each line keeps one or the other.
- Answer labels are **2nd-person imperatives** like the English („Poprzyj raport”, „Nie ustępuj”) or short nouns /
  statements („Neutralność”, „Nie stać nas”); the 1st-person plural imperatives („Pracujmy razem”, „Damy
  inspektorów”) were removed so the two buttons of a request read as a pair.
- Friends: the mother always opens **„Moje kochanie,”** and signs „Całuję, Mama”; Léa writes „Hej, to ja, Léa”
  and signs „L.”; Malik „Tu Malik” and „M.”. Wei is „mój (dawny) kolega z zespołu, z Chengdu” in every text that
  may be read alone; Hugo declines (Hugona). "Back home" for Malik is „u nas” / „w Europie”, not „w domu”.
- Headlines: terse, present tense; fiction starts „W tej historii”, scenario lines „W AI 2027” / „W scenariuszu CFG”.
  Company-made AI is „AI OpenBrain” in headlines (genitive), „asystenci AI od OpenBrain” only in speech.
- Templates (`engine.*`): a name the game inserts sits after a colon in the nominative („Ochroni nas karta:
  {card}.”, „Zagrożenie: {threat}.”); world names go into genitive nouns (`engine.worldNoun.*`, „w warunkach
  wyścigu”).

## Typography

- Quotes „…” (closing ” U+201D); no straight quotes.
- Thousands with a no-break space: 931 690 euro, 1 250 megawatów.
- **No-break space after one-letter words** (a, i, o, u, w, z and capitals) in every string, so none ends a line;
  the glossary's word lists got the same treatment so inline terms still match.
- Dash with spaces „ – ” in prose; en dash without spaces in ranges and pairs (30–59, USA–Chiny); minus sign −.
- Plurals: `.one / .few / .many` filled for every counted string; `.other` (fractions only) left as it was.

## The ten most significant fixes

1. `request.os_exemption.left.reaction` — „Wtedy tylko **giganci będzie** stać na budowę AI” → „Wtedy tylko
   **gigantów będzie** stać…” (*Then only giants can afford to build AI here*: ungrammatical case).
2. `letter.r8_interpreter` — „Dziękuję za wszystko, co tam na górze **zrobiłeś**” → „Dzięki za całą twoją robotę
   tam na górze” (*Thank you for whatever you did up there*: assumed a male player).
3. `ending.silicon_blackmail.story` — „Gdy Europa odmówiła…, **wyłączyły je**. … Europa zachowała swoje **prawa**” →
   „…, **firmy ją odcięły**. … Europa zachowała swoje **prawo**” (*they cut it off … kept its laws*: "je" pointed at
   the wrong noun, and „prawa” read as *rights*).
4. `engine.eta.few/many` — „**Punkt krytyczny** za ~{n} rundy” → „**Przełom** za ~{n} rundy” (*Takeoff in ~n
   rounds*: old term in two plural forms only).
5. `ending.cognitive_revolution.story` — present tense mixed into a past story, „ponad czyjekolwiek zrozumienie” →
   „W kilka lat gospodarka urosła tak, że nikt już jej nie rozumiał” (*the economy grew beyond anyone's
   understanding*).
6. `ending.agent_economy.story` — „To wolniejszy sposób rządzenia kontynentem, ale wciąż europejski” → „Kontynentem
   rządzi się wolniej, ale wciąż rządzi nim Europa” (*a slower way to run a continent, and it is still Europe's*).
7. `request.mum_triage_pilot.*`, `letter.mum2_chest`, `voice.v_nurse` — „AI do **segregacji** pacjentów” → „AI,
   która ustala, kogo na **SOR-ze** przyjąć najpierw” (*AI that sorts emergency patients*).
8. `epilogue.gaveIn.malik` — „W domu wciąż nic nie ma” → „U nas w Europie wciąż nic dla mnie nie ma” (*There's still
   nothing back home*: read as *the house is empty*).
9. `voice.v_open_keep` — „Tym razem Bruksela **nie mrugnęła**” → „Tym razem Bruksela **się nie ugięła**”
   (*Brussels didn't blink*: calque).
10. `card.weight_security.proposal` / `ups.0` — „kradzież zostałaby **skrócona**” → „kradzież zostałaby **szybciej
    przerwana**, ale nie powstrzymana”; chip „Kradzież AI: częściowo **ograniczona**” (*a theft would be cut
    short, not stopped*).

Also worth a look: `ending.loss_of_control.title` („Ludzie tracą kontrolę nad AI”), `letter.r4_novel` („Tu trzeba
ludzkiej ręki”), `us_security_pact.right.reaction` („Witamy w gronie wtajemniczonych”, was „w środku namiotu”),
`engine.fiveEyes.cause` („Londyn ulega pokusie oferty Waszyngtonu”, the old word order read backwards).

## To confirm (native check)

- `epilogue.hot_war.lea` keeps „Wiem, że się starasz” (present) for *I know you tried*: the past tense would gender
  the player.
- `ending.silicon_blackmail.title` „Europa zakładniczką Big Techu”: „Big Tech” is common in the Polish press; the
  long form is „…wielkich firm technologicznych”.
- `card.coalition.levels.*` „Wchodzą Brytania i Norwegia” (short for the card face; elsewhere „Wielka Brytania”).
- `threat.stage.3` „Tuż-tuż” (colloquial) for *Imminent*.
- Li Wen („Delegat Chin”) and Sam Okafor („Dziennikarz śledczy”) are masculine; their lines avoid gendered forms,
  so only the role would change if the team decides otherwise.
