const mongoose = require('mongoose');
const { resolveCountryName, DEFAULT_COUNTRY_CODE, getCountryByCode } = require('../config/countries');
const { createCitizenRequestCore } = require('./request.controller');

const SUPPORTED_CHANNELS = ['whatsapp', 'telegram', 'sms'];

/**
 * POST /api/messaging/webhook
 *
 * Provider-agnostic messaging ingestion. Accepts a normalized-style payload
 * (channel, senderId, message, country, language, region, messageId),
 * converts it into the EXACT shape the existing text pipeline expects, and
 * calls the SAME createCitizenRequestCore() used by POST /api/requests.
 * No separate AI/scoring/recommendation logic exists here — everything
 * downstream of storage (analyze, priority, recommendation) is the
 * existing, untouched system.
 *
 * This is a simulator endpoint — no real WhatsApp/Telegram/Twilio
 * credentials are used or required.
 */
const receiveMessage = async (req, res, next) => {
  try {
    const { channel, senderId, message, country, language, region, messageId } = req.body;

    // --- Validation ---
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'message is required and must be a non-empty string' });
    }
    if (channel !== undefined && !SUPPORTED_CHANNELS.includes(channel)) {
      return res.status(400).json({
        success: false,
        message: `Invalid channel "${channel}". Must be one of: ${SUPPORTED_CHANNELS.join(', ')}`,
      });
    }

    let countryCode = DEFAULT_COUNTRY_CODE;
    if (country !== undefined && country !== null && country !== '') {
      const resolved = getCountryByCode(country);
      if (!resolved) {
        return res.status(400).json({ success: false, message: `Invalid country code "${country}"` });
      }
      countryCode = country;
    }

    // --- Idempotency (best-effort) ---
    // CitizenRequest.messageId is optional and NOT unique-indexed (see model
    // comment) — this is a documented, non-destructive limitation, not a
    // silent gap: a genuinely strict guarantee would need a unique index
    // migration, which is out of scope for an additive-only step. This
    // check still prevents the common case (an immediate webhook retry).
    if (messageId) {
      const CitizenRequest = mongoose.model('CitizenRequest');
      const existing = await CitizenRequest.findOne({ messageId });
      if (existing) {
        return res.status(200).json({
          success: true,
          data: { requestId: existing.requestId, status: 'already_received', duplicate: true },
        });
      }
    }

    // --- Normalize into the existing pipeline's expected shape ---
    const normalized = {
      originalText: message.trim(),
      source: 'messaging', // existing enum value, already supported since Step 2/6
      country: countryCode,
      channel: channel || null,
      senderId: senderId || null,
      messageId: messageId || null,
      // language here is a free-text label from the simulated provider
      // (e.g. "Hindi") — NOT the internal en/hi/bn code. It is stored only
      // as metadata; the existing AI analysis step still independently
      // detects the actual language code from the text itself, exactly as
      // it already does for text/voice submissions. No new translation
      // system introduced, per Step 17 Section 6.
      sourceLanguageLabel: region ? `${language || 'Unknown'} (${region})` : (language || null),
    };

    const saved = await createCitizenRequestCore(normalized);

    res.status(201).json({
      success: true,
      data: {
        requestId: saved.requestId,
        status: 'received',
        channel: normalized.channel,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { receiveMessage, SUPPORTED_CHANNELS };