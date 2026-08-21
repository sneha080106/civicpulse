import { useCallback, useRef, useState } from 'react';

// Maps CivicPulse's existing internal language codes to BCP-47 tags the
// Web Speech API requires. Falls back to English if an unmapped code is
// passed — never throws.
const LANGUAGE_TAGS = { en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN' };

// status: 'idle' | 'listening' | 'processing' | 'error' | 'unsupported'
const useSpeechRecognition = () => {
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const recognitionRef = useRef(null);

  const isSupported = typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  const startListening = useCallback((languageCode, onResult) => {
    if (!isSupported) {
      setStatus('unsupported');
      setErrorMessage('Voice input is not supported in this browser. Try Chrome or Edge, or type your request instead.');
      return;
    }

    const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionImpl();
    recognition.lang = LANGUAGE_TAGS[languageCode] || LANGUAGE_TAGS.en;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setStatus('listening');
      setErrorMessage('');
    };

    recognition.onresult = (event) => {
      setStatus('processing');
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      onResult(transcript);
      setStatus('idle');
    };

    recognition.onerror = (event) => {
      let message = 'Voice recognition failed. Please try again or type your request.';
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        message = 'Microphone access was denied. Please allow microphone access, or type your request instead.';
      } else if (event.error === 'no-speech') {
        message = 'No speech was detected. Please try again.';
      } else if (event.error === 'network') {
        message = 'A network error interrupted voice recognition. Please try again or type your request.';
      }
      setErrorMessage(message);
      setStatus('error');
    };

    recognition.onend = () => {
      setStatus((prev) => (prev === 'listening' ? 'idle' : prev)); // stopped without a result (e.g. silence)
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return { status, errorMessage, isSupported: Boolean(isSupported), startListening, stopListening };
};

export default useSpeechRecognition;