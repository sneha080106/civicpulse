import useSpeechRecognition from '../hooks/useSpeechRecognition';

// onTranscript: (text) => void — caller decides what to do with the result
// (here: append/set it into the existing textarea state, never auto-submit).
const VoiceInputButton = ({ languageCode, onTranscript, disabled }) => {
  const { status, errorMessage, isSupported, startListening, stopListening } = useSpeechRecognition();

  if (!isSupported) {
    return (
      <div className="form-hint">Voice input is not supported in this browser. You can still type your request.</div>
    );
  }

  const handleClick = () => {
    if (status === 'listening') {
      stopListening();
      return;
    }
    startListening(languageCode, onTranscript);
  };

  const labelByStatus = {
    idle: '🎤 Speak your request',
    listening: '🔴 Listening... (click to stop)',
    processing: 'Processing...',
    error: '🎤 Try again',
  };

  return (
    <div>
      <button
        type="button"
        className={`btn btn-secondary voice-btn voice-btn-${status}`}
        onClick={handleClick}
        disabled={disabled || status === 'processing'}
      >
        {labelByStatus[status] || labelByStatus.idle}
      </button>
      {status === 'error' && errorMessage && (
        <div className="form-hint" style={{ color: 'var(--color-danger)', marginTop: 'var(--space-1)' }}>
          {errorMessage}
        </div>
      )}
    </div>
  );
};

export default VoiceInputButton;