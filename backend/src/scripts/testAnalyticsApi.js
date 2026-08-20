// Integration test — hits the RUNNING backend over HTTP.
// Start the server first (npm run dev / npm start) in a separate terminal,
// then run this script. Uses Node's built-in fetch (Node 18+) — no new
// dependency added.

require('../config/env');
const { PORT } = require('../config/env');

const BASE_URL = `http://localhost:${PORT}/api`;

let passCount = 0;
let failCount = 0;

const logResult = (label, passed, detail = '') => {
  if (passed) {
    console.log(`✅ ${label} — PASS`);
    passCount++;
  } else {
    console.log(`❌ ${label} — FAIL ${detail || '(no error detail — check server is running)'}`);
    failCount++;
  }
};

const run = async () => {
  console.log('=== CivicPulse Analytics API Test ===\n');
  let regionIdForRegionTest = null;

  // 1. GET /api/requests
  try {
    const res = await fetch(`${BASE_URL}/requests`);
    const body = await res.json();
    logResult('GET /api/requests', res.ok && body.success === true && Array.isArray(body.requests));
  } catch (err) {
    logResult('GET /api/requests', false, err.message);
  }

  // 2. GET /api/requests?district=Ranchi
  try {
    const res = await fetch(`${BASE_URL}/requests?district=Ranchi`);
    const body = await res.json();
    const allMatch = Array.isArray(body.requests) && body.requests.every((r) => r.location.district === 'Ranchi');
    logResult('GET /api/requests?district=Ranchi', res.ok && body.success === true && allMatch);
  } catch (err) {
    logResult('GET /api/requests?district=Ranchi', false, err.message);
  }

  // 3. GET /api/analytics/overview
  try {
    const res = await fetch(`${BASE_URL}/analytics/overview`);
    const body = await res.json();
    const hasFields =
      body.data &&
      'totalRequests' in body.data &&
      'topConcern' in body.data &&
      'highestPriorityRegion' in body.data &&
      Array.isArray(body.data.languages);
    logResult('GET /api/analytics/overview', res.ok && body.success === true && hasFields);
  } catch (err) {
    logResult('GET /api/analytics/overview', false, err.message);
  }

  // 4. GET /api/analytics/hotspots
  try {
    const res = await fetch(`${BASE_URL}/analytics/hotspots`);
    const body = await res.json();
    logResult('GET /api/analytics/hotspots', res.ok && body.success === true && Array.isArray(body.hotspots));
  } catch (err) {
    logResult('GET /api/analytics/hotspots', false, err.message);
  }

  // 5. GET /api/priorities
  try {
    const res = await fetch(`${BASE_URL}/priorities`);
    const body = await res.json();
    const ok = res.ok && body.success === true && Array.isArray(body.priorities);
    logResult('GET /api/priorities', ok);
    if (ok && body.priorities.length > 0) {
      regionIdForRegionTest = body.priorities[0].regionId;
    }
  } catch (err) {
    logResult('GET /api/priorities', false, err.message);
  }

  // 6. GET /api/priorities?sector=Healthcare
  try {
    const res = await fetch(`${BASE_URL}/priorities?sector=Healthcare`);
    const body = await res.json();
    const allMatch = Array.isArray(body.priorities) && body.priorities.every((p) => p.sector === 'Healthcare');
    logResult('GET /api/priorities?sector=Healthcare', res.ok && body.success === true && allMatch);
  } catch (err) {
    logResult('GET /api/priorities?sector=Healthcare', false, err.message);
  }

  // 7. GET /api/regions/{validRegionId}
  try {
    if (!regionIdForRegionTest) throw new Error('No regionId available from the priorities test');
    const res = await fetch(`${BASE_URL}/regions/${regionIdForRegionTest}`);
    const body = await res.json();
    const hasFields = body.region && body.region.demographics && body.region.demand;
    logResult(`GET /api/regions/${regionIdForRegionTest}`, res.ok && body.success === true && hasFields);
  } catch (err) {
    logResult('GET /api/regions/{id}', false, err.message);
  }

  // 8. POST /api/priorities/recalculate
  try {
    const res = await fetch(`${BASE_URL}/priorities/recalculate`, { method: 'POST' });
    const body = await res.json();
    logResult(
      'POST /api/priorities/recalculate',
      res.ok && body.success === true && typeof body.resultsGenerated === 'number'
    );
  } catch (err) {
    logResult('POST /api/priorities/recalculate', false, err.message);
  }

  // 9. GET /api/priorities again
  try {
    const res = await fetch(`${BASE_URL}/priorities`);
    const body = await res.json();
    logResult('GET /api/priorities (post-recalculate)', res.ok && body.success === true && Array.isArray(body.priorities));
  } catch (err) {
    logResult('GET /api/priorities (post-recalculate)', false, err.message);
  }

  console.log(`\n=== Test Summary: ${passCount} passed, ${failCount} failed ===\n`);
  process.exitcode = failCount > 0 ? 1 : 0;
};

run();