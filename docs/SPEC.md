# Takeoff: Middle Power: game spec

The game design is now **v3**: see [V3_SPEC.md](V3_SPEC.md) (player-facing design, source of truth for intent).

- What the game takes from its source scenarios: [SCENARIO_BASIS.md](SCENARIO_BASIS.md)
- Exact rules, numbers and tuning history: [DEVELOPER_NOTES.md](DEVELOPER_NOTES.md)
- How v3 was built, decisions on open points, realism notes and known issues: [V3_BUILD_NOTES.md](V3_BUILD_NOTES.md)

The v1 and v2 specs (16 quarters, Budget and Political Capital, the four plans at the tipping point) are in the git history of this file and in [V2_SPEC.md](V2_SPEC.md). The v2 game stays online on `main` until v3 is validated by playtests.

## Changed from Louis's draft

The v3 deck is the spec's first draft, tuned by the simulation. Changes to Louis's original cards and events, for his review:

- **Diplomatic talks** (new in v2) and **Independent audit** (new in v3) are not in Louis's draft.
- **Measure human influence** (v2) is removed: the hidden human-influence scores are gone; Cohesion carries that idea.
- **Host verification** becomes **Offer to host inspections → Inspection accord → Joint inspectorate** (three levels).
- **The warning shot** becomes the **AI incident** threat, sourced to CFG's Diplomacy scenario ("Nova").
- Card numbers (costs, effects) differ from the V3 spec's first draft: see DEVELOPER_NOTES, "Tuning changes".
