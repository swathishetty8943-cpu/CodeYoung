/**
 * A skeleton placeholder shaped like a row of BookingList, so the
 * dashboards never show a blank "Loading…" screen while data is
 * in flight - just an outline of what's about to appear.
 */
export default function LoadingSkeleton({ rows = 3 }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div className="skeleton-row" key={i}>
          <div className="skeleton skeleton-avatar" />
          <div className="skeleton-lines">
            <div className="skeleton skeleton-line" style={{ width: '40%' }} />
            <div className="skeleton skeleton-line" style={{ width: '65%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
