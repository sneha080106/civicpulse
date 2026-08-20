// Forces mock mode for this run, regardless of .env, so it works without a
// real LLM_API_KEY. Must be set BEFORE anything requires config/env.js.
process.env.AI_MOCK_MODE = 'true';

const { analyzeCitizenRequest } = require('../services/ai/requestAnalysis.service');
const { validateAnalysis } = require('../utils/requestValidation');

let passCount = 0;
let failCount = 0;

const getPath = (obj, path) => path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);

const runCase = async (label, text, expectations) => {
  console.log(`\n${label}`);
  console.log(`Input:\n${text}`);
  try {
    const result = await analyzeCitizenRequest(text);
    console.log(`Language: ${result.language}`);
    console.log(`Category: ${result.category}`);
    console.log(`Urgency: ${result.urgency}`);
    console.log(`Location confidence: ${result.locationConfidence}`);
    console.log(`District: ${result.location.district}`);

    for (const [key, expected] of Object.entries(expectations || {})) {
      const actual = getPath(result, key);
      if (actual !== expected) throw new Error(`Expected ${key}="${expected}" but got "${actual}"`);
    }
    console.log('PASS');
    passCount++;
  } catch (err) {
    console.log(`FAIL: ${err.message}`);
    failCount++;
  }
};

const run = async () => {
  console.log('=== CivicPulse AI Request Analysis ===');

  await runCase('Test 1: English healthcare request', 'The nearest government hospital is more than 20 km away.', { language: 'en', category: 'Healthcare' });
  await runCase('Test 2: Hindi healthcare request', 'हमारे गांव में अस्पताल बहुत दूर है।', { language: 'hi', category: 'Healthcare' });
  await runCase('Test 3: Bengali water request', 'আমাদের এলাকায় পানীয় জলের সমস্যা অনেকদিন ধরে আছে।', { language: 'bn', category: 'Water & Sanitation' });
  await runCase('Test 4: English road request', 'The road connecting our village to the highway has huge potholes.', { language: 'en', category: 'Roads & Transport' });
  await runCase('Test 5: Unknown location (must not fabricate district)', 'हमारे गांव में अस्पताल बहुत दूर है।', { 'location.district': null });

  console.log('\nTest 6: Invalid/malformed AI response (validation check)');
  try {
    const malformed = {
      language: 'fr',
      translatedText: 'Some text',
      category: 'NotARealCategory',
      location: { country: 'India', state: 'X', district: 'Y' },
      locationConfidence: 'VERY_HIGH',
      urgency: 'CRITICAL',
      confidence: 5,
    };
    const validation = validateAnalysis(malformed);
    if (validation.valid) throw new Error('Expected validation to reject malformed AI output, but it passed');
    console.log(`Correctly rejected with ${validation.errors.length} error(s):`);
    validation.errors.forEach((e) => console.log(`  - ${e}`));
    console.log('PASS');
    passCount++;
  } catch (err) {
    console.log(`FAIL: ${err.message}`);
    failCount++;
  }

  console.log('\nTest 7: Mock mode is active');
  if (process.env.AI_MOCK_MODE === 'true') {
    console.log('AI_MOCK_MODE=true confirmed for this test run.');
    console.log('PASS');
    passCount++;
  } else {
    console.log('FAIL: AI_MOCK_MODE was not set to true');
    failCount++;
  }

  console.log(`\n=== Test Summary: ${passCount} passed, ${failCount} failed ===\n`);
  process.exitCode = failCount > 0 ? 1 : 0; // avoids the Node 24/Windows process.exit() crash seen earlier
};

run();