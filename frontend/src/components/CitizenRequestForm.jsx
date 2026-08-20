import { useState } from 'react';
import { createCitizenRequest, analyzeRequest, triggerAnalyticsRecalculation } from '../services/api';
import AIUnderstandingCard from './AIUnderstandingCard'; // reused as-is from Step 9 — not duplicated

const CATEGORIES = [
  'Roads & Transport', 'Healthcare', 'Education', 'Water & Sanitation',
  'Electricity', 'Internet & Digital Connectivity', 'Housing', 'Public Safety', 'Other',
];
const URGENCY_LEVELS = ['LOW', 'MEDIUM', 'HIGH'];

const initialForm = {
  state: '', district: '', category: '', description: '', urgency: '', affectedPopulationEstimate: '',
};

// Pipeline stages, in the exact order Step 13 requires:
// idle -> submitting -> analyzing -> recalculating -> done
const STAGE_LABELS = {
  submitting: 'Submitting request...',
  analyzing: 'Understanding your request with AI...',
  recalculating: 'Updating priority intelligence...',
  done: 'Request successfully processed',
};

const CitizenRequestForm = ({ onSubmitted }) => {
  const [form, setForm] = useState(initialForm);
  const [stage, setStage] = useState('idle');

  // Original citizen-selected values, known immediately after storage —
  // shown right away regardless of whether AI analysis later succeeds.
  const [submittedSummary, setSubmittedSummary] = useState(null);

  const [analysis, setAnalysis] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  const [submissionError, setSubmissionError] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [recalcError, setRecalcError] = useState(null);

  const updateField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const validate = () => {
    if (!form.state.trim()) return 'State is required.';
    if (!form.district.trim()) return 'District is required.';
    if (!form.category) return 'Sector is required.';
    if (!form.description.trim()) return 'Request description is required.';
    if (!form.urgency) return 'Urgency is required.';
    if (form.affectedPopulationEstimate && Number(form.affectedPopulationEstimate) < 0) {
      return 'Affected population estimate cannot be negative.';
    }
    return null;
  };

  const resetPipelineState = () => {
    setSubmittedSummary(null);
    setAnalysis(null);
    setConfirmed(false);
    setSubmissionError(null);
    setAnalysisError(null);
    setRecalcError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setSubmissionError(validationError);
      return;
    }

    resetPipelineState();
    setStage('submitting');

    // --- Stage 1: store in MongoDB ---
    let requestId;
    try {
      const response = await createCitizenRequest({
        state: form.state.trim(),
        district: form.district.trim(),
        category: form.category,
        description: form.description.trim(),
        urgency: form.urgency,
        affectedPopulationEstimate: form.affectedPopulationEstimate ? Number(form.affectedPopulationEstimate) : undefined,
      });
      requestId = response.data.requestId;
      setSubmittedSummary({
        requestId,
        category: form.category,
        urgency: form.urgency,
        district: form.district.trim(),
        state: form.state.trim(),
      });
      setForm(initialForm); // storage succeeded — safe to clear the form now
    } catch (err) {
      setSubmissionError(err?.response?.data?.message || 'Unable to submit your request. Please try again.');
      setStage('done');
      return; // nothing was stored — pipeline stops here entirely
    }

    // --- Stage 2: AI understanding (best-effort; failure does not delete the stored request) ---
    setStage('analyzing');
    try {
      const analyzeResponse = await analyzeRequest(requestId);
      setAnalysis(analyzeResponse.data.analysis);
    } catch (err) {
      setAnalysisError('Your request was saved, but AI understanding could not be completed.');
      // Deliberately continue to recalculation below — the request already
      // has a valid citizen-selected category/urgency/location even without
      // AI, so priority analysis can still run on it.
    }

    // --- Stage 3: deterministic priority recalculation (existing endpoint, reused) ---
    setStage('recalculating');
    try {
      await triggerAnalyticsRecalculation();
    } catch (err) {
      setRecalcError('Your request was saved, but priority analysis is temporarily unavailable.');
    }

    setStage('done');
    onSubmitted?.(); // refresh Dashboard KPIs/map/rankings regardless of partial failures — the request count itself always changed
  };

  const isBusy = stage === 'submitting' || stage === 'analyzing' || stage === 'recalculating';

  return (
    <div className="citizen-request-form">
      <form onSubmit={handleSubmit}>
        <div className="form-grid-2">
          <div className="form-field">
            <label className="form-label" htmlFor="crf-state">State *</label>
            <input id="crf-state" type="text" value={form.state} onChange={updateField('state')} placeholder="e.g. Jharkhand" disabled={isBusy} />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="crf-district">District *</label>
            <input id="crf-district" type="text" value={form.district} onChange={updateField('district')} placeholder="e.g. Ranchi" disabled={isBusy} />
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-field">
            <label className="form-label" htmlFor="crf-category">Sector *</label>
            <select id="crf-category" value={form.category} onChange={updateField('category')} disabled={isBusy}>
              <option value="">Select a sector</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="crf-urgency">Urgency *</label>
            <select id="crf-urgency" value={form.urgency} onChange={updateField('urgency')} disabled={isBusy}>
              <option value="">Select urgency</option>
              {URGENCY_LEVELS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="crf-description">Request Description *</label>
          <textarea id="crf-description" value={form.description} onChange={updateField('description')} placeholder="Describe the infrastructure issue..." disabled={isBusy} />
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="crf-population">Affected Population (estimate, optional)</label>
          <input id="crf-population" type="number" min="0" value={form.affectedPopulationEstimate} onChange={updateField('affectedPopulationEstimate')} placeholder="e.g. 5000" disabled={isBusy} />
          <div className="form-hint">Self-reported estimate for reference only — does not affect the priority score.</div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={isBusy}>
          {isBusy ? STAGE_LABELS[stage] : 'Submit Request'}
        </button>

        {isBusy && (
          <div className="form-hint" style={{ marginTop: '10px' }}>{STAGE_LABELS[stage]}</div>
        )}
      </form>

      {/* --- Submission-level failure: nothing was stored --- */}
      {submissionError && (
        <div className="badge badge-danger" style={{ marginTop: '16px', display: 'block', width: 'fit-content' }}>
          {submissionError}
        </div>
      )}

      {/* --- Request stored: always show this once storage succeeds --- */}
          {submittedSummary && (
        <div className="surface-card section-block" style={{ marginTop: '16px' }}>
          <h3>Request Submitted</h3>
          <p className="form-hint">Your selections below are authoritative and are never overwritten by AI analysis.</p>
          <div className="detail-grid" style={{ marginBottom: '8px' }}>
            <div><div className="detail-metric-label">Request ID</div><div>{submittedSummary.requestId}</div></div>
            <div><div className="detail-metric-label">Selected Sector</div><div>{submittedSummary.category}</div></div>
            <div><div className="detail-metric-label">Selected Urgency</div><div>{submittedSummary.urgency}</div></div>
            <div><div className="detail-metric-label">Location</div><div>{submittedSummary.district}, {submittedSummary.state}</div></div>
          </div>

          {analysisError && (
            <div className="badge badge-warning" style={{ display: 'block', width: 'fit-content', margin: '8px 0' }}>
              {analysisError}
            </div>
          )}

          {analysis && (
            <>
              {(analysis.category !== submittedSummary.category || analysis.urgency !== submittedSummary.urgency) && (
                <div className="badge badge-neutral" style={{ display: 'block', width: 'fit-content', margin: '8px 0' }}>
                  AI's interpretation differs from your selection — your original selection was kept.
                </div>
              )}
              <p className="form-hint">AI Interpretation (reference only — does not change your stored selection):</p>
              <AIUnderstandingCard analysis={analysis} confirmed={confirmed} onConfirm={() => setConfirmed(true)} />
            </>
          )}

          {recalcError && (
            <div className="badge badge-warning" style={{ display: 'block', width: 'fit-content', marginTop: '12px' }}>
              {recalcError}
            </div>
          )}

          {stage === 'done' && !analysisError && !recalcError && (
            <div className="badge badge-success" style={{ marginTop: '12px' }}>Request successfully processed</div>
          )}
        </div>
      )}
    </div>
  );
};

export default CitizenRequestForm;