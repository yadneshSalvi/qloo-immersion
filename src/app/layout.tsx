import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { connection } from 'next/server';
import { Nav } from '@/components/nav';
import { PendingBanner } from '@/components/pending-banner';
import { currentLearner } from '@/server/auth';
import { getReviews } from '@/server/store';
import './globals.css';
const editorial = localFont({
  src: '../../node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2',
  display: 'swap',
  variable: '--font-editorial',
  weight: '100 900',
});
const sans = localFont({
  src: '../../node_modules/@fontsource-variable/source-sans-3/files/source-sans-3-latin-wght-normal.woff2',
  display: 'swap',
  variable: '--font-sans',
  weight: '200 900',
});
export const metadata: Metadata = {
  title: { default: 'IMMERSION — Follow your curiosity into Spanish', template: '%s · IMMERSION' },
  description:
    'A cultural reading and listening studio for adult Spanish learners. Explore original sample stories, practice in context, and build a personal vocabulary notebook.',
};
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Catalog availability, source rights and guest state are request-time database facts.
  await connection();
  let signedIn = false;
  let due = 0;
  try {
    const learner = await currentLearner();
    signedIn = !!learner;
    if (learner) due = (await getReviews(learner.id)).filter((r) => r.due).length;
  } catch {
    /* The page-level boundary provides the recovery surface. */
  }
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${editorial.variable} ${sans.variable}`}
    >
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Nav signedIn={signedIn} due={due} />
        <PendingBanner />
        <main id="main">{children}</main>
        <footer className="site-footer">
          <span className="footer-brand">A little closer to the world.</span>
          <span>Original sample collection · Educator review pending</span>
          <a href="/evidence">About this edition ↗</a>
        </footer>
      </body>
    </html>
  );
}
