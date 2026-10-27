# Relecture française

Relecture de `src/i18n/fr.json` contre l’anglais de référence (`src/i18n/en.json`, conventions dans
`docs/LANGUAGE_REVIEW.md`). Objectif : un français naturel, écrit comme par un auteur de jeu francophone, pas traduit.

## Termes du jeu

| Concept (anglais) | Français | À éviter |
|---|---|---|
| AI progress (la jauge horloge) | **Progrès de l’IA** | capacités de l’IA, puissance de l’IA |
| takeoff, AI takes off | **décollage**, l’IA **décolle** | point de bascule, singularité |
| AI safety, verified / labs claim | **Sûreté de l’IA** : ce qui est **vérifié**, ce que les **labos annoncent** | sécurité de l’IA (pour la jauge), confiance |
| real safety | la **sûreté réelle**, « la vérité » | |
| US–China cooperation, Pause / Race / Rupture | **Coopération États-Unis–Chine**, zones **Pause / Course / Rupture** | |
| Social cohesion | **Cohésion sociale** | |
| Influence | **Influence** (majuscule) | points, budget |
| Europe’s AI: Open / Dependent | **L’IA de l’Europe : Ouverte / Dépendante** | |
| round | **tour** (six mois) | manche |
| a policy card | **une décision** (« carte » désigne toujours la carte du monde) | carte |
| request | **demande** | requête |
| the AI Office | **le Bureau de l’IA** | Office de l’IA |
| the labs cut Europe off | les labos **débranchent l’Europe** / menacent de la débrancher | couper l’Europe |
| “controlled pilot” | « projet pilote encadré » | pilote contrôlé |
| In this story / In AI 2027 / In the CFG scenarios | **Dans cette histoire** / **Dans AI 2027** / **Dans les scénarios du CFG** | |
| Breaking news | **Flash info** | |

## Registre

- Interface, aide, astuces, décisions : **vous**, phrases courtes, présent, vocabulaire courant.
- Léa, Malik et la mère tutoient le joueur. Léa : chaleureuse, drôle, concrète (le marché, Hugo, la Croix-Rousse) ;
  signe « L. ». La mère : attentionnée et pratique, ouvre « Mon trésor, », juge l’IA à ce qui arrive aux patients,
  signe « Bisous, Maman ». Malik : enthousiaste puis déchiré, parle « boîte », « boulot » ; signe « M. ».
- Personnages des demandes : chacun parle à la première personne avec sa voix (Dana Whitfield directe et
  transactionnelle, Li Wen polie et imagée, Marcus Hale vendeur, Dr Moreau précise et méfiante, etc.).
- Titres de presse : brefs, au présent, sans point final. Témoignages : oraux, un détail concret.

## Typographie

- Espace insécable (U+00A0) avant « : » ; espace fine insécable (U+202F) avant « ; ? ! » et à l’intérieur des
  guillemets « ».
- Apostrophe typographique ’, points de suspension …, tiret demi-cadratin dans les paires (États-Unis–Chine) et
  intervalles (30–59), signe moins − dans les nombres.
- Nombres : espace fine insécable comme séparateur de milliers (931 690 €).
- Pas de majuscule aux mois ni aux nationalités adjectivales ; « M. », « Mme », « Dr » sans point final pour Dr.
- Gabarits (`engine.*`) : jamais d’adjectif accordé avec un nom invisible ; les jauges de fin (`engine.ending.*`)
  ne reçoivent que la Sûreté de l’IA ou la Cohésion sociale, toutes deux féminines (« la {gauge} était à… »). Le
  conseiller cite une décision entre guillemets (« {card} » aiderait), sans « La carte ».

## Relecture du 27 octobre 2026

Toutes les familles relues contre l’anglais (≈ 700 chaînes modifiées sur 2 074) : fins, mondes, épilogues, lettres,
demandes, décisions, titres, témoignages, événements sociaux, menaces, flashs info, jalons, fuites, interface, aide,
astuces, glossaire, gabarits. Vérification visuelle (`SHOTS_QUERY=lang=fr node scripts/shots.mjs`) à 1280×800 et
390×844 : pas de débordement.

### Les dix corrections les plus marquantes

| Clé | Avant | Après |
|---|---|---|
| `epilogue.hot_war.lea` | La guerre est à l’autre bout du monde, et dans ma cuisine : … chaque soir les infos montrent des machines qui combattent des machines. | La guerre est à l’autre bout du monde, et pourtant jusque dans ma cuisine : … chaque soir, aux infos, des machines se battent contre des machines. |
| `epilogue.hot_war.malik` | J’ai aidé à construire ce avec quoi ils se battent. | J’ai aidé à construire les armes de cette guerre. |
| `ending.loss_of_control.story` | Chacune voulait autre chose. Rien de tout cela n’était ce que nous voulions. | Chacune poursuivait son propre but. Aucun n’était le nôtre. |
| `ending.cognitive_revolution.story` | C’était la voie la plus dangereuse, et cette fois elle a tenu … l’économie grandit au-delà de ce que quiconque comprend. (temps mélangés) | C’était le pari le plus dangereux, et cette fois il a réussi … l’économie a dépassé l’entendement de quiconque. |
| `threat.blackmail.name` (et 15 autres) | Menace de couper l’Europe | Menace de débrancher l’Europe |
| `ending.unstable_pause.story` | un « pilote contrôlé » a discrètement relancé la course | un « projet pilote encadré » a discrètement relancé la course |
| `engine.advisor.*` | La carte « {card} » nous protégerait. (« carte » = la carte du monde) | « {card} » nous protégerait. |
| `engine.ending.below` | Sûreté de l’IA était à 59 … (article manquant à l’écran) | La Sûreté de l’IA était à 59 … |
| `request.jn_whistleblowers.left.why` | Les critiques disent que l’Europe abandonne les lanceurs d’alerte (1,8× l’anglais) | L’Europe accusée de lâcher ses sources |
| `letter.mum1_diabetic` | Je l’ai écrit en rouge sur son dossier. Vieilles habitudes. | Je l’ai noté au stylo rouge sur sa feuille. On ne se refait pas. |
