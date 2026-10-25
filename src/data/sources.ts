import type { Source } from '../engine/types';

export const SOURCES = {
  europe2031: { label: 'Europe 2031 (recommendations)', url: 'https://europe2031.ai/summary' },
  europe2031Labour: { label: 'Europe 2031 (labour recommendation)', url: 'https://europe2031.ai/summary' },
  aiOffice: { label: 'European Commission, European AI Office', url: 'https://digital-strategy.ec.europa.eu/en/policies/ai-office' },
  cfg: { label: 'CFG, Advanced AI: Possible Futures', url: 'https://cfg.eu/advanced-ai-possible-futures/' },
  ai2040: { label: 'AI 2040', url: 'https://ai-2040.com' },
  ai2040Plans: { label: 'AI 2040, Comparing possible plans (Eli Lifland’s estimates)', url: 'https://ai-2040.com/supplements/comparing-possible-plans' },
  ai2027: { label: 'AI 2027', url: 'https://ai-2027.com' },
  gradual: { label: 'Gradual Disempowerment (Kulveit et al., 2025)', url: 'https://arxiv.org/abs/2501.16946' },
  rand: { label: 'RAND, Securing AI Model Weights (2024)', url: 'https://www.rand.org/pubs/research_reports/RRA2849-1.html' },
  apollo: { label: 'Apollo Research, Frontier Models are Capable of In-context Scheming (2024)', url: 'https://arxiv.org/abs/2412.04984' },
  cotMonitor: { label: 'Chain of Thought Monitorability (Korbak et al., 2025)', url: 'https://arxiv.org/abs/2507.11473' },
  metaEu: { label: 'Axios, Meta won’t offer future multimodal AI models in EU (2024)', url: 'https://www.axios.com/2024/07/17/meta-future-multimodal-ai-models-eu' },
  anthropicMisuse: { label: 'Anthropic, Detecting and countering misuse of AI (Aug 2025)', url: 'https://www.anthropic.com/news/detecting-countering-misuse-aug-2025' },
} satisfies Record<string, Source>;
