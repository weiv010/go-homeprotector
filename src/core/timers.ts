import type { QuestTimer } from './types';

/** 남은 시간(ms). 0 이면 끝난 타이머 */
export function remainingMs(t: QuestTimer, now: number): number {
  return Math.max(0, t.startedAt + t.durationMs - now);
}

export function isFinished(t: QuestTimer, now: number): boolean {
  return remainingMs(t, now) === 0;
}

/** 0~1 진행률 */
export function timerProgress(t: QuestTimer, now: number): number {
  return t.durationMs ? Math.min(1, (now - t.startedAt) / t.durationMs) : 1;
}

/** 1:05:09 / 05:09 */
export function formatRemaining(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** 90 → "1시간 30분" */
export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return [h ? `${h}시간` : '', m ? `${m}분` : ''].filter(Boolean).join(' ') || '0분';
}

/** 공간별로 가장 먼저 끝나는 타이머 (끝난 것이 있으면 그것) */
export function timersByLocation(timers: QuestTimer[], now: number): Record<string, { timer: QuestTimer; count: number }> {
  const out: Record<string, { timer: QuestTimer; count: number }> = {};
  for (const t of timers) {
    const cur = out[t.location];
    if (!cur) out[t.location] = { timer: t, count: 1 };
    else {
      cur.count++;
      if (remainingMs(t, now) < remainingMs(cur.timer, now)) cur.timer = t;
    }
  }
  return out;
}
