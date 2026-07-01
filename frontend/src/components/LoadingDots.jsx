export default function LoadingDots({ label = '처리 중', className = '' }) {
  return (
    <span role="status" aria-label={label} className={`inline-flex items-center justify-center gap-2 ${className}`}>
      <span>{label}</span>
      <span className="inline-flex w-7 items-center justify-between" aria-hidden="true">
        {[0, 1, 2].map(index => (
          <span
            key={index}
            className="h-1.5 w-1.5 rounded-full bg-current animate-bounce"
            style={{ animationDelay: `${index * 140}ms`, animationDuration: '900ms' }}
          />
        ))}
      </span>
    </span>
  );
}
