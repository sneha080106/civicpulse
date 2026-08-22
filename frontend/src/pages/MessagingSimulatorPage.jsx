import { useState } from 'react';
import { submitMessagingRequest, analyzeRequest } from '../services/api';
import AIUnderstandingCard from '../components/AIUnderstandingCard';

const CHANNELS = [
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'sms', label: 'SMS' },
];

const COUNTRIES = [
  { code: 'IN', label: 'India' },
  { code: 'BR', label: 'Brazil' },
  { code: 'RU', label: 'Russia' },
  { code: 'CN', label: 'China' },
  { code: 'ZA', label: 'South Africa' },
];

// idle -> submitting -> analyzing -> done | error
const MessagingSimulatorPage = () => {
  const [channel, setChannel] = useState('whatsapp');
  const [message, setMessage] = useState('');
  const [country, setCountry] = useState('IN');
  const [language, setLanguage] = useState('');
  const [region, setRegion] = useState('');
  const [status, setStatus] = useState('idle');
  const [requestId, setRequestId] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!message.trim()) return;

    setStatus('submitting');
    setErrorMessage('');
    setAnalysis(null);

    let createdId;
    try {
      const response = await submitMessagingRequest({
        channel,
        senderId: 'demo-user-001',
        message: message.trim(),
        country,
        language: language || undefined,
        region: region || undefined,
      });
      createdId = response.data.requestId;
      setRequestId(createdId);
    } catch (err) {
      setErrorMessage(err?.response?.data?.message || 'Unable to submit the simulated message.');
      setStatus('error');
      return;
    }

    setStatus('analyzing');
    try {
      const analyzeResponse = await analyzeRequest(createdId);
      setAnalysis(analyzeResponse.data.analysis);
      setStatus('done');
      setMessage('');
    } catch (err) {
      setErrorMessage('Request was saved but AI analysis could not be completed.');
      setStatus('error');
    }
  };

  const isBusy = status === 'submitting' || status === 'analyzing';

  return (
    <div>
      <div className="page-header">
        <div className="page-header-eyebrow">Messaging Channel Simulator</div>
        <h1>Simulate a Messaging Submission</h1>
        <p>
          This is a demo simulator for the messaging ingestion pipeline — it is <strong>not</strong> connected to
          real WhatsApp, Telegram, or SMS providers. It demonstrates that a message from any channel enters the same
          existing citizen-request pipeline as text and voice input.
        </p>
      </div>

      <div className="surface-card section-block" style={{ maxWidth: 640 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <span className="form-label">Simulated Channel</span>
            <div className="source-selector">
              {CHANNELS.map((c) => (
                <div
                  key={c.id}
                  className={`source-option ${channel === c.id ? 'selected' : ''}`}
                  onClick={() => !isBusy && setChannel(c.id)}
                >
                  {c.label}
                </div>
              ))}
            </div>
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="sim-message">Citizen Message</label>
            <textarea
              id="sim-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Our village needs better drinking water"
              disabled={isBusy}
              required
            />
          </div>

          <div className="form-grid-2">
            <div className="form-field">
              <label className="form-label" htmlFor="sim-country">Country</label>
              <select id="sim-country" value={country} onChange={(e) => setCountry(e.target.value)} disabled={isBusy}>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="sim-language">Language (optional label)</label>
              <input id="sim-language" type="text" value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="e.g. Hindi" disabled={isBusy} />
            </div>
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="sim-region">Region (optional)</label>
            <input id="sim-region" type="text" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. Bihar" disabled={isBusy} />
          </div>

          <button type="submit" className="btn btn-primary" disabled={isBusy || !message.trim()}>
            {status === 'submitting' ? 'Sending...' : status === 'analyzing' ? 'Understanding...' : 'Send Simulated Message'}
          </button>
        </form>

        {requestId && (
          <div className="badge badge-neutral" style={{ marginTop: '12px', display: 'block', width: 'fit-content' }}>
            Request ID: {requestId}
          </div>
        )}

        {status === 'error' && (
          <div className="badge badge-danger" style={{ marginTop: '12px', display: 'block', width: 'fit-content' }}>
            {errorMessage}
          </div>
        )}
      </div>

      {status === 'done' && analysis && <AIUnderstandingCard analysis={analysis} confirmed={false} onConfirm={() => {}} />}
    </div>
  );
};

export default MessagingSimulatorPage;