// Offline probe — NO MongoDB, NO LLM, NO browser. Run: node src/scripts/testMessagingPipeline.js
//
// Covers audit Item 4 (messaging pipeline):
//   POST /api/messaging/webhook now analyzes the stored message itself (no
//   login) and then rebuilds priorities, instead of leaving both to a browser.
// The REAL webhook controller, analysis, region matching, priority engine and
// hotspot aggregation run unmodified. Only MongoDB I/O is an in-memory store
// seeded from the repo's seed files; the LLM is faked for the failure case.

process.env.PORT = process.env.PORT || '5000';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:1/unused';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'probe-secret';
process.env.AI_MOCK_MODE = 'true';

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('../models');

let passCount = 0;
let failCount = 0;
const check = (label, passed, detail = '') => {
  if (passed) { console.log(`✅ ${label} — PASS`); passCount++; }
  else { console.log(`❌ ${label} — FAIL ${detail}`); failCount++; }
};
const section = (t) => console.log(`\n--- ${t}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- in-memory DB
const brics = require('../seed/bricsCountries.seed');
const db = {
  citizen: [], priority: [],
  demographic: [...require('../seed/demographics'), ...brics.demographics],
  infrastructure: [...require('../seed/infrastructure'), ...brics.infrastructure],
  investment: [...require('../seed/investments'), ...brics.investments],
};
const getPath = (d, p) => p.split('.').reduce((o, k) => (o === null || o === undefined ? undefined : o[k]), d);
const same = (a, b) => (a === undefined ? null : a) === (b === undefined ? null : b);
const matches = (d, f = {}) => Object.entries(f).every(([k, c]) => {
  const v = getPath(d, k);
  if (c && typeof c === 'object' && !Array.isArray(c)) {
    if ('$in' in c) return c.$in.some((x) => same(v, x));
    if ('$nin' in c) return !c.$nin.some((x) => same(v, x));
  }
  return same(v, c);
});
const query = (resolve) => {
  let sortSpec = null;
  const q = { sort(s) { sortSpec = s; return q; }, limit() { return q; }, lean() { return q; }, select() { return q; },
    then(ok, bad) { return Promise.resolve().then(() => resolve(sortSpec)).then(ok, bad); } };
  return q;
};

const CitizenRequest = mongoose.model('CitizenRequest');
const Demographic = mongoose.model('Demographic');
const Infrastructure = mongoose.model('Infrastructure');
const Investment = mongoose.model('Investment');
const PriorityResult = mongoose.model('PriorityResult');

const stats = { saves: 0, regenRuns: 0, inFlight: 0, maxInFlight: 0, failNextAggregate: false };
Demographic.find = (f) => query(() => db.demographic.filter((d) => matches(d, f)));
Infrastructure.find = (f) => query(() => db.infrastructure.filter((d) => matches(d, f)));
Investment.findOne = (f) => query((sort) => {
  const rows = db.investment.filter((d) => matches(d, f));
  if (sort && sort.financialYear === -1) rows.sort((a, b) => String(b.financialYear).localeCompare(String(a.financialYear)));
  return rows[0] || null;
});
CitizenRequest.countDocuments = async () => db.citizen.length;
CitizenRequest.find = (f) => query(() => db.citizen.filter((d) => matches(d, f)));
CitizenRequest.findOne = (f) => query(() => db.citizen.find((d) => matches(d, f)) || null);
CitizenRequest.aggregate = async () => {
  // The first thing a priority rebuild does — count a run and track overlap here.
  stats.regenRuns += 1; stats.inFlight += 1; stats.maxInFlight = Math.max(stats.maxInFlight, stats.inFlight);
  if (stats.failNextAggregate) { stats.failNextAggregate = false; stats.inFlight -= 1; throw new Error('simulated DB failure'); }
  await sleep(3);
  const seen = new Map();
  db.citizen.forEach((d) => { const id = { district: d.location.district, sector: d.category, country: d.location.country }; seen.set(JSON.stringify(id), { _id: id }); });
  return [...seen.values()];
};
CitizenRequest.prototype.save = async function save() {
  await this.validate();
  stats.saves += 1;
  if (!db.citizen.includes(this)) db.citizen.push(this);
  return this;
};
PriorityResult.find = (f) => query(() => db.priority.filter((d) => matches(d, f)));
PriorityResult.findOneAndUpdate = async (f, update) => {
  await sleep(2);
  const existing = db.priority.find((d) => matches(d, f));
  if (existing) { Object.assign(existing, update); return existing; }
  db.priority.push({ ...update });
  return update;
};
PriorityResult.deleteMany = async (f) => {
  const keep = db.priority.filter((d) => !matches(d, f));
  const deleted = db.priority.length - keep.length;
  db.priority.length = 0; db.priority.push(...keep);
  stats.inFlight -= 1; // end of a priority rebuild
  return { deletedCount: deleted };
};
const reset = () => { db.citizen.length = 0; db.priority.length = 0; Object.assign(stats, { saves: 0, regenRuns: 0, inFlight: 0, maxInFlight: 0, failNextAggregate: false }); };

// ------------------------------------------------------------------ code under test
const { receiveMessage } = require('../controllers/messaging.controller');
const { calculateHotspots } = require('../services/hotspotAggregation.service');
const { createCoalescedRunner } = require('../utils/coalescedRunner');

const webhook = async (body, handler = receiveMessage) => {
  let status; let payload; let error;
  // NOTE: no req.user / Authorization header — the webhook is called "logged out".
  await handler({ body, headers: {} }, { status(c) { status = c; return this; }, json(p) { payload = p; return this; } }, (e) => { error = e; });
  if (error) throw error;
  return { status, data: payload && payload.data, payload };
};
const stored = (requestId) => db.citizen.find((d) => d.requestId === requestId);
const priorityFor = (regionId, sector) => db.priority.find((p) => p.regionId === regionId && p.sector === sector);

(async () => {
  // ============================================================ happy path
  section('A. Webhook analyzes + scores a located message (no login)');
  const A = await webhook({ channel: 'whatsapp', senderId: 'demo-user-001', messageId: 'wamid.A1', country: 'IN', language: 'Hindi', region: 'Jharkhand',
    message: 'I am from Ranchi, Jharkhand. The road near my area is badly damaged.' });
  check('A: 201 received', A.status === 201 && A.data.status === 'received', JSON.stringify(A.payload));
  check('A: analysisStatus completed', A.data.analysisStatus === 'completed');
  check('A: prioritiesUpdated true', A.data.prioritiesUpdated === true);
  check('A: response carries the analysis (so the simulator needs no login)', A.data.analysis && A.data.analysis.location.district === 'Ranchi' && A.data.analysis.category === 'Roads & Transport');
  const docA = stored(A.data.requestId);
  check('A: Item 1 intact — channel/senderId/messageId/label persisted',
    docA.channel === 'whatsapp' && docA.senderId === 'demo-user-001' && docA.messageId === 'wamid.A1' && docA.sourceLanguageLabel === 'Hindi (Jharkhand)' && docA.source === 'messaging');
  check('A: Item 2 intact — stored as India / Jharkhand / Ranchi', docA.location.country === 'India' && docA.location.state === 'Jharkhand' && docA.location.district === 'Ranchi');
  check('A: stored category is the analyzed one (not "Other")', docA.category === 'Roads & Transport');
  check('A: aiUnderstanding stored with analyzedAt', docA.aiUnderstanding.analyzedAt instanceof Date);
  const pa = priorityFor('JH-RAN', 'Roads & Transport');
  check('A: request entered priorities with no browser/recalculate call', Boolean(pa) && pa.citizenRequestCount === 1 && typeof pa.priorityScore === 'number');
  check('A: Ranchi appears in hotspots', (await calculateHotspots(null)).some((h) => h.district === 'Ranchi'));
  check('A: exactly one rebuild ran', stats.regenRuns === 1);

  // ============================================================ duplicate
  section('C. Duplicate delivery is still idempotent (and not re-processed)');
  const docsBefore = db.citizen.length; const savesBefore = stats.saves; const runsBefore = stats.regenRuns;
  const dup = await webhook({ channel: 'whatsapp', senderId: 'demo-user-001', messageId: 'wamid.A1', country: 'IN',
    message: 'I am from Ranchi, Jharkhand. The road near my area is badly damaged.' });
  check('C: 200 already_received + duplicate:true', dup.status === 200 && dup.data.status === 'already_received' && dup.data.duplicate === true);
  check('C: same requestId returned', dup.data.requestId === A.data.requestId);
  check('C: no new request, no re-analysis save, no extra rebuild', db.citizen.length === docsBefore && stats.saves === savesBefore && stats.regenRuns === runsBefore);

  // ============================================================ no location
  section('B. Message without a location');
  reset();
  const B = await webhook({ channel: 'sms', country: 'IN', message: 'The street lights in my area have not worked for two weeks.' });
  const docB = stored(B.data.requestId);
  check('B: analyzed (completed) and scores refreshed', B.data.analysisStatus === 'completed' && B.data.prioritiesUpdated === true);
  check('B: location stays unknown — not randomly assigned', docB.location.district === null && B.data.analysis.location.district === null);
  check('B: known country (India) preserved', docB.location.country === 'India');
  check('B: unlocated message creates no priority result', db.priority.length === 0);

  // ============================================================ recalc failure
  section('D. Priority rebuild failure does not lose the message');
  reset();
  stats.failNextAggregate = true;
  const origErr = console.error; console.error = () => {};
  const D = await webhook({ channel: 'telegram', country: 'IN', message: 'Hospital in Dhanbad is very far from our village' });
  console.error = origErr;
  check('D: still 201 received', D.status === 201 && D.data.status === 'received');
  check('D: analysis completed and stored', D.data.analysisStatus === 'completed' && stored(D.data.requestId).location.district === 'Dhanbad');
  check('D: prioritiesUpdated false (honest about the failed step)', D.data.prioritiesUpdated === false);
  const D2 = await webhook({ channel: 'telegram', country: 'IN', message: 'School in Gaya has no teachers' });
  check('D: a later message recovers and rebuilds normally', D2.data.prioritiesUpdated === true && Boolean(priorityFor('JH-DHN', 'Healthcare')) );

  // ============================================================ validation
  section('E. Invalid input is rejected before any analysis or rebuild');
  reset();
  const bad1 = await webhook({ channel: 'sms', message: '   ' });
  const bad2 = await webhook({ channel: 'fax', message: 'hello' });
  const bad3 = await webhook({ channel: 'sms', country: 'XX', message: 'hello' });
  const bad4 = await webhook({ channel: 'sms' });
  check('E: empty / missing message -> 400', bad1.status === 400 && bad4.status === 400);
  check('E: unsupported channel -> 400, unknown country -> 400', bad2.status === 400 && bad3.status === 400);
  check('E: nothing stored, analyzed or rebuilt', db.citizen.length === 0 && stats.saves === 0 && stats.regenRuns === 0);

  // ============================================================ burst
  section('F. A burst of messages never runs two priority rebuilds at once');
  reset();
  const burst = await Promise.all([
    webhook({ channel: 'whatsapp', senderId: 's1', messageId: 'b1', country: 'IN', message: 'The road in Ranchi is broken' }),
    webhook({ channel: 'whatsapp', senderId: 's2', messageId: 'b2', country: 'IN', message: 'Hospital in Dhanbad is very far' }),
    webhook({ channel: 'sms', senderId: 's3', messageId: 'b3', country: 'IN', message: 'No teachers in the school in Gaya' }),
    webhook({ channel: 'telegram', senderId: 's4', messageId: 'b4', country: 'IN', message: 'Water supply problem in Jamshedpur' }),
  ]);
  check('F: all 4 acknowledged, analyzed and rebuilt', burst.every((r) => r.status === 201 && r.data.analysisStatus === 'completed' && r.data.prioritiesUpdated === true));
  check('F: never more than one rebuild in flight', stats.maxInFlight === 1, `max=${stats.maxInFlight}`);
  check('F: bursts share rebuilds (not one rebuild per message necessarily)', stats.regenRuns >= 1 && stats.regenRuns <= 4, `runs=${stats.regenRuns}`);
  const expected = new Set(db.citizen.map((d) => `${d.location.district}|${d.category}`));
  const regionByDistrict = Object.fromEntries(db.demographic.map((d) => [d.district, d.regionId]));
  const missing = [...expected].filter((k) => { const [district, category] = k.split('|'); return !priorityFor(regionByDistrict[district], category); });
  check('F: every message\'s district+sector has a priority result — none lost to a racing rebuild', expected.size === 4 && missing.length === 0, `missing=${missing}`);

  // ============================================================ runner
  section('G. Coalesced runner (the serialization helper)');
  {
    const log = []; let active = 0; let maxActive = 0; let runs = 0;
    const gate = {}; // lets the test hold run 1 open
    const run = createCoalescedRunner(async () => {
      const n = ++runs; log.push(`start${n}`); active += 1; maxActive = Math.max(maxActive, active);
      if (n === 1) await new Promise((r) => { gate.release = r; }); else await sleep(2);
      active -= 1; log.push(`end${n}`);
      return n;
    });
    log.push('call1'); const p1 = run();
    await sleep(1);
    const rest = [2, 3, 4, 5].map((i) => { log.push(`call${i}`); return run(); });
    gate.release();
    const results = await Promise.all([p1, ...rest]);
    check('G: idle call starts immediately (run 1 started before later calls)', log.indexOf('start1') < log.indexOf('call2'));
    check('G: 5 callers -> only 2 runs (in-flight + one shared follow-up)', runs === 2, `runs=${runs}`);
    check('G: runs never overlap', maxActive === 1);
    check('G: the follow-up starts after the last queued caller arrived (it sees all their data)', log.indexOf('start2') > log.indexOf('call5'));
    check('G: queued callers all got the follow-up run', results.slice(1).every((r) => r === 2) && results[0] === 1);
  }
  {
    let n = 0;
    const run = createCoalescedRunner(async () => { n += 1; await sleep(2); if (n === 1) throw new Error('boom'); return n; });
    const first = run(); const second = run();
    const r1 = await first.then(() => 'ok', (e) => e.message);
    const r2 = await second.then((v) => v, () => 'failed');
    check('G: a failed run rejects only its own callers', r1 === 'boom');
    check('G: callers queued behind a failed run still get a successful run', r2 === 2);
    check('G: the runner keeps working after a failure', (await run()) === 3);
  }

  // ============================================================ AI failure (real mode, LLM faked)
  section('H. AI unavailable (real mode, LLM fails)');
  reset();
  process.env.AI_MOCK_MODE = 'false'; process.env.LLM_API_KEY = 'k'; process.env.LLM_MODEL = 'm';
  Object.keys(require.cache).filter((k) => /config[\\/]env\.js$|services[\\/]ai[\\/]|controllers[\\/](request|messaging)\.controller\.js$/.test(k)).forEach((k) => delete require.cache[k]);
  require('../services/ai/llmProvider').callLLM = async () => { throw new Error('provider is down'); };
  const realWebhook = require('../controllers/messaging.controller').receiveMessage;
  console.error = () => {};
  const H = await webhook({ channel: 'whatsapp', senderId: 's9', messageId: 'h1', country: 'IN', message: 'Road in Ranchi is broken' }, realWebhook);
  console.error = origErr;
  const docH = stored(H.data.requestId);
  check('H: still 201 received (provider must not retry)', H.status === 201 && H.data.status === 'received');
  check('H: analysisStatus failed, analysis null, prioritiesUpdated false', H.data.analysisStatus === 'failed' && H.data.analysis === null && H.data.prioritiesUpdated === false);
  check('H: the message is saved with its metadata, category untouched', docH.category === 'Other' && docH.messageId === 'h1' && docH.channel === 'whatsapp');
  check('H: no priority rebuild was triggered', stats.regenRuns === 0 && db.priority.length === 0);

  // ============================================================ simulator page
  section('I. Simulator page (static check — behaviour covered by the UI test run)');
  const page = fs.readFileSync(path.join(__dirname, '../../../frontend/src/pages/MessagingSimulatorPage.jsx'), 'utf8');
  check('I: no longer imports or calls the login-only analyzeRequest', !/analyzeRequest/.test(page));
  check('I: shows the analysis returned by the webhook', /response\.data\.analysis/.test(page) && /analysisStatus === 'completed'/.test(page));

  console.log(`\nPassed: ${passCount}  Failed: ${failCount}`);
  process.exit(failCount === 0 ? 0 : 1);
})().catch((e) => { console.error('Probe crashed:', e); process.exit(1); });
