import type { Source } from '../engine/types';

// Every real-world fact shown to players cites one of these. Each was checked against the primary source
// with WebFetch on 25–26 October 2026 (quotes in docs/V3_BUILD_NOTES.md, "Facts checked").
export const SOURCES = {
  // the two scenarios the game is built on
  ai2027: { label: 'AI 2027 (Kokotajlo et al., AI Futures Project, 2025)', url: 'https://ai-2027.com' },
  cfg: { label: 'CFG, Advanced AI: Possible Futures (2025)', url: 'https://cfg.eu/advanced-ai-possible-futures/' },

  // intro facts
  anthropicInterp: { label: 'Anthropic, Tracing the thoughts of a large language model (Mar 2025)', url: 'https://www.anthropic.com/research/tracing-thoughts-language-model' },
  gpaiGuidelines: { label: 'European Commission, Guidelines for providers of general-purpose AI models (2025)', url: 'https://digital-strategy.ec.europa.eu/en/policies/guidelines-gpai-providers' },

  // "Already real" facts on Breaking news screens
  anthropicEspionage: { label: 'Anthropic, Disrupting the first reported AI-orchestrated cyber espionage campaign (Nov 2025)', url: 'https://www.anthropic.com/news/disrupting-AI-espionage' },
  apollo: { label: 'Meinke et al., Frontier Models are Capable of In-context Scheming (Dec 2024)', url: 'https://arxiv.org/abs/2412.04984' },
  cotMonitor: { label: 'Korbak et al., Chain of Thought Monitorability (Jul 2025)', url: 'https://arxiv.org/abs/2507.11473' },
  anthropicMisuse: { label: 'Anthropic, Detecting and countering misuse of AI (Aug 2025)', url: 'https://www.anthropic.com/news/detecting-countering-misuse-aug-2025' },
  llama4Policy: { label: 'Meta, Llama 4 Acceptable Use Policy (Apr 2025)', url: 'https://raw.githubusercontent.com/meta-llama/llama-models/main/models/llama4/USE_POLICY.md' },
  stanfordCanaries: {
    label: 'Stanford Digital Economy Lab, Canaries in the Coal Mine (Chandar and Chen, 2025)',
    url: 'https://digitaleconomy.stanford.edu/event/bharat-chandar-canaries-in-the-coal-mine-six-facts-about-the-recent-employment-effects-of-artificial-intelligence/',
  },

  // card examples and real-world costs
  bidenXi: {
    label: 'White House, press gaggle on the Biden–Xi meeting (17 Nov 2024)',
    url: 'https://bidenwhitehouse.archives.gov/briefing-room/press-briefings/2024/11/17/on-the-record-press-gaggle-by-apnsa-jake-sullivan-on-president-bidens-meeting-with-president-xi-jinping',
  },
  iaeaBudget2025: { label: 'IAEA, The Agency’s Budget Update for 2025, GC(68)/5', url: 'https://iaea.org/sites/default/files/gc/gc68-5.pdf' },
  aiOffice: { label: 'European Commission, European AI Office', url: 'https://digital-strategy.ec.europa.eu/en/policies/ai-office' },
  aisiAlignment: { label: 'UK AI Security Institute, The Alignment Project (Jul 2025)', url: 'https://www.aisi.gov.uk/work/announcing-the-alignment-project' },
  europe2031: { label: 'Europe 2031 (Juijn et al.), summary and recommendations', url: 'https://europe2031.ai/summary' },
  aisiO1: { label: 'UK AI Security Institute, Pre-deployment evaluation of OpenAI’s o1 model (Dec 2024)', url: 'https://aisi.gov.uk/work/pre-deployment-evaluation-of-openais-o1-model' },
  rand: { label: 'RAND, Securing AI Model Weights (Nevo et al., 2024)', url: 'https://www.rand.org/pubs/research_reports/RRA2849-1.html' },
  openEuroLlm: { label: 'European Commission, OpenEuroLLM awarded the STEP Seal (Feb 2025)', url: 'https://digital-strategy.ec.europa.eu/en/news/pioneering-ai-project-awarded-opening-large-language-models-european-languages' },
  euCyberHealth: {
    label: 'European Commission, €145.5 million for European cybersecurity (Jun 2025)',
    url: 'https://digital-strategy.ec.europa.eu/en/news/eu-allocates-eu1455-million-boost-european-cybersecurity-including-hospitals-and-healthcare',
  },
  aiActArt14: { label: 'EU AI Act, Article 14: Human oversight', url: 'https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-14' },
  euAttribution2021: {
    label: 'Council of the EU, Declaration on malicious cyber activities from China (19 Jul 2021)',
    url: 'https://www.consilium.europa.eu/ga/press/press-releases/2021/07/19/declaration-by-the-high-representative-on-behalf-of-the-eu-urging-china-to-take-action-against-malicious-cyber-activities-undertaken-from-its-territory/',
  },
} satisfies Record<string, Source>;
