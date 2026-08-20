const LANGUAGE_LABELS = { en: 'English', hi: 'Hindi', bn: 'Bengali' };

// Deliberately never overstates AI certainty — low confidence and missing
// location are surfaced explicitly rather than hidden or smoothed over.
const AIUnderstandingCard = ({ analysis, onConfirm, confirmed }) => {
  if (!analysis) return null;

  const languageLabel = LANGUAGE_LABELS[analysis.language] || analysis.language;
  const locationLabel = analysis.location?.district
    ? [analysis.location.district, analysis.location.state].filter(Boolean).join(', ')
    : null;

  const isLowConfidence = typeof analysis.confidence === 'number' && analysis.confidence < 0.6;
  const confidencePercent = typeof analysis.confidence === 'number'
    ? Math.round(analysis.confidence * 100)
    : null;

  return (
    <div className="surface-card section-block" style={{ marginTop: '16px' }}>
      <h3>AI Understanding</h3>

      <div className="detail-grid" style={{ marginBottom: '16px' }}>
        <div>
          <div className="detail-metric-label">Language</div>
          <div>{languageLabel}</div>
        </div>
        <div>
          <div className="detail-metric-label">Category</div>
          <div>{analysis.category}</div>
        </div>
        <div>
          <div className="detail-metric-label">Urgency</div>
          <div>{analysis.urgency}</div>
        </div>
        <div>
          <div className="detail-metric-label">Confidence</div>
          <div>{confidencePercent !== null ? `${confidencePercent}%` : 'Not available'}</div>
        </div>
      </div>

      {analysis.problem && (
        <div className="form-field">
          <div className="detail-metric-label">Problem</div>
          <p>{analysis.problem}</p>
        </div>
      )}

      <div className="form-field">
        <div className="detail-metric-label">Location</div>
        <p>{locationLabel || 'Location could not be determined reliably.'}</p>
      </div>

      {analysis.translatedText && (
        <div className="form-field">
          <div className="detail-metric-label">Translation</div>
          <p>{analysis.translatedText}</p>
        </div>
      )}

      {isLowConfidence && (
        <div className="badge badge-warning" style={{ display: 'block', width: 'fit-content', marginBottom: '12px' }}>
          Some information may need verification.
        </div>
      )}

      {!analysis.location?.district && (
        <div className="badge badge-warning" style={{ display: 'block', width: 'fit-content', marginBottom: '12px' }}>
          Location could not be determined reliably.
        </div>
      )}

      {confirmed ? (
        <div className="badge badge-success">Understanding confirmed</div>
      ) : (
        <button type="button" className="btn btn-primary" onClick={onConfirm}>
          Confirm Understanding
        </button>
      )}
    </div>
  );
};

export default AIUnderstandingCard;