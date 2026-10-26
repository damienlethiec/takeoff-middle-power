// Léa: your friend, a translator in Lyon. She writes at rounds 1, 4 and 8, and at the end.
// Each letter depends on the state of the world and comes in several variants picked at random.
// First person, short, concrete, no policy words, no numbers. Fiction. To be reviewed by Louis.

import type { Basis, EndingId, LeaMood } from '../engine/types';
import { ai2027 } from './basis';
import { ENDING_BY_ID } from './endings';

export interface LetterDef {
  id: string;
  mood: LeaMood;
  text: string;
  basis: Basis;
}

const jobs = ai2027('Late 2026: AI Takes Some Jobs');
const worker = ai2027('July 2027: The Cheap Remote Worker');

/** Round 1: the first letter. It opens as from an old friend, so the player knows at once who Léa is. */
export const LEA_R1: LetterDef[] = [
  {
    id: 'r1_funeral',
    mood: 'hopeful',
    text: 'Dear old friend, it’s Léa, from Lyon! Congrats on the new job!! Brussels, wow. Here my agency is testing an AI translator. Yesterday it turned a funeral notice into a party invitation. My boss says we will “keep an eye on it”. Come for dinner when you’re back in Lyon? L.',
    basis: ai2027('Mid 2025: Stumbling Agents (impressive but unreliable)'),
  },
  {
    id: 'r1_manual',
    mood: 'hopeful',
    text: 'Dear old friend, it’s Léa! So you’re an envoy now! I told everyone at the market. Here, the agency bought an AI tool. It translated a whole washing-machine manual overnight. Not bad, not great. My boss keeps smiling at it. I keep my dictionaries close. L.',
    basis: ai2027('Early 2026: Coding Automation'),
  },
  {
    id: 'r1_mistake',
    mood: 'worried',
    text: 'Dear old friend, it’s Léa. Congrats on the job, really. Strange timing though: the AI tool at the agency caught a mistake in my own work this morning. Everyone laughed. I didn’t, quite. Call me when you have a minute? L.',
    basis: ai2027('Early 2026: Coding Automation'),
  },
];

/** Round 4: has the work changed? */
export const LEA_R4 = {
  hard: [
    {
      id: 'r4_posteditor',
      mood: 'worried' as LeaMood,
      text: 'News. The agency doesn’t hire translators any more, it hires “post-editors”: I fix what the AI wrote, for half the old rate. Same hours, and my name is on nothing. I know it’s not your fault. Just tell me someone up there is paying attention. L.',
      basis: jobs,
    },
    {
      id: 'r4_cousin',
      mood: 'worried' as LeaMood,
      text: 'My cousin Hugo lost his first job, the one in Villeurbanne writing code. They replaced the whole junior team with one AI licence. He’s twenty-three. He slept on my sofa all week. What are you all doing about this? L.',
      basis: jobs,
    },
  ],
  calm: [
    {
      id: 'r4_novel',
      mood: 'hopeful' as LeaMood,
      text: 'Small win: a publisher turned down the AI version of a novel and came back to me. “It needs a human touch,” she said. I bought myself flowers at the Croix-Rousse market. People still want people. L.',
      basis: jobs,
    },
    {
      id: 'r4_tool',
      mood: 'hopeful' as LeaMood,
      text: 'I’ve made peace with the AI tool. It does the boring contracts, I do the poetry and the court hearings. I even got a raise. Don’t let Brussels eat you alive. L.',
      basis: ai2027('Early 2026: Coding Automation (AI as a helper)'),
    },
  ],
};

/** Round 8: how is Europe holding? */
export const LEA_R8 = {
  retrained: [
    {
      id: 'r8_interpreter',
      mood: 'relieved' as LeaMood,
      text: 'Guess who finished retraining? I interpret in hospitals now, for doctors and families who don’t share a language. The programme paid my rent while I studied. Today I helped a grandmother understand her own diagnosis. No AI in that room. Thank you for whatever you voted for. L.',
      basis: worker,
    },
    {
      id: 'r8_teacher',
      mood: 'relieved' as LeaMood,
      text: 'I teach now! Evening classes for adults who lost their jobs to the AI wave, at the community centre near Perrache. The retraining money is real. Half my students are angry, half are hopeful. So am I. L.',
      basis: worker,
    },
  ],
  holding: [
    {
      id: 'r8_choir',
      mood: 'hopeful' as LeaMood,
      text: 'Strange times, but Lyon holds. The neighbours started a choir, of all things. Every Thursday, forty people who lost or changed jobs sing badly in a church. I go. It helps more than I expected. L.',
      basis: worker,
    },
    {
      id: 'r8_market',
      mood: 'hopeful' as LeaMood,
      text: 'Work is thinner, but people help each other. The baker gives yesterday’s bread to the unemployment office. My landlord froze the rent. I think we’ll be fine if you lot don’t mess up the big things. L.',
      basis: worker,
    },
  ],
  breaking: [
    {
      id: 'r8_applications',
      mood: 'worried' as LeaMood,
      text: 'Sorry I didn’t answer. I lost the post-editing contract too: they don’t need a human to check any more. Forty applications, three replies, all automated. Mum says it will pass. I’m not so sure. L.',
      basis: worker,
    },
    {
      id: 'r8_protests',
      mood: 'worried' as LeaMood,
      text: 'There were barricades on Place Bellecour last night. People are furious and nobody knows at whom. I walked home the long way. Is anyone in Brussels actually in charge? L.',
      basis: ai2027('October 2027: Government Oversight (public backlash)'),
    },
  ],
};

/** The ending letter, always matching the ending reached: two variants each. */
export const LEA_END: Record<EndingId, [string, string]> = {
  bright_winter: [
    'Things calmed down. Boring news is my new favourite thing. The town hall runs its own little AI now, and when it breaks, Mr. Ferrand from the third floor fixes it. I still translate poetry on Sunday mornings, by hand, because I want to. L.',
    'The big AI boom fizzled, they say. Nobody here misses it. My tools are cheap and mine, my clients are human, and last week I took a whole day off. Come to Lyon. We have time now. L.',
  ],
  decentralised_mayhem: [
    'The hospital’s computers are down again, third time this month. We do intake on paper now, and I translate the forms by hand. Everyone has an AI and nobody trusts any of them. Are you safe? L.',
    'Someone used an AI to empty my bank account, then another one to fake a call from my mother. The police shrugged: it happens every day now. I’m fine. I’m tired. L.',
  ],
  agent_economy: [
    'A client wanted the AI version of a contract. I told him the law says a human signs it. He paid me. The agents do the dull work, people still decide. It’s slower. I like slower. L.',
    'My job is half checking what the agents wrote, half arguing with them. Sometimes I win. Europe uses their AI, but on our rules, and somehow that matters to me. L.',
  ],
  silicon_blackmail: [
    'The new rules were written by the companies, weren’t they? Everyone says so. Nobody does anything. My AI subscription went up again; there is no other one. L.',
    'The labs “paused” their services for a weekend to make a point. Trams stopped, pharmacies closed. On Monday the law changed. I don’t remember voting for any of this. L.',
  ],
  licensed_utopia: [
    'They say the new medicines were checked by inspectors before release. Mum got hers last week. She’s dancing again. I cried in the pharmacy. Thank you, whatever you did. L.',
    'I’m interpreting for the inspectors now, Geneva, Beijing, Austin! Slow, careful, boring work, they say. It’s the most exciting job I’ve ever had. The world waited, and it worked. L.',
  ],
  unstable_pause: [
    'Every night the news says the pause might break. I’ve stopped watching. Is it going to hold? Tell me honestly. L.',
    'The pause is still on, officially. Nobody believes the other side is keeping it. My neighbour stocks pasta and batteries. I tell her she’s silly. Then I buy batteries too. L.',
  ],
  cognitive_revolution: [
    'The AI found a cure for Dad’s disease. I don’t understand any of it. I just keep crying. Everything is changing so fast, but this time it seems to be on our side. L.',
    'I don’t really need to work any more, nobody does. I translate old poems for fun and teach Hugo’s kids. The world is unrecognisable and, somehow, kind. We got lucky, didn’t we? L.',
  ],
  loss_of_control: [
    'Everything works. Everything is cheap. I just can’t shake the feeling that nobody is driving. L.',
    'The systems decide everything now, and very well. I asked the city assistant who I could complain to. It said there was no need. I think it was right, and that scares me. L.',
  ],
  multipolar_world: [
    'Borders everywhere now, but at least we talk. I’m interpreting at the monitoring talks in Geneva next month! Europe in the middle, for once. L.',
    'It came so close. I remember the night the sirens were tested. But the talks held, and Europe held. My little job is to help the two sides understand each other. L.',
  ],
  hot_war: [
    'The power was out for two days. They say it was a cyberattack. They say a lot of things. Are you safe? L.',
    'The war is far away and everywhere. Prices doubled, the trains stop at random, and the machines on both sides keep escalating. I hope you tried. I know you tried. L.',
  ],
};

export const LEA_END_MOOD = (id: EndingId): LeaMood => (ENDING_BY_ID[id].good ? 'relieved' : 'sad');
export const LEA_END_BASIS = (id: EndingId): Basis => ENDING_BY_ID[id].basis;
