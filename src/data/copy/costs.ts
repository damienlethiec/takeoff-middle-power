// "What this costs in the real world": shown in the card preview only where a sourced figure exists.
// Each figure was checked on its primary source (docs/FACT_CHECK.md, v2 additions). Cards without a
// trustworthy real-world equivalent (coalition, talks, ASML lever, audit, mandate, weight security,
// context cards) deliberately have no line.

import { SOURCES } from '../sources';
import type { RealCostCopy } from './types';

export const REAL_COSTS: RealCostCopy[] = [
  {
    card: 'ai_office',
    text: 'The real EU AI Office employs more than 125 staff (2026).',
    source: SOURCES.aiOffice,
  },
  {
    card: 'host_verification',
    text: 'For comparison, the IAEA budgeted about €171 million for its nuclear verification work in 2025.',
    source: SOURCES.iaeaBudget2025,
  },
  {
    card: 'fund_alignment',
    text: 'In 2025 the UK launched a global fund of over £15 million for alignment research.',
    source: SOURCES.aisiAlignment,
  },
  {
    card: 'open_models',
    text: 'OpenEuroLLM, building open models for all EU languages, has €37.4 million, €20.6 million of it from the EU (2025).',
    source: SOURCES.openEuroLlm,
  },
  {
    card: 'cyber_defence',
    text: 'In 2025 the EU set aside €30 million to strengthen the cybersecurity of hospitals and healthcare providers.',
    source: SOURCES.euCyberHealth,
  },
  {
    card: 'flexicurity',
    text: 'The EU fund for workers hit by mass layoffs can spend up to €30 million a year (2018 prices). In 2025 it gave €0.9 million to help 417 laid-off chip workers in Belgium.',
    source: SOURCES.egfBelgan,
  },
];
