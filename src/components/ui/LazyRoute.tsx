import { Suspense, type ReactNode } from 'react';

/**
 * Suspense boundary for a code-split route element.
 *
 * The fallback copy is deliberately identical to `GeneratorRoute`'s: the
 * prerender crawl (`scripts/prerender.ts`) waits for that exact text to
 * disappear before snapshotting, so a different string here would let it
 * capture a page that hadn't finished loading.
 */
export function LazyRoute({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div style={{ padding: 60, textAlign: 'center', color: 'var(--gfw-text-mutest)' }}>Loading…</div>}>
      {children}
    </Suspense>
  );
}
