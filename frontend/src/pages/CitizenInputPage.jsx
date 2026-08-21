import { useState } from 'react';
import { createRequest, analyzeRequest, triggerAnalyticsRecalculation } from '../services/api';
import AIUnderstandingCard from '../components/AIUnderstandingCard';
import VoiceInputButton from '../components/VoiceInputButton';
import { useCountry } from '../context/CountryContext';

const SOURCES = [
  { id: 'text', label: 'Text', enabled: true },
  { id: 'messaging', label: 'Messaging', enabled: false },
];

// idle -> submitting -> analyzing -> analyzed | submit_error | analyze_error
const CitizenInputPage = () => {
  const { country } = useCountry();
  const [text, setText] = useState('');
  const [source, setSource] = useState('text');
  const [status, setStatus] = useState('idle');
  const [requestId, setRequestId] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
    // add alongside existing useState declarations:
  const [recalcWarning, setRecalcWarning] = useState('');

  const resetForNewSubmission = () => {
    setRequestId(null);
    setAnalysis(null);
    setConfirmed(false);
    setErrorMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!text.trim()) return;

    resetForNewSubmission();
    setStatus('submitting');

    let createdId;
    try {
    const response = await createRequest({ originalText: text.trim(), source, country });
      createdId = response.data.requestId;
      setRequestId(createdId);
    } catch (err) {
      const backendMessage = err?.response?.data?.message;
          setErrorMessage(backendMessage || 'Your request could not be submitted. Please try again.');
      setStatus('submit_error');
      return;
    }

    setStatus('analyzing');
    try {
      const analyzeResponse = await analyzeRequest(createdId);
      setAnalysis(analyzeResponse.data.analysis);
      setStatus('analyzed');
      setText('');
    } catch (err) {
      const backendMessage = err?.response?.data?.message;
      setErrorMessage(backendMessage || 'Unable to analyze the request at this time.');
      setStatus('analyze_error');
    }
        
    finally {
      try {
        await triggerAnalyticsRecalculation();
      } catch (recalcErr) {
        setRecalcWarning('Your request was saved and understood, but priority analysis is temporarily unavailable.');
      }
    }
  };

  const isBusy = status === 'submitting' || status === 'analyzing';

  return (
    <div>
      <div className="page-header">
        <div className="page-header-eyebrow">Citizen Input</div>
        <h1>Submit an Infrastructure Request</h1>
        <p>Describe the issue in your own words. AI will extract structured information from your message before it enters the priority system.</p>
      </div>

      <div className="surface-card section-block" style={{ maxWidth: 640 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="form-label" htmlFor="request-text">Describe the issue</label>
            <textarea
              id="request-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Ranchi mein government hospital bahut door hai."
              maxLength={2000}
              required
            />
            <div className="form-hint">You can write in English, Hindi, or Bengali. Max 2000 characters.</div>
          </div>
          <VoiceInputButton
            languageCode="en"
            onTranscript={(transcript) => setText((prev) => (prev ? `${prev} ${transcript}` : transcript))}
            disabled={isBusy}
          />

          <div className="form-field">
            <span className="form-label">How is this being submitted?</span>
            <div className="source-selector">
              {SOURCES.map((option) => (
                <div
                  key={option.id}
                  className={`source-option ${source === option.id ? 'selected' : ''} ${!option.enabled ? 'disabled' : ''}`}
                  onClick={() => option.enabled && setSource(option.id)}
                >
                  {option.label}
                  {!option.enabled && <div className="form-hint">Coming soon</div>}
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={isBusy || !text.trim()}>
            {status === 'submitting' ? 'Submitting...' : status === 'analyzing' ? 'Understanding your request...' : 'Submit Request'}
          </button>
        </form>

        {status === 'submitting' && (
          <div className="form-hint" style={{ marginTop: '12px' }}>Storing your request...</div>
        )}

        {status === 'analyzing' && (
          <div className="form-hint" style={{ marginTop: '12px' }}>Understanding your request...</div>
        )}

        {requestId && (status === 'analyzing' || status === 'analyzed' || status === 'analyze_error') && (
          <div className="badge badge-neutral" style={{ marginTop: '12px', display: 'block', width: 'fit-content' }}>
            Request ID: {requestId}
          </div>
        )}

        {status === 'submit_error' && (
          <div className="badge badge-danger" style={{ marginTop: '16px', display: 'block', width: 'fit-content' }}>
            {errorMessage}
          </div>
        )}

        {status === 'analyze_error' && (
          <div style={{ marginTop: '16px' }}>
            <div className="badge badge-danger" style={{ display: 'block', width: 'fit-content', marginBottom: '8px' }}>
              {errorMessage}
            </div>
            <div className="form-hint">Your request was saved successfully (ID above) but could not be analyzed yet. You can try analyzing it again later.</div>
          </div>
        )}
           
        {recalcWarning && (
          <div className="badge badge-warning" style={{ marginTop: '12px', display: 'block', width: 'fit-content' }}>
            {recalcWarning}
          </div>
        )}
      </div>

      {status === 'analyzed' && analysis && (
        <AIUnderstandingCard
          analysis={analysis}
          confirmed={confirmed}
          onConfirm={() => setConfirmed(true)}
        />
      )}
    </div>
  );
};

export default CitizenInputPage;