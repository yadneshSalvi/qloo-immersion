import Link from 'next/link';
export default function NotFound() {
  return (
    <section className="empty-state container">
      <span className="eyebrow">A different direction</span>
      <h1>This page isn’t here.</h1>
      <p>There are still plenty of stories waiting in the collection.</p>
      <Link className="button button-primary" href="/discover">
        Find a story
      </Link>
    </section>
  );
}
