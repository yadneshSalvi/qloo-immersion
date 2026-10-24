export default function Loading() {
  return (
    <div className="container loading-state" role="status">
      <span className="eyebrow">Opening your learning studio</span>
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-hero" />
      <p>Bringing your saved place back into view…</p>
    </div>
  );
}
