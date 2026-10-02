// Offline probe — NO MongoDB required. Run: node src/scripts/testMessagingSchema.js
//
// Verifies that the messaging metadata fields (channel, senderId, messageId,
// sourceLanguageLabel) are real top-level CitizenRequest paths, and that the
// existing POST /api/messaging/webhook handler's idempotency check works
// against the corrected schema. Database I/O is replaced by an in-memory
// store, but schema construction, validation, toObject() (what Mongoose would
// persist) and findOne() filter casting all use the REAL Mongoose model.

process.env.PORT = process.env.PORT || '5000';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:1/unused';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'probe-secret';

const CitizenRequest = require('../models/CitizenRequest');
const { receiveMessage } = require('../controllers/messaging.controller');

let passCount = 0;
let failCount = 0;
const check = (label, passed, detail = '') => {
  if (passed) { console.log(`✅ ${label} — PASS`); passCount++; }
  else { console.log(`❌ ${label} — FAIL ${detail}`); failCount++; }
};

// ---- 1. Schema construction (the check requested in the task) ----
const request = new CitizenRequest({
  channel: 'messaging',
  senderId: 'test-sender',
  messageId: 'test-message-123',
  sourceLanguageLabel: 'Hindi',
});
console.log(request.channel);
console.log(request.senderId);
console.log(request.messageId);
console.log(request.sourceLanguageLabel);

check('channel survives construction', request.channel === 'messaging');
check('senderId survives construction', request.senderId === 'test-sender');
check('messageId survives construction', request.messageId === 'test-message-123');
check('sourceLanguageLabel survives construction', request.sourceLanguageLabel === 'Hindi');

const paths = Object.keys(CitizenRequest.schema.paths);
['channel', 'senderId', 'messageId', 'sourceLanguageLabel'].forEach((f) => {
  check(`"${f}" is a top-level schema path`, paths.includes(f));
  check(`"aiUnderstanding.${f}" no longer exists`, !paths.includes(`aiUnderstanding.${f}`));
});
check('aiUnderstanding keeps only AI fields', paths.filter((p) => p.startsWith('aiUnderstanding.')).sort().join(',') ===
  ['analyzedAt', 'category', 'confidence', 'language', 'location.country', 'location.district', 'location.state',
   'locationConfidence', 'problem', 'subCategory', 'translatedText', 'urgency']
    .map((f) => `aiUnderstanding.${f}`).sort().join(','));

const fresh = new CitizenRequest({ requestId: 'CR900', originalText: 'x', language: 'en', category: 'Other', source: 'text' });
check('text/voice requests default metadata to null', fresh.channel === null && fresh.messageId === null &&
  fresh.senderId === null && fresh.sourceLanguageLabel === null);

// ---- 2. Webhook idempotency against an in-memory store ----
const store = [];
const realFindOne = CitizenRequest.findOne.bind(CitizenRequest);
let lastCastFilter = null;

CitizenRequest.countDocuments = async () => store.length;
CitizenRequest.prototype.save = async function save() {
  await this.validate();
  store.push(this.toObject()); // exactly what Mongoose would write to MongoDB
  return this;
};
CitizenRequest.findOne = async (filter) => {
  // Real Mongoose casting of the filter, then top-level equality match on stored docs.
  lastCastFilter = realFindOne(filter).cast(CitizenRequest);
  return store.find((doc) => Object.entries(lastCastFilter).every(([k, v]) => doc[k] === v)) || null;
};

const callWebhook = async (body) => {
  let status; let payload; let error;
  await receiveMessage({ body }, { status(c) { status = c; return this; }, json(p) { payload = p; return this; } }, (e) => { error = e; });
  return { status, payload, error };
};

(async () => {
  const body = { channel: 'whatsapp', senderId: 'demo-user-001', message: 'Our village needs drinking water',
    country: 'IN', language: 'Hindi', region: 'Bihar', messageId: 'wamid.ABC123' };

  const first = await callWebhook(body);
  check('first delivery -> 201 received', first.status === 201 && first.payload?.data?.status === 'received', JSON.stringify(first));
  check('first delivery stored exactly one request', store.length === 1);
  const stored = store[0] || {};
  check('stored doc persisted messageId', stored.messageId === 'wamid.ABC123');
  check('stored doc persisted channel', stored.channel === 'whatsapp');
  check('stored doc persisted senderId', stored.senderId === 'demo-user-001');
  check('stored doc persisted sourceLanguageLabel', stored.sourceLanguageLabel === 'Hindi (Bihar)');
  check('stored doc source is "messaging"', stored.source === 'messaging');
  check('stored aiUnderstanding has no messaging fields', !('messageId' in (stored.aiUnderstanding || {})));

  const retry = await callWebhook(body);
  check('retry lookup is cast onto top-level messageId', lastCastFilter && lastCastFilter.messageId === 'wamid.ABC123');
  check('retry -> 200 already_received + duplicate:true', retry.status === 200 &&
    retry.payload?.data?.status === 'already_received' && retry.payload?.data?.duplicate === true, JSON.stringify(retry));
  check('retry returns the ORIGINAL requestId', retry.payload?.data?.requestId === first.payload?.data?.requestId);
  check('retry created NO duplicate request', store.length === 1);

  const other = await callWebhook({ ...body, messageId: 'wamid.DIFFERENT' });
  check('different messageId -> new request (201)', other.status === 201 && store.length === 2);

  const noId1 = await callWebhook({ channel: 'sms', message: 'Road is broken' });
  const noId2 = await callWebhook({ channel: 'sms', message: 'Road is broken' });
  check('deliveries without messageId are never deduplicated (existing behaviour)',
    noId1.status === 201 && noId2.status === 201 && store.length === 4);

  console.log(`\nPassed: ${passCount}  Failed: ${failCount}`);
  process.exit(failCount === 0 ? 0 : 1);
})().catch((err) => { console.error('Probe crashed:', err); process.exit(1); });
