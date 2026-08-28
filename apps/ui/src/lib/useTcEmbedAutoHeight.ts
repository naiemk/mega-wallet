import { useEffect, useState, type RefObject } from "react";

const DEFAULT_HEIGHT = 720;

/**
 * Measure same-origin TC embed iframe content height to avoid nested scroll regions.
 */
export function useTcEmbedAutoHeight(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  enabled: boolean,
) {
  const [height, setHeight] = useState(DEFAULT_HEIGHT);

  useEffect(() => {
    if (!enabled) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    let observer: ResizeObserver | undefined;
    let cancelled = false;

    function measure() {
      if (cancelled) return;
      try {
        const doc = iframe?.contentDocument;
        if (!doc) return;
        const next = Math.max(
          doc.documentElement.scrollHeight,
          doc.body?.scrollHeight ?? 0,
          DEFAULT_HEIGHT,
        );
        setHeight(next);
      } catch {
        /* cross-origin fallback keeps default min height */
      }
    }

    function onLoad() {
      measure();
      try {
        const doc = iframe?.contentDocument;
        if (!doc || typeof ResizeObserver === "undefined") return;
        observer?.disconnect();
        observer = new ResizeObserver(() => measure());
        observer.observe(doc.documentElement);
        if (doc.body) observer.observe(doc.body);
      } catch {
        /* ignore */
      }
    }

    iframe.addEventListener("load", onLoad);
    if (iframe.contentDocument?.readyState === "complete") onLoad();

    return () => {
      cancelled = true;
      iframe.removeEventListener("load", onLoad);
      observer?.disconnect();
    };
  }, [enabled, iframeRef]);

  return height;
}
