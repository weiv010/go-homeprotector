import { useEffect, useState } from 'react';

/** active 인 동안 interval(ms)마다 현재 시각을 갱신한다 (타이머 표시용) */
export function useNow(active: boolean, interval = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(id);
  }, [active, interval]);
  return now;
}
