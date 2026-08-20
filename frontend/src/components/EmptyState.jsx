const EmptyState = ({ title = 'No data available', description }) => (
  <div className="state-block">
    <div className="state-block-title">{title}</div>
    {description && <div>{description}</div>}
  </div>
);

export default EmptyState;