const KpiCard = ({ label, value, isLoading, isPlaceholder }) => (
  <div className="surface-card kpi-card">
    <div className="kpi-label">{label}</div>
    <div className={`kpi-value ${isPlaceholder ? 'is-placeholder' : ''}`}>
      {isLoading ? '—' : value ?? 'Not available'}
    </div>
  </div>
);

export default KpiCard;