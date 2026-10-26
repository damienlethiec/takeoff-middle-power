# Takeoff: Europe’s Next Move: game spec

The game is now **v4**, *Takeoff: Europe’s Next Move*: see [V4_SPEC.md](V4_SPEC.md) (the game as built, and what changed from v3). The model and the ten endings are v3's: [V3_SPEC.md](V3_SPEC.md) stays the reference for them.

- What the game takes from its source scenarios: [SCENARIO_BASIS.md](SCENARIO_BASIS.md)
- Exact rules, numbers and tuning history: [DEVELOPER_NOTES.md](DEVELOPER_NOTES.md)
- How v4 was built, decisions, realism notes and known issues: [V4_BUILD_NOTES.md](V4_BUILD_NOTES.md) (v3's: [V3_BUILD_NOTES.md](V3_BUILD_NOTES.md))

The v1 and v2 specs (16 quarters, Budget and Political Capital, the four plans at the tipping point) are in the git history of this file and in [V2_SPEC.md](V2_SPEC.md).

## Changed from Louis's draft

The v3 deck (unchanged in v4) is the spec's first draft, tuned by the simulation. Changes to Louis's original cards and events, for his review:

- **Diplomatic talks** (new in v2) and **Independent audit** (new in v3) are not in Louis's draft.
- **Measure human influence** (v2) is removed: the hidden human-influence scores are gone; Cohesion carries that idea.
- **Host verification** becomes **Offer to host inspections → Inspection accord → Joint inspectorate** (three levels).
- **The warning shot** becomes the **AI incident** threat, sourced to CFG's Diplomacy scenario ("Nova").
- Card numbers (costs, effects) differ from the V3 spec's first draft: see DEVELOPER_NOTES, "Tuning changes".
