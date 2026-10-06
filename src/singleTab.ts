// ─────────────────────────────────────────────────────────────
// 창(탭) 하나만 쓰기
//
// 태그 URL 로 앱이 열리면 브라우저가 새 탭을 만든다. 이전 탭들이 계속 살아 있으면
// 서로 다른 화면이 쌓여 헷갈리므로, 가장 마지막에 열린 탭만 "활성"으로 두고
// 나머지 탭은 '이 창은 쉬는 중' 화면으로 바꾼다. (저장 데이터는 탭끼리 자동 동기화)
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';

const CHANNEL = 'go-homeprotector/tabs';
const myId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export function useSingleTab(): { inactive: boolean; takeOver(): void } {
  const [inactive, setInactive] = useState(false);
  const channel = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel(CHANNEL);
    channel.current = ch;
    ch.onmessage = (e: MessageEvent<{ type: string; id: string }>) => {
      if (e.data?.type === 'active' && e.data.id !== myId) setInactive(true);
    };
    ch.postMessage({ type: 'active', id: myId });
    return () => {
      ch.close();
      channel.current = null;
    };
  }, []);

  return {
    inactive,
    takeOver: () => {
      channel.current?.postMessage({ type: 'active', id: myId });
      setInactive(false);
    },
  };
}
