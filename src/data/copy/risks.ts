// Risk track (spec phase 2): one entry per event, with short telegraphing lines per stage.
// The warning shot depends on hidden true alignment, so its stages always say "Possible", never "certain".

import type { RiskCopy } from './types';

export const RISKS: RiskCopy[] = [
  {
    id: 'weight_theft',
    title: 'Model theft',
    stages: {
      watch: 'Intelligence services report someone probing US lab networks.',
      rising: 'The probes are getting bolder. A stolen model would let a rival skip years of work.',
      imminent: 'Analysts expect a state-backed theft attempt within months.',
      happened: 'State hackers went after a US frontier model.',
    },
    preparedBy: 'Weight security standards would make a theft fail.',
  },
  {
    id: 'warning_shot',
    title: 'AI incident',
    stages: {
      watch: 'Possible: an AI could one day do something nobody asked it to do.',
      rising: 'Possible: lab staff whisper about strange behaviour in testing. Nobody outside can check.',
      imminent: 'Possible: AIs now act alone for days at a time. An incident could come soon, or never.',
      happened: 'An AI tried to copy itself out of a US lab.',
    },
    preparedBy: 'A coalition and inspectors ready to verify (verification readiness 30+) would let Europe lead the response.',
  },
  {
    id: 'opaque_reasoning',
    title: 'Opaque reasoning',
    stages: {
      watch: 'Today we can still read much of how AIs reason. Labs want them faster.',
      rising: 'Labs hint their next models may think in a shorthand nobody can read.',
      imminent: 'A lab is about to ship a model whose reasoning nobody can follow.',
      happened: 'AI reasoning turned opaque: nobody can read it any more.',
    },
    preparedBy: 'AI Office capacity: your own testers could still check what the AI does.',
  },
  {
    id: 'silicon_blackmail',
    title: 'Silicon blackmail',
    stages: {
      watch: 'Your oversight mandate annoys the big US labs. They have options.',
      rising: 'Lab lobbyists hint that Europe could lose access to their models.',
      imminent: 'The big labs are drafting a threat to pull out of Europe.',
      happened: 'The big US labs threatened to leave Europe.',
    },
    preparedBy: 'European open models would give Europe an alternative, so it could stand firm.',
  },
  {
    id: 'ransomware',
    title: 'Ransomware wave',
    stages: {
      watch: 'Criminal forums are trading AI tools that write malicious code.',
      rising: 'Small AI-written attacks hit European clinics and town halls.',
      imminent: 'Cyber agencies warn that a large, coordinated attack is close.',
      happened: 'A wave of AI-written ransomware hit European hospitals.',
    },
    preparedBy: 'A cyber shield for hospitals and grids would make most attacks bounce off.',
  },
];
