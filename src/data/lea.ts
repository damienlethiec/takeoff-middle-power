// Léa: a close friend of the player, 34, translator in Lyon.
// Her scenes are picked from the hidden state, so she hints at what the gauges hide. No numbers.

import type { EndingId, Speed } from '../engine/types';

export const LEA_Q1: Record<Speed, string> = {
  slow:
    'Hey you, congrats on the new job!! Brussels, wow. Here, my agency is testing an AI translation tool. It’s clumsy: it turned a funeral notice into a party invitation yesterday. My boss says we’ll “keep an eye on it”. Come visit when you’re back in Lyon? L.',
  steady:
    'Hey you, congrats on the new job!! Here, my agency is testing an AI translation tool. Honestly? It’s decent. Not good enough for contracts, but it did a whole user manual overnight. My boss keeps smiling at it. Come for dinner when you’re in Lyon. L.',
  fast:
    'Hey. Congrats on the job, really. Weird timing though: my agency is testing an AI translation tool and it’s scary good. It caught a mistake in my own work this morning. Everybody laughed. I didn’t. Call me sometime? L.',
};

export const LEA_Q6 = {
  good:
    'Small win today: a publisher turned down the AI version of a novel and came back to me. “It needs a human touch,” she said. I bought myself flowers. The market is strange, but people still want people. Hope Brussels isn’t eating you alive. L.',
  bad:
    'So, news. The agency doesn’t hire translators any more. It hires “post-editors”: I fix what the AI wrote, for half the old rate. Same hours, half the pay, and nobody reads my name anywhere. I know it’s not your fault. Just tell me someone up there is paying attention. L.',
};

export const LEA_Q11 = {
  retrained:
    'Guess who just finished retraining? I’m an interpreter now, in hospitals: doctors and families who don’t share a language. The programme paid my rent while I studied. Today I helped a Syrian grandmother understand her own diagnosis. No AI was allowed in that room. Thank you for whatever you voted for. L.',
  between:
    'Sorry I didn’t answer last month. I lost the post-editing contract too: they don’t need a human to check any more. I’ve applied to 40 jobs. Three replies, all automated. Mum says it will pass. I’m not so sure. Write when you can. L.',
};

export const LEA_END = {
  high: 'I still translate poetry on Sunday mornings, by hand, because I want to. On weekdays I argue with a machine about word choices, and sometimes I win. L.',
  low: 'Me? I don’t translate any more. Nobody asks me to. I tell everyone I’m fine. I’m not sure I believe it. L.',
};

// Opening line of Léa's last message, in her own voice, then LEA_END follows.
export const LEA_ENDING_LINE: Record<EndingId, string> = {
  bright_winter: 'Things calmed down. Boring news is my new favourite thing.',
  decentralised_mayhem: 'The hospital’s computers are down again, third time this month. We do intake on paper now.',
  agent_economy: 'A client wanted the AI version. I told him the law says a human signs it. He paid.',
  silicon_blackmail: 'The new rules were written by the companies, weren’t they? Everyone says so. Nobody does anything.',
  licensed_utopia: 'They say the new medicines were checked by inspectors before release. Mum got hers last week. She’s dancing again.',
  unstable_pause: 'Every night the news says the pause might break. I’ve stopped watching. Is it going to hold? Tell me honestly.',
  multipolar_world: 'Borders everywhere now, but at least we talk. I’m interpreting at the trade talks in Geneva next month!',
  hot_war: 'The power was out for two days. They say it was a cyberattack. They say a lot of things. Are you safe?',
  cognitive_revolution: 'The AI found a cure for Dad’s disease. I don’t understand any of it. I just keep crying.',
  loss_of_control: 'Everything works. Everything is cheap. I just can’t shake the feeling that nobody is driving.',
};
