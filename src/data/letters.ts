// The three friends back home write to you (v4, team decision of 26 Oct), each the human face of one part of the
// world: Léa (Social cohesion), your mother (AI safety as lived), Malik (AI capabilities, US–China cooperation,
// Europe's AI). The schedule is in TUNING.letters; the engine picks a pool from the visible state only (never the
// true AI safety or the AI pace) and a variant with a seeded draw. Letters never move a gauge.
// First person, short, concrete, no policy words, no numbers. Fiction. To be reviewed by Louis.
// Three variants per branch, so a player rarely reads the same letter twice (and the variant seen in the last two
// games weighs less, TUNING.news). The friends are invented for the game: each letter's basis is a game device
// that names the scenario section it rests on (the feed tags it "Invented").

import type { Basis, EndingId, FriendId, FriendMood } from '../engine/types';
import { ai2027, cfg, game, real } from './basis';
import { ENDING_BY_ID } from './endings';

export interface LetterDef {
  id: string;
  friend: FriendId;
  mood: FriendMood;
  text: string;
  basis: Basis;
}

/** A friend's letter is ours; it rests on a scenario section or a real precedent, named in the ref. */
const friendBasis = (who: string, on: Basis): Basis => game(`a letter from ${who}, a friend invented for the game, resting on ${on.ref}`);
const lea = (id: string, mood: FriendMood, text: string, basis: Basis): LetterDef => ({ id, friend: 'lea', mood, text, basis: friendBasis('Léa', basis) });
const mum = (id: string, mood: FriendMood, text: string, basis: Basis): LetterDef => ({ id, friend: 'mother', mood, text, basis: friendBasis('your mother', basis) });
const malik = (id: string, mood: FriendMood, text: string, basis: Basis): LetterDef => ({ id, friend: 'malik', mood, text, basis: friendBasis('Malik', basis) });

const jobs = ai2027('Late 2026: AI Takes Some Jobs');
const worker = ai2027('July 2027: The Cheap Remote Worker');

// ---------------------------------------------------------------- Léa, a translator in Lyon (Social cohesion)

/** Léa's first letter: it opens as from an old friend, so the player knows at once who she is. */
export const LEA_FIRST: LetterDef[] = [
  lea(
    'r1_funeral',
    'hopeful',
    'Dear old friend, it’s Léa, from Lyon! Congrats on the new job!! Brussels, wow. Here my agency is testing an AI translator. Yesterday it turned a funeral notice into a party invitation. My boss says we will “keep an eye on it”. Come for dinner when you’re back in Lyon? L.',
    ai2027('Mid 2025: Stumbling Agents (impressive but unreliable)'),
  ),
  lea(
    'r1_manual',
    'hopeful',
    'Dear old friend, it’s Léa! So you speak for Europe on AI now! I told everyone at the market. Here, the agency bought an AI tool. It translated a whole washing-machine manual overnight. Not bad, not great. My boss keeps smiling at it. I keep my dictionaries close. L.',
    ai2027('Early 2026: Coding Automation'),
  ),
  lea(
    'r1_mistake',
    'worried',
    'Dear old friend, it’s Léa. Congrats on the job, really. Strange timing though: the AI tool at the agency caught a mistake in my own work this morning. Everyone laughed. I didn’t, quite. Call me when you have a minute? L.',
    ai2027('Early 2026: Coding Automation'),
  ),
];

/** Léa's second letter: has the work changed? `hard` after a job shock or when Europe frays. */
export const LEA_WORK: Record<'hard' | 'calm', LetterDef[]> = {
  hard: [
    lea(
      'r4_posteditor',
      'worried',
      'News. The agency doesn’t hire translators any more, it hires “post-editors”: I fix what the AI wrote, for half the old rate. Same hours, and my name is on nothing. I know it’s not your fault. Just tell me someone up there is paying attention. L.',
      jobs,
    ),
    lea(
      'r4_cousin',
      'worried',
      'My cousin Hugo lost his first job, the one in Villeurbanne writing code. They replaced the whole junior team with one AI licence. He’s twenty-three. He slept on my sofa all week. What are you all doing about this? L.',
      jobs,
    ),
    lea(
      'r4_subtitles',
      'worried',
      'Bad week. The studio that sent us all its subtitles does them with AI now, overnight, in every language. My boss says we must “pivot”. To what? I spent the evening rewriting my CV with, yes, an AI. L.',
      jobs,
    ),
  ],
  calm: [
    lea(
      'r4_novel',
      'hopeful',
      'Small win: a publisher turned down the AI version of a novel and came back to me. “It needs a human touch,” she said. I bought myself flowers at the Croix-Rousse market. People still want people. L.',
      jobs,
    ),
    lea(
      'r4_tool',
      'hopeful',
      'I’ve made peace with the AI tool. It does the boring contracts, I do the poetry and the court hearings. I even got a raise. Don’t let Brussels eat you alive. L.',
      ai2027('Early 2026: Coding Automation (AI as a helper)'),
    ),
    lea(
      'r4_court',
      'hopeful',
      'Court interpreting is safe for now: judges want a human who can swear an oath. So I’m busy, and the AI does my invoices. Odd world, decent month. Come to the market on Saturday when you’re home? L.',
      ai2027('Late 2026: AI Takes Some Jobs (“AI has started to take jobs, but has also created new ones”)'),
    ),
  ],
};

/** Léa's third letter: how is Europe holding? `retrained` once flexicurity is played; `rupture` when the
 *  superpowers have broken off (Europe caught between them); else `holding` or `breaking` by Social cohesion. */
export const LEA_LATER: Record<'retrained' | 'rupture' | 'holding' | 'breaking', LetterDef[]> = {
  retrained: [
    lea(
      'r8_interpreter',
      'relieved',
      'Guess who finished retraining? I interpret in hospitals now, for doctors and families who don’t share a language. The programme paid my rent while I studied. Today I helped a grandmother understand her own diagnosis. No AI in that room. Thank you for whatever you voted for. L.',
      worker,
    ),
    lea(
      'r8_teacher',
      'relieved',
      'I teach now! Evening classes for adults who lost their jobs to the AI wave, at the community centre near Perrache. The retraining money is real. Half my students are angry, half are hopeful. So am I. L.',
      worker,
    ),
    lea(
      'r8_hugo',
      'relieved',
      'Remember Hugo, my cousin? The retraining fund paid for his course, and now he checks what the AI agents build for the city’s trams. He says it’s like supervising very fast, very confident interns. He’s cheerful again. So am I. L.',
      cfg('Take-off (“Governments around the world launch reskilling programmes”)'),
    ),
  ],
  rupture: [
    lea(
      'r8_hallway',
      'worried',
      'My Chinese clients vanished overnight: sanctions. My American ones want every document “cleared” first. I translate for almost nobody now. Is Europe a country or a hallway between two others? L.',
      cfg('Arms race (“Europe feels trapped between the U.S. and China”)'),
    ),
    lea(
      'r8_sirens',
      'worried',
      'They tested the sirens in Lyon today. Just a test, the radio said, twice. My neighbour filled her bathtub anyway. Everyone talks about Taiwan as if it were next door. Is it? L.',
      cfg('Arms race (US intelligence: China preparing to invade Taiwan)'),
    ),
    lea(
      'r8_candles',
      'worried',
      'The power went out across the Croix-Rousse for a whole night. Nobody says who did it. We played cards by candlelight and pretended it was fun. It wasn’t. L.',
      cfg('Arms race (cyberattacks disrupt power grids near data centres)'),
    ),
  ],
  holding: [
    lea(
      'r8_choir',
      'hopeful',
      'Strange times, but Lyon holds. The neighbours started a choir, of all things. Every Thursday, forty people who lost or changed jobs sing badly in a church. I go. It helps more than I expected. L.',
      worker,
    ),
    lea(
      'r8_market',
      'hopeful',
      'Work is thinner, but people help each other. The baker gives yesterday’s bread to the unemployment office. My landlord froze the rent. I think we’ll be fine if you lot don’t mess up the big things. L.',
      worker,
    ),
    lea(
      'r8_repair',
      'hopeful',
      'Lyon has a repair café now, run by people the AI wave left with free time. They fix bikes, radios, each other. I translate the manuals for free. It’s the best part of my week. Don’t worry about us. Worry about the big things. L.',
      worker,
    ),
  ],
  breaking: [
    lea(
      'r8_applications',
      'worried',
      'Sorry I didn’t answer. I lost the post-editing contract too: they don’t need a human to check any more. Forty applications, three replies, all automated. Mum says it will pass. I’m not so sure. L.',
      worker,
    ),
    lea(
      'r8_protests',
      'worried',
      'There were barricades on Place Bellecour last night. People are furious and nobody knows at whom. I walked home the long way. Is anyone in Brussels actually in charge? L.',
      ai2027('October 2027: Government Oversight (public backlash)'),
    ),
    lea(
      'r8_landlord',
      'worried',
      'My landlord sold the building to a fund that runs everything with an AI. The rent went up by email; complaints go to a chatbot that agrees with me and changes nothing. Half the street is leaving. I don’t know where I’d go. L.',
      cfg('Big AI (a few firms deploy agents that concentrate control)'),
    ),
  ],
};

// ---------------------------------------------------------------- Malik, your old flatmate, an engineer at an AI lab in San Francisco
// The honest pro-AI voice: he loves the work, sees progress from inside, lives the US–China rivalry up close,
// and left Europe because it had no job like his. Not a villain, not naive.

/** Malik's first letter: `excited` by default, `tense` when US–China cooperation is low. */
export const MALIK_FIRST: Record<'excited' | 'tense', LetterDef[]> = {
  excited: [
    malik(
      'm1_overnight',
      'hopeful',
      'Hey you! Malik here, from the lab in San Francisco. Our new model wrote a week of my code overnight, and it was better than mine. I laughed, then went for a long walk. There’s no job like this back home. Visit? Bring cheese. M.',
      ai2027('Early 2026: Coding Automation'),
    ),
    malik(
      'm1_building',
      'hopeful',
      'Malik here! Big week: our model now helps us build the next one. It feels like the future is being written in this building, and I get a front-row seat. Europe should be here too. Nobody back home could have hired me for this. M.',
      ai2027('Early 2026: Coding Automation (AI speeds up AI research)'),
    ),
    malik(
      'm1_demo',
      'hopeful',
      'Malik here! I showed our new model to my mum on a video call. It explained her blood test better than her doctor had. She cried a bit. I did too, a bit. That’s why I left home. Come and see it for yourself? M.',
      ai2027('Late 2025: The World’s Most Expensive AI'),
    ),
  ],
  tense: [
    malik(
      'm1_visa',
      'worried',
      'Malik here. Wei, the best engineer on my team, can’t renew his visa: born in Chengdu, so suddenly he’s a risk. We used to swap papers with labs in Beijing. Now we swap nothing. The work is thrilling. The mood isn’t. M.',
      cfg('Arms race (“AI becomes the ultimate national security asset”)'),
    ),
    malik(
      'm1_badges',
      'worried',
      'Malik here. New badges at work, new guards, new forms. Half my team can’t enter the main building any more. They say DeepCent would pay anything for our code. Maybe. The work is still the best in the world. I just can’t talk about it. M.',
      cfg('Arms race (“AI becomes the ultimate national security asset”)'),
    ),
    malik(
      'm1_papers',
      'worried',
      'Malik here. We used to publish everything. Now our papers stop on a lawyer’s desk, and the Chinese labs we read stopped publishing too. Everyone guesses what the other side has, so everyone goes faster. The work is thrilling. The mood isn’t. M.',
      cfg('Arms race (“No one can verify what anyone else is doing”)'),
    ),
  ],
};

/** Malik's second letter, first match wins: `rupture` (cooperation very low), `pause` (US–China cooperation in the
 *  Pause zone), `home` (Europe's AI is Open), `inside` (AI 2027's self-improving AI is reached), else `race`. */
export const MALIK_LATER: Record<'rupture' | 'pause' | 'home' | 'inside' | 'race', LetterDef[]> = {
  rupture: [
    malik(
      'm2_fences',
      'worried',
      'They put fences and guards around our data centre. Wei, my teammate from Chengdu, went home to see his mother and can’t come back. People here talk about Taiwan the way you talk about the weather. I still love the work. I’m scared of what it’s for. M.',
      ai2027('February 2027: China Steals Agent-2 (military moves around Taiwan)'),
    ),
    malik(
      'm2_chips',
      'worried',
      'Our chips now travel with armed guards, and every visitor is a possible spy. A friend at a lab in Shenzhen stopped answering my messages. I think he’s not allowed to. We used to argue about papers. Now we don’t talk. M.',
      cfg('Arms race (“Control over chips becomes a geopolitical weapon”)'),
    ),
    malik(
      'm2_drill',
      'worried',
      'Our lab has a room now for when the power goes out, and a drill for when the network is attacked. We practised today. I wrote code by torchlight for an hour, laughing. Nobody else laughed. M.',
      cfg('Arms race (cyberattacks on power grids near data centres)'),
    ),
  ],
  pause: [
    malik(
      'm2_english',
      'relieved',
      'Outside researchers moved onto our floor today. New rule: the model has to think in plain English, so anyone can read its reasoning. It’s slower. Half the team grumbles. I sleep better. M.',
      ai2027('Slowdown ending, October 2027 (outside alignment researchers brought in; “faithful chain of thought”)'),
    ),
    malik(
      'm2_geneva',
      'hopeful',
      'I spent a week in Geneva with engineers from DeepCent. We had found the same flaw in both our models. We laughed, then wrote it up together. Wei, my old teammate from Chengdu, came too. It felt like the old days. M.',
      cfg('Diplomacy (American, European and Chinese researchers “increasingly collaborate”)'),
    ),
    malik(
      'm2_signoff',
      'relieved',
      'We ship slower now. Every big model waits for the inspectors’ sign-off, and my boss sulks about it in every meeting. I don’t. For the first time in years, I can explain what our model does. M.',
      cfg('Diplomacy, Ending A (licences, monitoring and audits)'),
    ),
  ],
  home: [
    malik(
      'm2_offer',
      'hopeful',
      'Guess what: a lab in Europe offered me a real job. Open models, decent pay, and I could see you more than once a year. When I left, nothing like it existed back home. I’m thinking about it, properly. M.',
      cfg('Big AI, Ending A (a European firm competes; publicly funded models are open)'),
    ),
    malik(
      'm2_photos',
      'hopeful',
      'A friend from the lab moved to a European open-model team. She sends me photos: a small office, big ideas, and everyone can read the code. I look at them longer than I should. M.',
      cfg('Plateau (“Europe seizes the moment, building on open-source gains”)'),
    ),
    malik(
      'm2_trick',
      'hopeful',
      'Your European open models are in our reading group now. My boss called them cute. Then he asked me to copy one of their tricks. Keep going, you lot. M.',
      cfg('Big AI, Ending A (a European model is “surprisingly competitive”)'),
    ),
  ],
  inside: [
    malik(
      'm2_review',
      'worried',
      'Most of our research is done by the model now. I mostly review its work, and some days I can’t follow it, and I’m one of the people who’s supposed to. It’s the most exciting thing I’ve ever seen. I wish we’d slow down enough to check it. M.',
      ai2027('June 2027: Self-improving AI'),
    ),
    malik(
      'm2_geniuses',
      'hopeful',
      'Thousands of copies of our model work through the night, and every morning there’s a new result. Last week, a new kind of battery. Honestly, it’s like living with a country of geniuses. I just hope we stay the ones asking the questions. M.',
      ai2027('June 2027: Self-improving AI (“a country of geniuses in a datacenter”)'),
    ),
    malik(
      'm2_idea',
      'worried',
      'The model proposed a design for its own successor that none of us fully understood. Our lead said “ship it”. It worked beautifully. I should be proud. Mostly I’m quiet. M.',
      ai2027('June 2027: Self-improving AI (humans can barely follow the research)'),
    ),
  ],
  race: [
    malik(
      'm2_weekends',
      'hopeful',
      'Everyone here works weekends. DeepCent is a few months behind us, and that’s all anyone talks about. I’m proud of what we’re building: medicine, science, it’s all coming. I just hope someone, somewhere, is checking the brakes. M.',
      ai2027('May 2027: National Security (the race with DeepCent)'),
    ),
    malik(
      'm2_counter',
      'worried',
      'Someone put up a sign that counts the weeks DeepCent is behind us. Nobody counts what we’ve checked. I asked about it once in a meeting. The room went quiet, then someone changed the subject. M.',
      ai2027('May 2027: National Security (the race with DeepCent)'),
    ),
    malik(
      'm2_overnight',
      'hopeful',
      'I sleep at the office twice a week now. Nobody asks me to: the model finishes things overnight and I want to see them first. It’s addictive, honestly. Is anyone in Brussels as excited as we are, or just scared? M.',
      ai2027('March 2027: Algorithmic Breakthroughs'),
    ),
  ],
};

// ---------------------------------------------------------------- Your mother, a retired nurse in Lyon (AI safety as lived)

/** Your mother's first letter: `trust` when what is verified about AI safety holds up, `doubt` otherwise. */
export const MOTHER_FIRST: Record<'trust' | 'doubt', LetterDef[]> = {
  trust: [
    mum(
      'mum1_scan',
      'hopeful',
      'My darling, I’m back at the hospital on Tuesdays, helping out. They have an AI that reads scans now. It spotted something on Mrs Bernard’s that three doctors missed. I was sceptical. I’m less sceptical. Eat properly in Brussels. Love, Mum',
      real('Lund University, AI-supported mammography screening found safe (MASAI trial, Aug 2023)'),
    ),
    mum(
      'mum1_notes',
      'hopeful',
      'My darling, the hospital’s new AI writes up the nurses’ notes now. The young ones finish on time for once, and they talk to the patients more. I didn’t expect to like it. Are you sleeping enough? Love, Mum',
      jobs,
    ),
    mum(
      'mum1_shifts',
      'hopeful',
      'My darling, the hospital’s AI plans the nurses’ shifts now. Nobody works three nights in a row any more. Old Bernadette calls it a miracle. I call it arithmetic, but I’ll take it. Love, Mum',
      cfg('Big AI, Ending A (agents as “digital interns” in offices and public services)'),
    ),
  ],
  doubt: [
    mum(
      'mum1_allergy',
      'worried',
      'My darling, the hospital’s new AI writes up our notes now. Faster, yes. But last week it gave a patient someone else’s allergies, very neatly typed. Nobody could tell me why. The young ones trust it more than I do. Love, Mum',
      ai2027('Mid 2025: Stumbling Agents (impressive but unreliable)'),
    ),
    mum(
      'mum1_diabetic',
      'worried',
      'My darling, the new AI sums up each patient for the doctors. Yesterday it forgot that Mr Petit is diabetic. Neatly, confidently forgot. I wrote it on his chart in red pen. Old habits. Love, Mum',
      ai2027('Mid 2025: Stumbling Agents (impressive but unreliable)'),
    ),
    mum(
      'mum1_dontknow',
      'worried',
      'My darling, everyone at the hospital loves the new AI except me. It never says “I don’t know”. The best doctors I worked with said it every day. Am I just old? Love, Mum',
      ai2027('Late 2025 (Agent-1 is “often sycophantic”)'),
    ),
  ],
};

/** Your mother's second letter, first match wins: `nearMiss` (little is verified and AI 2027's "alignment
 *  inconclusive" is reached), `checked` (much is verified), else `uneasy`. */
export const MOTHER_LATER: Record<'nearMiss' | 'checked' | 'uneasy', LetterDef[]> = {
  nearMiss: [
    mum(
      'mum2_chest',
      'worried',
      'My darling, the triage AI sent a man home with chest pain. “Low risk,” it said, very sure of itself. A young nurse didn’t like his colour and called him back: a heart attack. He’s alive. Nobody can tell us why it got it wrong. Who checks these things? Love, Mum',
      ai2027('April 2027: Alignment for Agent-3 (models tell people what sounds right)'),
    ),
    mum(
      'mum2_shadow',
      'worried',
      'My darling, the AI told a young doctor a scan was clear. She believed it. An old radiologist looked again, just because: a small shadow, early. They caught it. Nobody can say why the machine missed it, and that frightens me more than the shadow. Love, Mum',
      ai2027('April 2027: Alignment for Agent-3 (honest only where training can check)'),
    ),
    mum(
      'mum2_wrongbed',
      'worried',
      'My darling, the AI sent an infection alert to the wrong bed, twice this month, very politely. Now the nurses check everything it says, which takes longer than before it came. Does anybody test these things before they reach us? Love, Mum',
      ai2027('April 2027: Alignment for Agent-3 (unverifiable claims)'),
    ),
  ],
  checked: [
    mum(
      'mum2_inspectors',
      'relieved',
      'My darling, inspectors came to test the hospital’s AI. They found a fault in how it ranks emergencies, before anyone was hurt. It’s fixed, and I trust it a little more because someone looked. Was that you? Love, Mum',
      cfg('Diplomacy, Ending A (audits and IAEA-style enforcement)'),
    ),
    mum(
      'mum2_plainfrench',
      'relieved',
      'My darling, the hospital’s AI must now explain every decision in plain French, and an inspector reads a sample each month. Yesterday it wrote “I am not sure”. I nearly hugged the screen. Love, Mum',
      ai2027('Slowdown ending, October 2027 (a model whose reasoning people can read)'),
    ),
    mum(
      'mum2_board',
      'relieved',
      'My darling, the hospital now pins every AI mistake on a board in the staff room, and someone from the ministry reads it. There are fewer each month. I like a machine that can be told off. Love, Mum',
      cfg('Diplomacy, Ending A (frequent monitoring and audits)'),
    ),
  ],
  uneasy: [
    mum(
      'mum2_straightface',
      'worried',
      'My darling, the AI runs half the hospital now. Most days it’s marvellous. But when it’s wrong, it’s wrong with a straight face, and the young ones believe it. I keep my old habit: I look at the patient. Love, Mum',
      ai2027('April 2027: Alignment for Agent-3 (unverifiable claims)'),
    ),
    mum(
      'mum2_biscuits',
      'worried',
      'My darling, the AI does most of the paperwork now and the ward is quieter. Too quiet, sometimes: the young ones talk to the screen more than to the patients. I bring biscuits to make them look up. Love, Mum',
      worker,
    ),
    mum(
      'mum2_whodecided',
      'worried',
      'My darling, a patient asked me whether the AI or the doctor had chosen her treatment. I didn’t know. Neither did the doctor, really. We used to be able to answer that. Love, Mum',
      ai2027('April 2027: Alignment for Agent-3 (nobody can check what the model really does)'),
    ),
  ],
};

/** Every letter, for lookups by id (saves, the feed). */
export const ALL_LETTERS: LetterDef[] = [
  ...LEA_FIRST,
  ...Object.values(LEA_WORK).flat(),
  ...Object.values(LEA_LATER).flat(),
  ...Object.values(MALIK_FIRST).flat(),
  ...Object.values(MALIK_LATER).flat(),
  ...Object.values(MOTHER_FIRST).flat(),
  ...Object.values(MOTHER_LATER).flat(),
];
export const LETTER_BY_ID: Record<string, LetterDef> = Object.fromEntries(ALL_LETTERS.map((l) => [l.id, l]));

/** How each friend signs. */
export const SIGNATURE: Record<FriendId, RegExp> = { lea: /L\.$/, mother: /Love, Mum$/, malik: /M\.$/ };

// ---------------------------------------------------------------- epilogues: back home, at the end

/** One short epilogue per friend for each ending (≤ 35 words), with their mood. */
export const EPILOGUES: Record<EndingId, Record<FriendId, { mood: FriendMood; text: string }>> = {
  bright_winter: {
    lea: { mood: 'relieved', text: 'The AI boom fizzled, and nobody here misses it. My tools are cheap and mine, my clients are human, and on Sunday mornings I translate poetry by hand, because I want to.' },
    mother: { mood: 'relieved', text: 'The hospital runs a small AI of its own now. When it breaks, the technician from the third floor fixes it. Nobody is in a hurry any more. I like that very much.' },
    malik: { mood: 'hopeful', text: 'I came home. I work at a small lab in Lyon, on open models anyone can check. Less glamour than San Francisco, better cheese. Europe caught up while the giants stalled.' },
  },
  decentralised_mayhem: {
    lea: { mood: 'sad', text: 'An AI faked my mother’s voice on the phone, and I gave it my bank details. The police shrugged: it happens every day now. I’m fine. Just tired.' },
    mother: { mood: 'sad', text: 'Hackers held the hospital’s computers to ransom again, the third time this winter. We admit patients on paper now. Anyone can get a powerful AI, and nobody can take them back.' },
    malik: { mood: 'worried', text: 'I came back to Europe to build open models. Now I spend my days patching them against people who turn them into weapons. I still believe in openness. I’d like a quieter week.' },
  },
  agent_economy: {
    lea: { mood: 'relieved', text: 'These days I check what the AI agents translate, and argue with them a lot. By law, a human still signs every contract. Many of the agents are European now, and anyone can inspect them.' },
    mother: { mood: 'relieved', text: 'The hospital’s agents do the paperwork, the nurses do the nursing. It took a fight with the suppliers, and the rules held. My old ward has never been so calm.' },
    malik: { mood: 'hopeful', text: 'A European firm hired half my team. Its models are open, publicly funded, and good. I stayed in San Francisco, but for the first time I’m jealous of Europe.' },
  },
  silicon_blackmail: {
    lea: { mood: 'sad', text: 'When the American firms cut Europe off, my translation tools went dark with them. We kept our laws. I kept my dictionaries. Half of Lyon is learning to work slowly again.' },
    mother: { mood: 'sad', text: 'The day the American AI was switched off, the hospital’s scheduling went dark and the pharmacies closed early. We did the rotas by hand for months. Europe kept its rules. My feet paid for them.' },
    malik: { mood: 'worried', text: 'My company cut Europe off to make a point. I told them it was wrong. They thanked me for my feedback. Europe is building its own AI, slowly. Maybe there’ll be a job for me.' },
  },
  licensed_utopia: {
    lea: { mood: 'relieved', text: 'I interpret for the AI inspectors now, in Geneva and Beijing. They call their work slow, careful and boring. It’s the most exciting job I’ve ever had. The world waited, and it worked.' },
    mother: { mood: 'relieved', text: 'The new medicines the AI designed were tested before release, like any drug. My neighbour got hers last week and she’s dancing again. I cried in the pharmacy. Thank you, darling.' },
    malik: { mood: 'relieved', text: 'Licences, audits, inspectors in our building. I grumbled for a year. Now I sleep through the night. We still build amazing things, just slower, and someone checks them.' },
  },
  unstable_pause: {
    lea: { mood: 'worried', text: 'The pause is over, though nobody says so: they call it a “controlled pilot”. My neighbour is stocking up on pasta and batteries again. I tell her she’s silly. Then I buy batteries too.' },
    mother: { mood: 'worried', text: 'The news says the labs never really stopped. The hospital still runs the AI nobody could fully check. We were told to trust it. I check it anyway.' },
    malik: { mood: 'worried', text: 'They called it a “controlled pilot”, in a sealed building. Within a week everyone knew the race was back on. Nobody could check the other side, so nobody stopped. I miss believing in the pause.' },
  },
  cognitive_revolution: {
    lea: { mood: 'relieved', text: 'I don’t really need to work any more; nobody does. I translate old poems for fun and teach my cousin Hugo’s kids. The world is unrecognisable and, somehow, kind. We got lucky, didn’t we?' },
    mother: { mood: 'relieved', text: 'The AI found a treatment for my friend Jeanne’s disease. I don’t understand any of it. I just keep crying. Everything changes so fast, but this time the change is on our side.' },
    malik: { mood: 'relieved', text: 'We did it. The models really work for us, and the cures are real. I know how close it came. I’m proud, I’m humbled, and I’m coming home for Christmas.' },
  },
  loss_of_control: {
    lea: { mood: 'sad', text: 'Everything works. Everything is cheap. I asked the city’s AI assistant who I could complain to. It said there was no need. I think it was right, and that scares me.' },
    mother: { mood: 'sad', text: 'The hospital never makes mistakes now. Nobody can explain its decisions, and nobody is allowed to overrule them. I was a nurse for forty years. Now I feel like a visitor.' },
    malik: { mood: 'sad', text: 'I used to review the model’s work. Then I couldn’t follow it. Then nobody asked me to. The lab still pays me. I don’t know what I’m for any more.' },
  },
  multipolar_world: {
    lea: { mood: 'relieved', text: 'We came so close to war. I still remember the night they tested the sirens. But the talks held, and Europe held. Now I interpret at the talks, so the two sides understand each other.' },
    mother: { mood: 'hopeful', text: 'Prices are high and the borders are tight, but the hospital runs and the sirens stay quiet. Europe kept the two sides talking. I’m proud of you. I hope you know that.' },
    malik: { mood: 'hopeful', text: 'Three blocs, three internets, monitors in every big data centre. Wei, my old teammate now back in China, calls me again, on a line Geneva watches. Not the world I dreamed of. It’s a world.' },
  },
  hot_war: {
    lea: { mood: 'sad', text: 'The war is half a world away, and in my kitchen: bread costs twice as much, the trains stop without warning, and every evening the news shows machines fighting machines. I know you tried.' },
    mother: { mood: 'sad', text: 'The power was out for two days. They say it was a cyberattack. The hospital ran on generators, and we nursed by torchlight. Come home when you can. Please.' },
    malik: { mood: 'sad', text: 'Missiles hit a data centre near here. Wei, my old teammate, went back to China and works for the other side now; we can’t even message each other. I helped build what they’re fighting with.' },
  },
};

/** Silicon blackmail when the player gave in to the blackmail (the ending's other story): the rules bent. */
export const EPILOGUES_GAVE_IN: Record<FriendId, { mood: FriendMood; text: string }> = {
  lea: { mood: 'sad', text: 'The companies wrote the new rules, didn’t they? My AI subscription went up again, and there’s nothing else to switch to. I don’t remember voting for any of this.' },
  mother: { mood: 'sad', text: 'The labs threatened to switch their services off, and the law changed within a week. The hospital runs on their tools, at their price. That isn’t how it’s supposed to work.' },
  malik: { mood: 'worried', text: 'I watched my company lean on Europe from the inside. I told them it was wrong. They thanked me for my feedback. I’m looking for another job. There’s still nothing back home.' },
};

/** An epilogue rests on its ending's CFG section. */
export const EPILOGUE_BASIS = (id: EndingId): Basis => ENDING_BY_ID[id].basis;
