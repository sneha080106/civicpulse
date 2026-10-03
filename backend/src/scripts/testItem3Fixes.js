// Offline probe — NO MongoDB, NO browser. Run: node src/scripts/testItem3Fixes.js
//
// Covers audit Item 3 (cheap data-correctness bugs):
//   1. GET /analytics/overview respects ?country=
//   2. structured request preserves the selected country
//   3. structured request records the selected language
//   4. voice submissions record source + language (payload builders + backend)
//   5. Priority Ranking subtitle wording (static source check)
//   6. recalcWarning reset (static source check — behaviour is covered by the
//      UI test run described in the report, which needs a DOM)
// The real controllers run unmodified; only MongoDB I/O is an in-memory store.

process.env.PORT = process.env.PORT || '5000';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:1/unused';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'probe-secret';
process.env.AI_MOCK_MODE = 'true';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const mongoose = require('mongoose');
require('../models');

let passCount = 0;
let failCount = 0;
const check = (label, passed, detail = '') => {
  if (passed) { console.log(`✅ ${label} — PASS`); passCount++; }
  else { console.log(`❌ ${label} — FAIL ${detail}`); failCount++; }
};
const section = (t) => console.log(`\n--- ${t}`);

// ------------------------------------------------------------- in-memory DB
const brics = require('../seed/bricsCountries.seed');
const db = { citizen: [], priority: [], demographic: [...require('../seed/demographics'), ...brics.demographics] };
const getPath = (doc, p) => p.split('.').reduce((o, k) => (o === null || o === undefined ? undefined : o[k]), doc);
const same = (a, b) => (a === undefined ? null : a) === (b === undefined ? null : b);
const matches = (doc, filter = {}) => Object.entries(filter).every(([k, cond]) => {
  const v = getPath(doc, k);
  if (cond && typeof cond === 'object' && !Array.isArray(cond) && '$in' in cond) return cond.$in.some((c) => same(v, c));
  return same(v, cond);
});
const query = (resolve) => {
  let sortSpec = null;
  const q = { sort(s) { sortSpec = s; return q; }, limit() { return q; }, lean() { return q; },
    then(ok, bad) { return Promise.resolve().then(() => resolve(sortSpec)).then(ok, bad); } };
  return q;
};

const CitizenRequest = mongoose.model('CitizenRequest');
const PriorityResult = mongoose.model('PriorityResult');
const Demographic = mongoose.model('Demographic');

Demographic.find = (f) => query(() => db.demographic.filter((d) => matches(d, f)));
CitizenRequest.countDocuments = async (f) => db.citizen.filter((d) => matches(d, f)).length;
CitizenRequest.distinct = async (field, f) => [...new Set(db.citizen.filter((d) => matches(d, f)).map((d) => getPath(d, field)))];
CitizenRequest.aggregate = async (pipeline) => {
  let docs = db.citizen;
  const counts = new Map();
  pipeline.forEach((stage) => { if (stage.$match) docs = docs.filter((d) => matches(d, stage.$match)); });
  docs.forEach((d) => counts.set(d.category, (counts.get(d.category) || 0) + 1));
  return [...counts.entries()].map(([id, count]) => ({ _id: id, count })).sort((a, b) => b.count - a.count).slice(0, 1);
};
CitizenRequest.findOne = (f) => query(() => db.citizen.find((d) => matches(d, f)) || null);
CitizenRequest.find = (f) => query(() => db.citizen.filter((d) => matches(d, f)));
CitizenRequest.prototype.save = async function save() { await this.validate(); if (!db.citizen.includes(this)) db.citizen.push(this); return this; };
PriorityResult.findOne = (f) => query((sort) => {
  const rows = db.priority.filter((d) => matches(d, f));
  if (sort && sort.priorityScore === -1) rows.sort((a, b) => b.priorityScore - a.priorityScore);
  return rows[0] || null;
});

const { getOverview } = require('../controllers/analytics.controller');
const { createCitizenRequest } = require('../controllers/citizenRequest.controller');
const { createRequest, analyzeRequest } = require('../controllers/request.controller');

const call = async (handler, { body = {}, query: q = {} } = {}) => {
  let status; let payload; let error;
  await handler({ body, query: q }, { status(c) { status = c; return this; }, json(p) { payload = p; return this; } }, (e) => { error = e; });
  if (error) throw error;
  return { status: status || 200, payload };
};
const add = (country, district, category, language) => db.citizen.push(new CitizenRequest({
  requestId: `CRP${db.citizen.length + 1}`, originalText: 'x', language, category, source: 'text', location: { country, district },
}));

(async () => {
  // ================================================================ 1
  section('1. Dashboard KPIs respect the country selector');
  const brazil = db.demographic.find((d) => d.country === 'Brazil');
  add('India', 'Ranchi', 'Healthcare', 'hi'); add('India', 'Ranchi', 'Healthcare', 'en'); add('India', 'Dhanbad', 'Roads & Transport', 'en');
  add('Brazil', brazil.district, 'Education', 'en'); add('Brazil', brazil.district, 'Education', 'en');
  db.priority.push({ regionId: 'JH-RAN', district: 'Ranchi', priorityScore: 70 },
    { regionId: brazil.regionId, district: brazil.district, priorityScore: 90 });

  const all = (await call(getOverview)).payload.data;
  check('no country: totals cover every country (existing behaviour)', all.totalRequests === 5 && all.regionsAnalyzed === 3, JSON.stringify(all));
  check('no country: top concern is global (Education x2 ties Healthcare x2 -> first max)', ['Education', 'Healthcare'].includes(all.topConcern));
  check('no country: highest priority is the global top score', all.highestPriorityRegion === brazil.district);

  const inData = (await call(getOverview, { query: { country: 'IN' } })).payload.data;
  check('country=IN: total requests counts India only', inData.totalRequests === 3, JSON.stringify(inData));
  check('country=IN: regions analyzed counts India districts only', inData.regionsAnalyzed === 2);
  check('country=IN: top concern is India\'s (Healthcare)', inData.topConcern === 'Healthcare');
  check('country=IN: highest priority is Ranchi, not the higher-scoring Brazil region', inData.highestPriorityRegion === 'Ranchi');
  check('country=IN: languages are India\'s', inData.languages.sort().join() === 'en,hi');

  const brData = (await call(getOverview, { query: { country: 'BR' } })).payload.data;
  check('country=BR: total requests counts Brazil only', brData.totalRequests === 2, JSON.stringify(brData));
  check('country=BR: top concern Education', brData.topConcern === 'Education');
  check('country=BR: highest priority is the Brazil region', brData.highestPriorityRegion === brazil.district);
  check('country=BR: languages are Brazil\'s', brData.languages.join() === 'en');

  const zaData = (await call(getOverview, { query: { country: 'ZA' } })).payload.data;
  check('country with no data -> zero/empty values (no crash)', zaData.totalRequests === 0 && zaData.topConcern === null && zaData.highestPriorityRegion === null);
  const bad = (await call(getOverview, { query: { country: { $ne: 'x' } } })).payload.data;
  check('non-string country param is ignored like "no country"', bad.totalRequests === 5);
  db.citizen.length = 0; db.priority.length = 0;

  // ================================================================ 2 + 3
  section('2/3. Structured request keeps the selected country and language');
  const structured = async (extra) => {
    const r = await call(createCitizenRequest, { body: { description: 'Hospital is far away', category: 'Healthcare', state: 'S', district: 'D', urgency: 'HIGH', ...extra } });
    return { r, doc: db.citizen.find((d) => d.requestId === r.payload.data.requestId) };
  };
  const br = await structured({ country: 'BR', language: 'hi' });
  check('country BR stored as Brazil (not defaulted to India)', br.doc.location.country === 'Brazil', br.doc.location.country);
  check('selected state/district still stored', br.doc.location.state === 'S' && br.doc.location.district === 'D');
  check('language hi stored', br.doc.language === 'hi');
  const bn = await structured({ country: 'ZA', language: 'bn' });
  check('country ZA -> South Africa, language bn stored', bn.doc.location.country === 'South Africa' && bn.doc.language === 'bn');
  const en = await structured({ country: 'IN', language: 'en' });
  check('India flow unchanged: India + en', en.doc.location.country === 'India' && en.doc.language === 'en');
  const none = await structured({});
  check('no country/language sent -> India + en (existing defaults)', none.doc.location.country === 'India' && none.doc.language === 'en');
  const analyzed = await call(analyzeRequest, { body: { requestId: br.doc.requestId } });
  check('analyze keeps the structured country and language', analyzed.status === 200 && br.doc.location.country === 'Brazil' && br.doc.language === 'hi');

  // ================================================================ 4
  section('4. Voice vs typed submissions');
  const { buildStructuredPayload, buildFreeTextPayload, STRUCTURED_LANGUAGES } =
    await import(pathToFileURL(path.join(__dirname, '../../../frontend/src/utils/requestPayloads.js')).href);

  const form = { state: ' Jharkhand ', district: ' Ranchi ', category: 'Healthcare', description: ' Far ', urgency: 'LOW', affectedPopulationEstimate: '500', language: 'bn' };
  const sp = buildStructuredPayload(form, 'BR');
  check('structured payload carries country + language and trims fields',
    sp.country === 'BR' && sp.language === 'bn' && sp.state === 'Jharkhand' && sp.district === 'Ranchi' && sp.description === 'Far' && sp.affectedPopulationEstimate === 500);
  check('structured language options are exactly en / hi / bn', STRUCTURED_LANGUAGES.map((l) => l.code).join() === 'en,hi,bn');
  check('structured payload without population keeps it undefined', buildStructuredPayload({ ...form, affectedPopulationEstimate: '' }, 'IN').affectedPopulationEstimate === undefined);

  const typed = buildFreeTextPayload({ text: ' Road broken ', source: 'text', country: 'IN', voiceLanguage: null });
  check('typed payload: source text, no language (unchanged shape)', JSON.stringify(typed) === JSON.stringify({ originalText: 'Road broken', source: 'text', country: 'IN' }));
  const voice = buildFreeTextPayload({ text: 'sadak kharab', source: 'text', country: 'IN', voiceLanguage: 'hi' });
  check('voice payload: source voice + selected language', voice.source === 'voice' && voice.language === 'hi' && voice.country === 'IN');

  const mk = async (body) => {
    const r = await call(createRequest, { body });
    return { r, doc: db.citizen.find((d) => d.requestId === r.payload?.data?.requestId) };
  };
  const tDoc = await mk(typed);
  check('backend stores typed request as source text, language en', tDoc.doc.source === 'text' && tDoc.doc.language === 'en');
  const vDoc = await mk(voice);
  check('backend stores voice request as source voice', vDoc.doc.source === 'voice');
  check('backend stores the voice language (hi)', vDoc.doc.language === 'hi');
  check('voice vs typed are distinguishable in the stored data', vDoc.doc.source !== tDoc.doc.source);
  const te = await mk(buildFreeTextPayload({ text: 'x', source: 'text', country: 'IN', voiceLanguage: 'te' }));
  check('voice in another dropdown language (Telugu) is accepted, not rejected', te.r.status === 201 && te.doc.language === 'te' && te.doc.source === 'voice');
  const badLang = await mk({ originalText: 'x', source: 'text', language: 'xx', country: 'IN' });
  check('an unsupported language code is still rejected (400)', badLang.r.status === 400);
  await call(analyzeRequest, { body: { requestId: vDoc.doc.requestId } });
  check('AI analysis does not change the stored source', vDoc.doc.source === 'voice');

  // ================================================================ 5 + 6 (static)
  section('5/6. Static source checks');
  const fe = (f) => fs.readFileSync(path.join(__dirname, '../../../frontend/src', f), 'utf8');
  const dash = fe('pages/DashboardPage.jsx');
  const rank = dash.slice(dash.indexOf('>Priority Ranking</h2>'));
  const rankHint = rank.slice(0, rank.indexOf('</p>'));
  check('Priority Ranking subtitle says it is ranked by priority score', /ranked by priority score/.test(rankHint));
  check('Priority Ranking subtitle no longer claims "hotspot score" ranking', !/ranked by concentrated citizen demand/.test(rankHint));
  check('ranking table still sorted/displayed by priorityScore (logic untouched)', /fetchPriorities\(\{ limit: 5, country \}\)/.test(dash) && /<td>\{p\.priorityScore\}<\/td>/.test(dash));
  check('Top Demand Hotspots subtitle (hotspot score) left as it was', /Regions ranked by concentrated citizen demand \(hotspot score\)/.test(dash.slice(0, dash.indexOf('>Priority Ranking</h2>'))));

  const page = fe('pages/CitizenInputPage.jsx');
  const resetFn = page.slice(page.indexOf('const resetForNewSubmission'), page.indexOf('const handleSubmit'));
  check('recalcWarning is cleared by resetForNewSubmission', /setRecalcWarning\(''\)/.test(resetFn));
  const submitFn = page.slice(page.indexOf('const handleSubmit'));
  check('handleSubmit resets before the request is created', submitFn.indexOf('resetForNewSubmission()') !== -1 && submitFn.indexOf('resetForNewSubmission()') < submitFn.indexOf('createRequest('));
  check('the warning itself is still set when recalculation fails', /setRecalcWarning\('Your request was saved and understood/.test(page));

  console.log(`\nPassed: ${passCount}  Failed: ${failCount}`);
  process.exit(failCount === 0 ? 0 : 1);
})().catch((e) => { console.error('Probe crashed:', e); process.exit(1); });
