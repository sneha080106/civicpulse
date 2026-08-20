// Integration test — hits the RUNNING backend over HTTP.
// Start the server first (npm run dev), THEN run this in a second terminal.
// Uses Node's built-in fetch — no new dependency.

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
  console.log('=== CivicPulse Request + AI Analyze API Test ===\n');
  let createdRequestId = null;

  // 1. POST /api/requests
  try {
    const res = await fetch(`${BASE_URL}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalText: 'हमारे इलाके में अस्पताल बहुत दूर है',
        source: 'text',
      }),
    });
    const body = await res.json();
    const ok = res.status === 201 && body.success === true && body.data && body.data.status === 'received';
    logResult('POST /api/requests', ok);
    if (ok) createdRequestId = body.data.requestId;
  } catch (err) {
    logResult('POST /api/requests', false, err.message);
  }

  // 2. POST /api/requests/analyze
  try {
    if (!createdRequestId) throw new Error('No requestId available from the create step');
    const res = await fetch(`${BASE_URL}/requests/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: createdRequestId }),
    });
    const body = await res.json();
    const ok = res.ok && body.success === true && body.data && body.data.analysis && body.data.analysis.category;
    logResult('POST /api/requests/analyze', ok);
  } catch (err) {
    logResult('POST /api/requests/analyze', false, err.message);
  }

  // 3. Verify the MongoDB document was actually updated
  try {
    if (!createdRequestId) throw new Error('No requestId available');
    const res = await fetch(`${BASE_URL}/requests`);
    const body = await res.json();
    const updated = body.requests.find((r) => r.requestId === createdRequestId);
    const ok = updated && updated.category && updated.category !== 'Other' && updated.translatedText;
    logResult('MongoDB document reflects AI-derived fields', Boolean(ok));
  } catch (err) {
    logResult('MongoDB document reflects AI-derived fields', false, err.message);
  }

  console.log(`\n=== Test Summary: ${passCount} passed, ${failCount} failed ===\n`);
  process.exitCode = failCount > 0 ? 1 : 0;
};

run();