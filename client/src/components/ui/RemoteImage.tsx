import { useEffect, useState } from "react";

/**
 * Plain <img src> can't send custom headers, but our API origin may be an
 * ngrok tunnel that shows an interstitial HTML page to any request lacking
 * the ngrok-skip-browser-warning header. This fetches the bytes manually
 * (with that header) and hands the browser an object URL instead.
 */
export function RemoteImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let currentUrl: string | null = null;

    fetch(src, { headers: { "ngrok-skip-browser-warning": "true" } })
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error("image fetch failed"))))
      .then((blob) => {
        if (cancelled) return;
        currentUrl = URL.createObjectURL(blob);
        setObjectUrl(currentUrl);
      })
      .catch(() => {
        if (!cancelled) setObjectUrl(null);
      });

    return () => {
      cancelled = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [src]);

  if (!objectUrl) return null;
  return <img src={objectUrl} alt={alt} className={className} />;
}
