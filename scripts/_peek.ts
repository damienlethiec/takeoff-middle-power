import * as E from '../src/engine/index';
import { prepared } from './strategies';
import { seedToRng } from '../src/engine/rng';
let s = E.createInitialState(Number(process.argv[2] ?? 5));
const r = { rng: seedToRng(1) };
console.log('speed', s.takeoffSpeed, 'ta', s.gauges.trueAlignment);
for (let g = 0; g < 20; g++) {
  s = E.startQuarter(s);
  const t = E.tip(s); if (t) s = E.markTipShown(s, t.id);
  const t2 = E.tip(s); if (t2) s = E.markTipShown(s, t2.id);
  if (s.pendingEvent) s = E.resolveEvent(s, prepared.choose(s, r));
  const rep = E.situationReport(s);
  const adv = E.advisor(s);
  console.log(`\n== ${E.dateLabel(s.quarter)} act ${s.act} pc ${s.pc} b ${s.budget} | ${Object.entries(s.gauges).map(([k,v])=>k.slice(0,4)+v).join(' ')} coal ${s.coalition}`);
  console.log(' tips:', [t?.id, t2?.id].filter(Boolean).join(','), '| notices:', s.notices.map(n => `${n.kind}:${n.id}`).join(', '));
  console.log(' dash:', E.dashboard(s).primary.map(p => p.key).join(','), '| intro', E.dashboard(s).introduced?.key ?? '-');
  console.log(' risks:', E.riskViews(s).map(x => `${x.id}:${x.stage}${x.prepared?'(P)':''}`).join(', '), '| moved', rep.risksMoved.map(x=>x.id).join(','));
  console.log(' headline:', rep.headline.map(h => `${h.label} ${h.value} (${h.delta}) ${h.kind}: ${h.cause} || ${h.meaning}`).join(' ## '));
  console.log(' bg:', rep.background);
  console.log(' advisor:', adv.recommend, '|', adv.text, '|', adv.reason, '|', adv.alternative?.text);
  console.log(' hand:', E.cardViews(s).map(c => `${c.name}${c.available ? '' : '[x]'}${c.affordable ? '' : '[$]'}`).join('; '));
  console.log(' concerns:', s.concerns.map(c => c.text).join(' / '));
  console.log(' income:', JSON.stringify(E.nextIncome(s)));
  const d = prepared.decide(s, r);
  if (d) { const out = E.playCard(s, d.id, d.option); s = out.state; console.log(' PLAY', d.id, '->', out.briefing.consequence, '| traj', JSON.stringify(E.trajectory(s).change)); }
  else s = E.pass(s);
  const o = E.endQuarter(s); s = o.state;
  if (o.outcome === 'tipping_point') { s = E.runTippingPoint(s); break; }
  if (o.outcome === 'game_over') break;
}
console.log('\nENDING', s.ending, E.debrief(s).ending.text);
console.log('journal', E.journal(s).map(j => `${j.dateLabel}:${j.decision.title}:${j.tips.map(t=>t.id)}:${j.lea?.slot ?? ''}`).join(' | '));
console.log('letters', s.leaLetters.map(l => l.slot + '@' + l.quarter));
