export default function LoadingDots({ label = '처리 중', className = '' }) {
  return (
    <span role="status" aria-label={label} className={`inline-flex items-center justify-center gap-2 ${className}`}>
      <span>{label}</span>
      <span className="inline-flex w-7 items-center justify-between" aria-hidden="true">
        {[0, 1, 2].map(index => (
          <span
            key={index}
            className="loading-dot h-2 w-2 rounded-full bg-current"
            style={{ animationDelay: `${index * 140}ms` }}
          />
        ))}
      </span>
    </span>
  );
}
