// Public concerns shown as map bubbles; clicking one explains it. Illustrative everyday worries
// of fictional people in real places: never real statistics, never real quotes.

import type { ConcernCopy } from './types';

export const CONCERNS: ConcernCopy[] = [
  // jobs
  { id: 'jobs_lyon_teachers', region: 'eu', theme: 'jobs', text: 'Teachers in Lyon worry AI tutors will replace them.' },
  { id: 'jobs_rotterdam_planners', region: 'eu', theme: 'jobs', text: 'Port planners in Rotterdam wonder if the scheduling AI will still need them next year.' },
  { id: 'jobs_warsaw_callcentre', region: 'eu', theme: 'jobs', text: 'Call-centre staff in Warsaw watch their team shrink every quarter.' },
  { id: 'jobs_madrid_lawyers', region: 'eu', theme: 'jobs', text: 'Law graduates in Madrid cannot find the junior jobs they trained for.' },
  { id: 'jobs_milan_designers', region: 'eu', theme: 'jobs', text: 'Designers in Milan say clients now ask for “just the AI version”.' },
  { id: 'jobs_dublin_coders', region: 'eu', theme: 'jobs', text: 'Junior coders in Dublin fear the AI learns their job faster than they do.' },
  { id: 'jobs_ohio_truckers', region: 'us', theme: 'jobs', text: 'Truck drivers in Ohio watch driverless rigs pass them on the highway.' },
  { id: 'jobs_shenzhen_factory', region: 'cn', theme: 'jobs', text: 'Factory workers in Shenzhen see robots learn their tasks in a week.' },

  // safety
  { id: 'safety_ghent_nurse', region: 'eu', theme: 'safety', text: 'A nurse in Ghent asks who checks the AI that suggests doses.' },
  { id: 'safety_toulouse_engineer', region: 'eu', theme: 'safety', text: 'An engineer in Toulouse asks why nobody outside the labs can test the newest models.' },
  { id: 'safety_naples_grandmother', region: 'eu', theme: 'safety', text: 'A grandmother in Naples wants to know if the AI doctor is a real doctor.' },
  { id: 'safety_sf_engineers', region: 'us', theme: 'safety', text: 'Engineers in San Francisco quietly ask what their own model is really learning.' },
  { id: 'safety_beijing_researcher', region: 'cn', theme: 'safety', text: 'A researcher in Beijing fears her lab is racing too fast to check its own model.' },

  // misuse
  { id: 'misuse_porto_scam', region: 'eu', theme: 'misuse', text: 'A pharmacist in Porto got a scam call in her own daughter’s voice.' },
  { id: 'misuse_brno_hospital', region: 'eu', theme: 'misuse', text: 'A hospital IT team in Brno wonders if they could stop an AI-written attack.' },
  { id: 'misuse_brittany_water', region: 'eu', theme: 'misuse', text: 'Mayors in Brittany worry a hacker could switch off the water plant.' },
  { id: 'misuse_athens_pensioners', region: 'eu', theme: 'misuse', text: 'Pensioners in Athens no longer trust any email from their bank.' },

  // power
  { id: 'power_lisbon_shops', region: 'eu', theme: 'power', text: 'Shopkeepers in Lisbon say three foreign apps now decide who sees their prices.' },
  { id: 'power_copenhagen_editor', region: 'eu', theme: 'power', text: 'An editor in Copenhagen asks who really chooses what the AI news feed shows.' },
  { id: 'power_bavaria_farmers', region: 'eu', theme: 'power', text: 'Farmers in Bavaria rent their AI from one company and cannot switch.' },
  { id: 'power_tallinn_students', region: 'eu', theme: 'power', text: 'Students in Tallinn ask why Europe has no AI of its own.' },
  { id: 'power_phoenix_voters', region: 'us', theme: 'power', text: 'Voters in Phoenix ask why a handful of labs answer to nobody.' },

  // war
  { id: 'war_riga_families', region: 'eu', theme: 'war', text: 'Families in Riga fear the AI race could spill into a real war.' },
  { id: 'war_helsinki_student', region: 'eu', theme: 'war', text: 'A student in Helsinki asks if the next war will be fought by machines.' },
  { id: 'war_sandiego_families', region: 'us', theme: 'war', text: 'Navy families in San Diego read every headline about the Pacific.' },
  { id: 'war_shanghai_students', region: 'cn', theme: 'war', text: 'Students in Shanghai fear the chip war will turn into a real one.' },

  // general
  { id: 'general_marseille_dinner', region: 'eu', theme: 'general', text: 'Friends in Marseille argue over dinner: is AI a miracle or a menace?' },
  { id: 'general_vienna_parents', region: 'eu', theme: 'general', text: 'Parents in Vienna wonder what the chatbot tells their kids at night.' },
  { id: 'general_krakow_librarian', region: 'eu', theme: 'general', text: 'A librarian in Kraków now gets more questions about AI than about books.' },
  { id: 'general_chengdu_parents', region: 'cn', theme: 'general', text: 'Parents in Chengdu wonder what their child’s AI tutor really believes.' },
];
