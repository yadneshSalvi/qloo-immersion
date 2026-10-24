'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, BookOpen, Route, Settings2, ArrowUpRight } from 'lucide-react';
export function Nav({ signedIn, due = 0 }: { signedIn: boolean; due?: number }) {
  const pathname = usePathname();
  return (
    <header className="site-header">
      <Link className="wordmark" href="/">
        <span className="brand-symbol" aria-hidden="true">
          i
        </span>
        immersion<span className="brand-period">.</span>
      </Link>
      <nav aria-label="Main navigation">
        {[
          { href: '/discover', label: 'Discover', Icon: Compass },
          { href: '/review', label: 'My words', Icon: BookOpen },
          { href: '/path', label: 'My path', Icon: Route },
        ].map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname.startsWith(href) ? 'page' : undefined}
          >
            <Icon size={17} strokeWidth={1.5} />
            <span>{label}</span>
            {href === '/review' && due > 0 && <span className="nav-count">{due}</span>}
          </Link>
        ))}
      </nav>
      <div className="header-actions">
        <Link className="edition" href="/evidence">
          <span className="status-dot" />
          Sample edition
        </Link>
        {signedIn ? (
          <Link href="/settings" className="icon-link" aria-label="Your preferences">
            <Settings2 size={19} />
          </Link>
        ) : (
          <Link href="/start" className="text-link header-start">
            Find your Spanish <ArrowUpRight size={16} />
          </Link>
        )}
      </div>
    </header>
  );
}
