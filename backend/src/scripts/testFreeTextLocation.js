// Offline probe — NO MongoDB required. Run: node src/scripts/testFreeTextLocation.js
//
// Verifies the free-text path:
//   submission -> AI analysis -> supported country/district -> priority engine -> hotspots
//
// The REAL controllers, analysis service, region matching, priority engine and
// hotspot aggregation run unmodified. Only MongoDB I/O is replaced by an
// in-memory store, seeded from the repo's own seed files (the same data that
// `npm run seed` / `npm run seed:brics` would put in the database). The LLM is
// replaced by a fake for the real-AI-mode checks.

process.env.PORT = process.env.PORT || '5000';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:1/unused';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'probe-secret';
process.env.AI_MOCK_MODE = 'true';

const mongoose = require('mongoose');
require('../models');

let passCount = 0;
let failCount = 0;
const check = (label, passed, detail = '') => {
  if (passed) { console.log(`✅ ${label} — PASS`); passCount++; }
  else { console.log(`❌ ${label} — FAIL ${detail}`); failCount++; }
};
const section = (title) => console.log(`\n--- ${title}`);

// ---------------------------------------------------------------- in-memory DB
const seedBrics = require('../seed/bricsCountries.seed');
const db = {
  citizen: [],
  priority: [],
  demographic: [...require('../seed/demographics'), ...seedBrics.demographics],
  infrastructure: [...require('../seed/infrastructure'), ...seedBrics.infrastructure],
  investment: [...require('../seed/investments'), ...seedBrics.investments],
};
const resetRequests = () => { db.citizen.length = 0; db.priority.length = 0; };

const getPath = (doc, path) => path.split('.').reduce((o, k) => (o === null || o === undefined ? undefined : o[k]), doc);
const same = (a, b) => (a === undefined ? null : a) === (b === undefined ? null : b);
const matches = (doc, filter = {}) => Object.entries(filter).every(([key, cond]) => {
  const value = getPath(doc, key);
  if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
    if ('$in' in cond) return cond.$in.some((c) => same(value, c));
    if ('$nin' in cond) return !cond.$nin.some((c) => same(value, c));
  }
  return same(value, cond);
});
const query = (resolve) => {
  let sortSpec = null;
  const q = {
    sort(spec) { sortSpec = spec; return q; }, limit() { return q; }, lean() { return q; }, select() { return q; },
    then(ok, bad) { return Promise.resolve().then(() => resolve(sortSpec)).then(ok, bad); },
  };
  return q;
};

const CitizenRequest = mongoose.model('CitizenRequest');
const Demographic = mongoose.model('Demographic');
const Infrastructure = mongoose.model('Infrastructure');
const Investment = mongoose.model('Investment');
const PriorityResult = mongoose.model('PriorityResult');

Demographic.find = (filter) => query(() => db.demographic.filter((d) => matches(d, filter)));
Infrastructure.find = (filter) => query(() => db.infrastructure.filter((d) => matches(d, filter)));
Investment.findOne = (filter) => query((sort) => {
  const rows = db.investment.filter((d) => matches(d, filter));
  if (sort && sort.financialYear === -1) rows.sort((a, b) => String(b.financialYear).localeCompare(String(a.financialYear)));
  return rows[0] || null;
});
CitizenRequest.countDocuments = async () => db.citizen.length;
CitizenRequest.find = (filter) => query(() => db.citizen.filter((d) => matches(d, filter)));
CitizenRequest.findOne = (filter) => query(() => db.citizen.find((d) => matches(d, filter)) || null);
CitizenRequest.aggregate = async () => {
  const seen = new Map();
  db.citizen.forEach((d) => {
    const id = { district: d.location.district, sector: d.category, country: d.location.country };
    seen.set(JSON.stringify(id), { _id: id });
  });
  return [...seen.values()];
};
CitizenRequest.prototype.save = async function save() {
  await this.validate();
  if (!db.citizen.includes(this)) db.citizen.push(this);
  return this;
};
PriorityResult.find = (filter) => query(() => db.priority.filter((d) => matches(d, filter)));
PriorityResult.findOneAndUpdate = async (filter, update) => {
  const existing = db.priority.find((d) => matches(d, filter));
  if (existing) { Object.assign(existing, update); return existing; }
  db.priority.push({ ...update });
  return update;
};
PriorityResult.deleteMany = async (filter) => {
  const before = db.priority.length;
  const keep = db.priority.filter((d) => !matches(d, filter));
  db.priority.length = 0; db.priority.push(...keep);
  return { deletedCount: before - keep.length };
};

// ------------------------------------------------------------------ the code under test
const { createRequest, analyzeRequest } = require('../controllers/request.controller');
const { createCitizenRequest } = require('../controllers/citizenRequest.controller');
const { regenerateAllPriorityResults } = require('../services/priorityGeneration.service');
const { calculateHotspots } = require('../services/hotspotAggregation.service');
const { getSupportedRegions } = require('../services/regionRegistry.service');
const { resolveSupportedLocation, findRegionInText } = require('../utils/locationMatch');
const { mockAnalyzeCitizenRequest } = require('../services/ai/mockAnalysis.service');

const call = async (handler, body) => {
  let status; let payload; let error;
  await handler({ body }, { status(c) { status = c; return this; }, json(p) { payload = p; return this; } }, (e) => { error = e; });
  if (error) throw error;
  return { status, payload };
};
const submitFreeText = async (text, country = 'IN') => {
  const created = await call(createRequest, { originalText: text, source: 'text', country });
  const analyzed = await call(analyzeRequest, { requestId: created.payload.data.requestId });
  const doc = db.citizen.find((d) => d.requestId === created.payload.data.requestId);
  return { created, analyzed, doc, analysis: analyzed.payload.data.analysis };
};
const priorityFor = (regionId, sector) => db.priority.find((p) => p.regionId === regionId && p.sector === sector);

(async () => {
  // ====================================================== registry
  section('Region registry (reuses the Demographic data)');
  const regions = await getSupportedRegions();
  check('registry returns every seeded region', regions.length === db.demographic.length, `got ${regions.length}`);
  check('registry has India > Jharkhand > Ranchi', regions.some((r) => r.country === 'India' && r.state === 'Jharkhand' && r.district === 'Ranchi'));
  const realFind = Demographic.find;
  Demographic.find = () => { throw new Error('db down'); };
  check('registry returns [] (never throws) if the lookup fails', (await getSupportedRegions()).length === 0);
  Demographic.find = realFind;

  // ====================================================== Scenario A
  section('Scenario A — known Indian location (free text, mock AI)');
  resetRequests();
  const A = await submitFreeText('I am from Ranchi, Jharkhand. The road near my area is badly damaged.');
  check('A: analysis -> India', A.analysis.location.country === 'India', JSON.stringify(A.analysis.location));
  check('A: analysis -> district Ranchi', A.analysis.location.district === 'Ranchi');
  check('A: analysis -> state Jharkhand (from the Ranchi region record)', A.analysis.location.state === 'Jharkhand');
  check('A: location confidence HIGH (district + state both in the text)', A.analysis.locationConfidence === 'HIGH');
  check('A: stored request has country India', A.doc.location.country === 'India');
  check('A: stored request has district Ranchi', A.doc.location.district === 'Ranchi');
  check('A: stored aiUnderstanding.location matches', A.doc.aiUnderstanding.location.district === 'Ranchi');
  check('A: category Roads & Transport (existing mock keywords)', A.doc.category === 'Roads & Transport');
  const warnings = await regenerateAllPriorityResults();
  const pa = priorityFor('JH-RAN', 'Roads & Transport');
  check('A: request matched the seeded Ranchi region -> priority result exists', Boolean(pa), JSON.stringify(warnings));
  check('A: priority result counts the request', pa && pa.citizenRequestCount === 1);
  check('A: priority score is a number from the existing engine', pa && typeof pa.priorityScore === 'number' && pa.priorityScore > 0);
  const hotspots = await calculateHotspots(null);
  check('A: Ranchi appears in hotspots', hotspots.some((h) => h.district === 'Ranchi' && h.citizenRequestCount === 1));

  // ====================================================== Scenario B
  section('Scenario B — location not provided');
  resetRequests();
  const B = await submitFreeText('The street lights in my area have not worked for two weeks.');
  check('B: analysis district stays null', B.analysis.location.district === null);
  check('B: analysis state stays null', B.analysis.location.state === null);
  check('B: analysis country stays null (nothing was found in the text)', B.analysis.location.country === null);
  check('B: confidence LOW (existing missing-location behaviour)', B.analysis.locationConfidence === 'LOW');
  check('B: stored district null — not randomly assigned', B.doc.location.district === null);
  check('B: the KNOWN country (India) is preserved, not erased', B.doc.location.country === 'India', JSON.stringify(B.doc.toObject().location));
  await regenerateAllPriorityResults();
  check('B: request does NOT enter priorities', db.priority.length === 0);
  const B2 = await call(analyzeRequest, { requestId: B.created.payload.data.requestId });
  check('B: re-analysis keeps the country too', B2.status === 200 && B.doc.location.country === 'India' && B.doc.location.district === null);

  const unsupported = mockAnalyzeCitizenRequest('The road in Patna is broken', { regions });
  check('B: a place that is not a supported district -> unknown', unsupported.location.district === null && unsupported.locationConfidence === 'LOW');
  const twoPlaces = mockAnalyzeCitizenRequest('The road from Ranchi to Dhanbad is broken', { regions });
  check('B: two districts named -> ambiguous -> unknown (no guessing)', twoPlaces.location.district === null);
  const hindi = mockAnalyzeCitizenRequest('हमारे गांव में सड़क खराब है', { regions });
  check('B: text with no place -> unknown', hindi.location.district === null);
  const noRegions = mockAnalyzeCitizenRequest('Road in Ranchi is broken');
  check('B: without a region list the mock behaves as before (null location)', noRegions.location.district === null && noRegions.locationConfidence === 'LOW');
  const nearMiss = findRegionInText('The road in Rachi is broken', regions);
  check('B: near-miss spelling is NOT fuzzy-matched', nearMiss.region === null);
  check('B: "Gayatri Nagar" does not match district Gaya (whole words only)', findRegionInText('Gayatri Nagar road is bad', regions).region === null);

  // ====================================================== Scenario C
  section('Scenario C — casing / whitespace variation');
  const lower = resolveSupportedLocation({ country: null, state: null, district: 'ranchi' }, regions);
  check('C: "ranchi" resolves to canonical Ranchi / Jharkhand / India',
    lower.resolved && lower.location.district === 'Ranchi' && lower.location.state === 'Jharkhand' && lower.location.country === 'India');
  const padded = resolveSupportedLocation({ country: 'india', state: null, district: '  RANCHI ' }, regions);
  check('C: "  RANCHI " resolves to Ranchi', padded.resolved && padded.location.district === 'Ranchi');
  check('C: lowercase name inside free text is found', mockAnalyzeCitizenRequest('ranchi mein road kharab hai', { regions }).location.district === 'Ranchi');
  const diac = mockAnalyzeCitizenRequest('Water problem in Sao Paulo', { regions });
  check('C: diacritics folded when searching text (Sao Paulo -> São Paulo)', diac.location.district === 'São Paulo');

  resetRequests();
  const mk = (district, country, category = 'Healthcare', n = 1) => {
    for (let i = 0; i < n; i += 1) {
      db.citizen.push(new CitizenRequest({
        requestId: `CRX${db.citizen.length + 1}`, originalText: 'x', language: 'en', category, source: 'text',
        urgency: 'HIGH', location: { country, district },
      }));
    }
  };
  mk('Ranchi', 'India'); mk('ranchi', 'india'); mk(' Ranchi ', 'India ', 'Healthcare'); mk('Dhanbad', 'India', 'Healthcare', 2);
  await regenerateAllPriorityResults();
  const ranchiResults = db.priority.filter((p) => p.regionId === 'JH-RAN' && p.sector === 'Healthcare');
  check('C: the three spellings become ONE Ranchi/Healthcare result (not three locations)', ranchiResults.length === 1, `got ${ranchiResults.length}`);
  check('C: that result counts all 3 requests', ranchiResults[0] && ranchiResults[0].citizenRequestCount === 3);
  check('C: result uses the canonical district name "Ranchi"', ranchiResults[0] && ranchiResults[0].district === 'Ranchi');
  check('C: a different district is unaffected (Dhanbad = 2)', priorityFor('JH-DHN', 'Healthcare')?.citizenRequestCount === 2);
  const hs = await calculateHotspots(null);
  check('C: hotspots list "Ranchi" once, canonical', hs.filter((h) => h.district.toLowerCase().trim() === 'ranchi').length === 1 && hs.some((h) => h.district === 'Ranchi'));
  resetRequests();
  mk('Rachi', 'India');
  await regenerateAllPriorityResults();
  check('C: misspelling "Rachi" is NOT matched to Ranchi', db.priority.length === 0);

  // ====================================================== Scenario D
  section('Scenario D — existing structured request is unchanged');
  resetRequests();
  const sc = await call(createCitizenRequest, {
    description: 'The hospital in Gaya is very far from us', category: 'Healthcare', state: 'Jharkhand',
    district: 'Dhanbad', urgency: 'LOW', country: 'IN',
  });
  check('D: structured submit -> 201 received', sc.status === 201 && sc.payload.data.status === 'received');
  const sdoc = db.citizen.find((d) => d.requestId === sc.payload.data.requestId);
  const sa = await call(analyzeRequest, { requestId: sdoc.requestId });
  check('D: analyze -> 200, citizenSelectionPreserved', sa.status === 200 && sa.payload.data.citizenSelectionPreserved === true);
  check('D: citizen-selected category kept', sdoc.category === 'Healthcare');
  check('D: citizen-selected urgency kept (AI mock says MEDIUM)', sdoc.urgency === 'LOW');
  check('D: citizen-selected district/state/country kept (text mentions Gaya, selection is Dhanbad)',
    sdoc.location.district === 'Dhanbad' && sdoc.location.state === 'Jharkhand' && sdoc.location.country === 'India');
  check('D: aiUnderstanding still stored', sdoc.aiUnderstanding.category !== null && sdoc.aiUnderstanding.analyzedAt instanceof Date);
  check('D: structured analysis gets no region context -> AI location stays null (as before)',
    sdoc.aiUnderstanding.location.district === null && sa.payload.data.analysis.location.district === null);
  await regenerateAllPriorityResults();
  check('D: structured request still reaches priorities (Dhanbad Healthcare)', priorityFor('JH-DHN', 'Healthcare')?.citizenRequestCount === 1);

  // ====================================================== real AI mode (fake LLM)
  section('Real AI mode (LLM faked) — region context and enforcement');
  const loadRealService = (llmImpl) => {
    process.env.AI_MOCK_MODE = 'false'; process.env.LLM_API_KEY = 'k'; process.env.LLM_MODEL = 'm';
    Object.keys(require.cache).filter((k) => /config[\\/]env\.js$|services[\\/]ai[\\/]/.test(k)).forEach((k) => delete require.cache[k]);
    const llm = require('../services/ai/llmProvider');
    llm.callLLM = llmImpl;
    return require('../services/ai/requestAnalysis.service').analyzeCitizenRequest;
  };
  const llmReply = (loc, conf = 'HIGH') => JSON.stringify({
    language: 'en', translatedText: 't', category: 'Roads & Transport', subCategory: null, problem: 'p',
    location: loc, locationConfidence: conf, urgency: 'MEDIUM', confidence: 0.9,
  });
  let seen = null;
  let analyzeReal = loadRealService(async (system, user) => { seen = { system, user }; return llmReply({ country: null, state: null, district: 'ranchi' }); });

  const r1 = await analyzeReal('Road in ranchi is broken', { regions, countryHint: 'India' });
  check('real: prompt lists the supported regions from the registry', seen.system.includes('SUPPORTED REGIONS') && seen.system.includes('Jharkhand: Dhanbad, Jamshedpur, Ranchi'));
  check('real: prompt tells the model to return null instead of guessing', /return null for location\.district/.test(seen.system) && /Never choose the closest/.test(seen.system));
  check('real: prompt is built from data, not a long hardcoded list (22 regions, small prompt)', seen.system.length < 4000, `len=${seen.system.length}`);
  check('real: citizen text is passed as the user message', seen.user === 'Road in ranchi is broken');
  check('real: AI "ranchi" is canonicalized to India / Jharkhand / Ranchi',
    r1.location.district === 'Ranchi' && r1.location.state === 'Jharkhand' && r1.location.country === 'India');

  analyzeReal = loadRealService(async () => llmReply({ country: 'India', state: 'Bihar', district: 'Patna' }));
  const r2 = await analyzeReal('Road in Patna is broken', { regions });
  check('real: AI-invented / unsupported district "Patna" -> dropped to null', r2.location.district === null);
  check('real: ...and location confidence forced to LOW', r2.locationConfidence === 'LOW');

  analyzeReal = loadRealService(async () => llmReply({ country: null, state: null, district: null }, 'LOW'));
  const r3 = await analyzeReal('Street lights are out', { regions });
  check('real: AI returns null location -> stays null', r3.location.district === null && r3.locationConfidence === 'LOW');

  analyzeReal = loadRealService(async (system) => { seen = { system }; return llmReply({ country: null, state: null, district: 'Atlantis' }); });
  const r4 = await analyzeReal('Road in Atlantis is broken');
  check('real: with NO region list the prompt has no region block (unchanged)', !seen.system.includes('SUPPORTED REGIONS'));
  check('real: with NO region list location passes through unchanged (unchanged)', r4.location.district === 'Atlantis');

  console.log(`\nPassed: ${passCount}  Failed: ${failCount}`);
  process.exit(failCount === 0 ? 0 : 1);
})().catch((err) => { console.error('Probe crashed:', err); process.exit(1); });
