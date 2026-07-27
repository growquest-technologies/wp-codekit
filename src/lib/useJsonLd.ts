import { useEffect } from 'react';

/** Injects (and cleans up) a `<script type="application/ld+json">` tag identified by `id`, for route-level structured data that can't be static (its content depends on the current page). */
export function useJsonLd(id: string, data: object | null) {
  useEffect(() => {
    if (!data) return;

    let script = document.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);

    return () => {
      document.getElementById(id)?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, JSON.stringify(data)]);
}
