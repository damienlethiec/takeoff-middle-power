// AI 2027's milestones, in the scenario's order (docs/SCENARIO_BASIS.md, section 1).
// The engine reaches them strictly in this order. Their dates move with the hidden AI pace; the order never does.
// A milestone is reached when AI power passes its threshold, or when its threat strikes (`via`).
// Effects follow the scenario's cause and effect; their size is a game choice.

import type { Basis, GaugeKey, MilestoneId, RegionId, ThreatId } from '../engine/types';
import { ai2027 } from './basis';
import { TUNING } from './tuning';

const AT = TUNING.milestones.at;
const FX = TUNING.milestones.effect;

export interface MilestoneDef {
  id: MilestoneId;
  /** AI power that reaches it (ignored when `via` is set). */
  at: number;
  /** Reached when this threat strikes. */
  via?: ThreatId;
  region: RegionId;
  headline: string;
  /** When Europe was prepared for the threat that reaches it (the theft cut short). */
  headlinePrepared?: string;
  effect?: { key: GaugeKey | 'margin'; amount: number; cause: string };
  basis: Basis;
}

export const MILESTONES: MilestoneDef[] = [
  {
    id: 'coding_automation',
    at: 0,
    region: 'us',
    headline: 'OpenBrain says its AI now makes its own research half again as fast.',
    basis: ai2027('Early 2026: Coding Automation'),
  },
  {
    id: 'china_wakes_up',
    at: AT.china_wakes_up,
    region: 'cn',
    headline: 'Beijing merges its AI labs into DeepCent and builds a giant computing zone.',
    effect: { key: 'cooperation', amount: FX.china_wakes_up, cause: 'China pooled its AI labs into one national effort' },
    basis: ai2027('Mid 2026: China Wakes Up'),
  },
  {
    id: 'ai_takes_jobs',
    at: AT.ai_takes_jobs,
    region: 'us',
    headline: 'A cheap AI assistant hits the market. Junior programmers are the first to feel it.',
    effect: { key: 'cohesion', amount: FX.ai_takes_jobs, cause: 'anti-AI protests in Washington find echoes in European cities' },
    basis: ai2027('Late 2026: AI Takes Some Jobs'),
  },
  {
    id: 'agent2_internal',
    at: AT.agent2_internal,
    region: 'us',
    headline: 'OpenBrain keeps its newest model in-house. Insiders say it never stops learning.',
    effect: { key: 'margin', amount: FX.agent2_internal, cause: 'OpenBrain kept its newest model away from outside testers' },
    basis: ai2027('January 2027: Agent-2 Never Finishes Learning'),
  },
  {
    id: 'weight_theft',
    at: 0,
    via: 'theft',
    region: 'cn',
    headline: 'Model weights stolen from OpenBrain: the theft took under two hours.',
    headlinePrepared: 'A theft of OpenBrain’s model weights is cut short; part of the model gets out.',
    basis: ai2027('February 2027: China Steals Agent-2'),
  },
  {
    id: 'superhuman_coder',
    at: 0,
    via: 'opaque',
    region: 'us',
    headline: 'OpenBrain now runs thousands of AI copies that code better than its best engineers.',
    basis: ai2027('March 2027: Algorithmic Breakthroughs'),
  },
  {
    id: 'alignment_inconclusive',
    at: AT.alignment_inconclusive,
    region: 'us',
    headline: 'OpenBrain calls its new model “aligned”. Its own safety tests say “inconclusive”.',
    effect: { key: 'confidence', amount: FX.alignment_inconclusive, cause: 'OpenBrain declared its new model aligned' },
    basis: ai2027('April 2027: Alignment for Agent-3'),
  },
  {
    id: 'national_security',
    at: AT.national_security,
    region: 'us',
    headline: 'Washington treats frontier AI as a state secret. Allies get fewer briefings.',
    effect: { key: 'margin', amount: FX.national_security, cause: 'Washington stopped sharing what its labs are building' },
    basis: ai2027('May 2027: National Security'),
  },
  {
    id: 'self_improving',
    at: AT.self_improving,
    region: 'us',
    headline: '“A country of geniuses in a datacenter”: AI now does most of OpenBrain’s research.',
    basis: ai2027('June 2027: Self-improving AI'),
  },
  {
    id: 'cheap_remote_worker',
    at: AT.cheap_remote_worker,
    region: 'us',
    headline: 'OpenBrain announces AGI and sells a cheap AI that does a whole office job.',
    basis: ai2027('July 2027: The Cheap Remote Worker'),
  },
  {
    id: 'geopolitics',
    at: AT.geopolitics,
    region: 'cn',
    headline: 'Beijing floats arms-control talks on AI. Washington does not answer.',
    effect: { key: 'cooperation', amount: FX.geopolitics, cause: 'arms-control overtures on AI went nowhere' },
    basis: ai2027('August 2027: The Geopolitics of Superintelligence'),
  },
  {
    id: 'tipping_point',
    at: AT.tipping_point,
    region: 'us',
    headline: 'AI now does AI research on its own, fifty times faster than humans. The tipping point.',
    basis: ai2027('September 2027: Agent-4, the Superhuman AI Researcher'),
  },
];

export const MILESTONE_BY_ID = Object.fromEntries(MILESTONES.map((m) => [m.id, m])) as Record<MilestoneId, MilestoneDef>;
