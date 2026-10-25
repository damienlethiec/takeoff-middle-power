import type { Source } from '../engine/types';

// Every real-world claim shown to players cites one of these. Checked against the primary source:
// see docs/FACT_CHECK.md (v1 table and "v2 additions").
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

  // v1 opening facts, kept here so the v2 screens can reuse them (still the primary sources).
  asmlCnbc: { label: 'CNBC, Inside ASML (2022)', url: 'https://www.cnbc.com/2022/03/23/inside-asml-the-company-advanced-chipmakers-use-for-euv-lithography.html' },
  alignmentFaking: { label: 'Anthropic, Alignment faking in large language models (2024)', url: 'https://www.anthropic.com/research/alignment-faking' },

  // v2: intro, tips and "Already real" facts (2025 or later)
  anthropicInterp: { label: 'Anthropic, Tracing the thoughts of a large language model (Mar 2025)', url: 'https://www.anthropic.com/research/tracing-thoughts-language-model' },
  gpaiGuidelines: { label: 'European Commission, Guidelines for providers of general-purpose AI models (2025)', url: 'https://digital-strategy.ec.europa.eu/en/policies/guidelines-gpai-providers' },
  openaiScheming: { label: 'OpenAI and Apollo Research, Detecting and reducing scheming in AI models (Sept 2025)', url: 'https://openai.com/index/detecting-and-reducing-scheming-in-ai-models/' },
  anthropicEspionage: { label: 'Anthropic, Disrupting AI-orchestrated cyber espionage (Nov 2025)', url: 'https://www.anthropic.com/news/disrupting-AI-espionage' },
  llama4Policy: { label: 'Meta, Llama 4 Acceptable Use Policy (Apr 2025)', url: 'https://raw.githubusercontent.com/meta-llama/llama-models/main/models/llama4/USE_POLICY.md' },

  // v2: "What this costs in the real world"
  iaeaBudget2025: { label: 'IAEA, The Agency’s Budget Update for 2025, GC(68)/5', url: 'https://iaea.org/sites/default/files/gc/gc68-5.pdf' },
  aisiAlignment: { label: 'UK AI Security Institute, The Alignment Project (Jul 2025)', url: 'https://www.aisi.gov.uk/work/announcing-the-alignment-project' },
  openEuroLlm: { label: 'European Commission, OpenEuroLLM awarded the STEP Seal (Feb 2025)', url: 'https://digital-strategy.ec.europa.eu/en/news/pioneering-ai-project-awarded-opening-large-language-models-european-languages' },
  euCyberHealth: { label: 'European Commission, €145.5 million for European cybersecurity (Jun 2025)', url: 'https://digital-strategy.ec.europa.eu/en/news/eu-allocates-eu1455-million-boost-european-cybersecurity-including-hospitals-and-healthcare' },
  egfBelgan: { label: 'European Parliament, EGF support for BelGaN workers (Oct 2025)', url: 'https://data.europarl.europa.eu/distribution/doc/TA-10-2025-0220_en.pdf' },
} satisfies Record<string, Source>;
