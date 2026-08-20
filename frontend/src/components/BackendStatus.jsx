import { useEffect, useState } from 'react';
import { checkBackendHealth } from '../services/api';

const BackendStatus = () => {
  const [status, setStatus] = useState('checking'); // 'checking' | 'connected' | 'offline'

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        await checkBackendHealth();
        if (!cancelled) setStatus('connected');
      } catch (err) {
        if (!cancelled) setStatus('offline');
      }
    };

    check();
    const interval = setInterval(check, 30000); // re-check every 30s

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const label = status === 'connected' ? 'Backend: Connected' : status === 'offline' ? 'Backend: Offline' : 'Backend: Checking...';

  return (
    <div className="backend-status">
      <span className={`backend-status-dot ${status}`} />
      <span>{label}</span>
    </div>
  );
};

export default BackendStatus;