import React, { useState, useEffect, useRef, useMemo } from 'react';
import { NEUTRAL_PLACEHOLDER_IMAGE } from '../types';

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
  const isPlaceholderOnly = !src || src === NEUTRAL_PLACEHOLDER_IMAGE;

  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>(
    isPlaceholderOnly ? 'failed' : 'loading'
  );
  const [retryCount, setRetryCount] = useState<number>(0);
  const retryTimerRef = useRef<number | null>(null);

  // Compute actual image source, appending &r=N or ?r=N only on retries
  const effectiveSrc = useMemo(() => {
    if (isPlaceholderOnly) return NEUTRAL_PLACEHOLDER_IMAGE;
    if (status === 'failed') return NEUTRAL_PLACEHOLDER_IMAGE;
    if (retryCount === 0) return src!;
    const separator = src!.includes('?') ? '&' : '?';
    return `${src}${separator}r=${retryCount}`;
  }, [src, retryCount, status, isPlaceholderOnly]);

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
    if (isPlaceholderOnly) {
      setStatus('failed');
      setRetryCount(0);
    } else {
      setStatus('loading');
      setRetryCount(0);
    }
  }, [src, isPlaceholderOnly]);

  // Listen for online and visibility change to retry failed images
  useEffect(() => {
    const handleRecheck = () => {
      if (status === 'failed' && !isPlaceholderOnly) {
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
  }, [status, isPlaceholderOnly]);

  const handleLoad = () => {
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
    }
    setStatus('loaded');
  };

  const handleError = () => {
    if (isPlaceholderOnly) {
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
      // All 3 retries exhausted: show grey placeholder
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
    </>
  );
};
