# Language review

The English is the source: the four language editors (fr, de, es, pl) review their file against it. Each language
has its own section below; `docs/I18N.md` has the mechanics (keys, placeholders, plurals, punctuation per language).

## English (reviewed 27 Oct 2026)

Every player-facing English string was read: endings and epilogues, the friends' letters, requests, cards, headlines,
voices, social events, threats, Breaking news, milestones, leaks, tips, help, glossary, the engine's templates and the
interface. Lines were changed where they were vague, clumsy, inconsistent with the game's terms or with the moment
they are shown; meanings, facts, sources, numbers and effects are unchanged. The commits are titled
"English review: …".

### Spelling and typography

- **British English** throughout: centre, programme, licence (noun) / license (verb), -ise (organise, mobilise,
  decentralised), colour, sceptical, unrecognisable, Mum, "any more". Proper names keep their own spelling (the
  Center for AI Safety).
- Curly quotes and apostrophes: ’ “ ” (never ' or "). The en dash in ranges and
  pairs (US–China, 30–59, 2027–2031), the minus sign − in numbers (−3), the arrow → in changes.
- Titles of people without a full stop: Dr Ines Moreau, Mrs Bernard, Mr Petit.
- Countries by their usual short names: the US, the UK (Britain in prose), China, **South Korea** (not "Korea", except
  the tight map label), Czechia.
- No exclamation marks in the system's voice; characters may use them.

### The game's terms (use them, and only them)

| Concept | Term | Not |
|---|---|---|
| The clock gauge | **AI progress** | AI capabilities, AI power |
| AI improving itself, the end of the game | **takeoff**, AI **takes off** | tipping point, singularity |
| The safety gauge | **AI safety**: what is **verified** and what the **labs claim** | confidence, estimate, alignment score |
| The hidden value | **real safety** / "the truth" (never shown as a number) | |
| The superpowers' gauge | **US–China cooperation**, zones **Pause / Race / Rupture** (capitalised as zones) | |
| Europe's gauge | **Social cohesion** | cohesion alone in a sentence's start |
| The resource | **Influence** (capitalised) | points, budget |
| The badge | **Europe’s AI: Open / Dependent** | |
| A half-year | a **round** (six months) | a turn |
| Who speaks for Europe | "you"; the players never see "Envoy" | envoy, Envoy |
| People who talk between capitals | **diplomats** | envoys |
| The EU body | **the AI Office** (the EU's AI Office, created by the AI Act) | |
| Being cut off by US labs | the labs **cut Europe off** / threaten to | switch Europe off |
| Fiction | "In this story", "In AI 2027", "In the CFG scenarios", "In Europe 2031" | |

Cards' effect chips say the move in words ("US–China cooperation: up a little"); numbers appear only once a decision
is made. Advisor lines never contain numbers.

### Tone

- **The system** (tips, help, card faces, Breaking news): plain, short, present tense, second person ("you"), a
  14-year-old should follow. No jargon without the glossary.
- **Headlines**: terse, present tense, no full stop needed when a single clause, at most 90 characters on a banner.
  Fiction headlines may open "In this story,".
- **Voices**: oral and personal, "A nurse in Milan: “…”", one concrete detail.
- **Characters' requests**: each speaks in the first person with their own interest. Dana Whitfield (US) blunt and
  transactional; Li Wen (China) polite, proverb-like, never threatening openly; Marcus Hale (OpenBrain) salesman's
  confidence; Dr Ines Moreau precise and wary; Katrin Vogel (unions) direct; Tomas Novak (open models) idealistic;
  General Brandt terse; Minister Sato measured; Sam Okafor (journalist) urgent; the AI ("Agent") smooth and flattering,
  offering help that would give it more power.
- **The friends** (letters and epilogues): first person, concrete, warm, no policy words, no numbers (spelled-out
  ages and the like are fine), each epilogue ≤ 35 words.
  - **Léa** (translator in Lyon): warm, funny, concrete about daily life (her work, the market, her cousin Hugo, her
    landlord, bread and trains); signs "L.".
  - **Your mother** (retired nurse in Lyon): caring and practical, opens "My darling,", judges AI by what happens to
    patients, keeps her old habits; signs "Love, Mum".
  - **Malik** (your old flatmate, an engineer at a San Francisco lab): enthusiastic about the work, then torn as the
    race and the rivalry close in; Wei is his teammate from Chengdu (name him as "my old teammate" in every text
    that may be read alone); signs "M.".
- Each epilogue names what changed in the friend's own life (a price, a job, a person), not an abstraction: "The war
  is half a world away, and in my kitchen: bread costs twice as much…", not "The war is far away and everywhere."

### Notes for the translators

- Keep each friend's register: Léa and Malik tutoie / duzen / tutean / mówią "ty"; the mother too. The interface
  addresses the player as each file already does (French uses "vous" in the interface, "tu" in the friends' letters).
- Lines changed in meaning by this review were retranslated minimally in all four files so they say the same thing;
  polish them freely. Pure punctuation changes were not carried over.
- Where English names a specific person who may not have been introduced (Wei, Hugo), say who they are, as the
  English does.
