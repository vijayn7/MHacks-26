import React, { useEffect, useRef } from 'react';
export function SampleStore({
  amount,
  category,
  onPurchase,
  message,
}: {
  amount: number;
  category: string;
  onPurchase: (amount: number, category: string) => void;
  message: string;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== frame.current?.contentWindow ||
        event.data?.type !== 'snuff:sample-purchase'
      )
        return;
      if (
        typeof event.data.amount === 'number' &&
        Number.isFinite(event.data.amount) &&
        event.data.amount >= 0 &&
        event.data.amount <= 1000000 &&
        typeof event.data.category === 'string'
      )
        onPurchase(event.data.amount, event.data.category);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [onPurchase]);
  useEffect(() => {
    frame.current?.contentWindow?.postMessage(
      { type: 'snuff:sample-result', message },
      window.location.origin,
    );
  }, [message]);
  return (
    <iframe
      ref={frame}
      title="sample shopping site"
      src={`/sample-store.html?amount=${amount}&category=${encodeURIComponent(category)}`}
      style={{ border: 0, width: '100%', height: '100%', flex: 1, background: '#fff' }}
    />
  );
}
