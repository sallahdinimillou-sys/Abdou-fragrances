import React, { useState, useEffect, useRef, useMemo } from 'react';

interface CatalogImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  isAboveFold?: boolean;
}

export const CatalogImage: React.FC<CatalogImageProps> = ({
  src,
  alt,
  className = '',
  isAboveFold = false
}) => {
  const hasNoImage = !src || src.trim() === '';

  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>(
    hasNoImage ? 'failed' : 'loading'
  );
  const [retryCount, setRetryCount] = useState<number>(0);
  const retryTimerRef = useRef<number | null>(null);

  // Compute actual image source, appending &r=N or ?r=N only on retries
  const effectiveSrc = useMemo(() => {
    if (hasNoImage || status === 'failed') return '';
    if (retryCount === 0) return src!;
    const separator = src!.includes('?') ? '&' : '?';
    return `${src}${separator}r=${retryCount}`;
  }, [src, retryCount, status, hasNoImage]);

  // Clean up any pending retry timers on unmount
  useEffect(() => {
    return () => {
      if (retryTimerRef.current !== null) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

  // Reset state when src changes
  useEffect(() => {
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
    }
    if (hasNoImage) {
      setStatus('failed');
      setRetryCount(0);
    } else {
      setStatus('loading');
      setRetryCount(0);
    }
  }, [src, hasNoImage]);

  // Listen for online and visibility change to retry failed images
  useEffect(() => {
    const handleRecheck = () => {
      if (status === 'failed' && !hasNoImage) {
        if (retryTimerRef.current !== null) {
          clearTimeout(retryTimerRef.current);
        }
        setRetryCount(1);
        setStatus('loading');
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleRecheck();
      }
    };

    window.addEventListener('online', handleRecheck);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('online', handleRecheck);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [status, hasNoImage]);

  const handleLoad = () => {
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
    }
    setStatus('loaded');
  };

  const handleError = () => {
    if (hasNoImage) {
      setStatus('failed');
      return;
    }

    if (retryCount < 3) {
      const nextRetry = retryCount + 1;
      const delays = [1500, 4000, 9000];
      const delayMs = delays[retryCount] || 9000;

      if (retryTimerRef.current !== null) {
        clearTimeout(retryTimerRef.current);
      }

      retryTimerRef.current = window.setTimeout(() => {
        setRetryCount(nextRetry);
        setStatus('loading');
      }, delayMs);
    } else {
      // All 3 retries exhausted: show plain neutral block with name
      setStatus('failed');
    }
  };

  return (
    <>
      {/* Neutral layout-preserving skeleton while image is loading */}
      {status === 'loading' && (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-10 bg-[#EAE4DC] flex items-center justify-center animate-pulse pointer-events-none"
        >
          <div className="w-10 h-14 rounded bg-[#D9D1C5]/50" />
        </div>
      )}

      {/* When no image exists or all retries failed: plain neutral block with name (no bottle illustration) */}
      {status === 'failed' ? (
        <div className="w-full h-full bg-[#EAE4DC] flex flex-col items-center justify-center p-4 text-center select-none">
          <div className="w-8 h-8 rounded-full border border-[#C5A880]/60 flex items-center justify-center mb-2">
            <span className="w-2 h-2 bg-[#5A1A24] rotate-45" />
          </div>
          <span className="font-display text-xs text-[#14110F] font-medium leading-snug line-clamp-3">
            {alt}
          </span>
        </div>
      ) : (
        <img
          key={effectiveSrc}
          src={effectiveSrc}
          alt={alt}
          className={`${className} ${status === 'loading' ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}`}
          loading={isAboveFold ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </>
  );
};
