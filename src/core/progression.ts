import { TITLES, type TitleDef } from '../data/titles';

export interface LevelInfo {
  level: number;
  title: string;
  /** 현재 레벨 안에서 모은 XP */
  xpInLevel: number;
  /** 다음 레벨까지 필요한 XP (최고 레벨이면 null) */
  xpForNext: number | null;
  /** 0~1 */
  progress: number;
  isMax: boolean;
}

export function levelFor(xp: number, titles: TitleDef[] = TITLES): LevelInfo {
  let idx = 0;
  for (let i = 0; i < titles.length; i++) {
    if (xp >= titles[i].minXp) idx = i;
  }
  const cur = titles[idx];
  const next = titles[idx + 1];
  if (!next) {
    return { level: cur.level, title: cur.title, xpInLevel: xp - cur.minXp, xpForNext: null, progress: 1, isMax: true };
  }
  const span = next.minXp - cur.minXp;
  const inLevel = xp - cur.minXp;
  return { level: cur.level, title: cur.title, xpInLevel: inLevel, xpForNext: span, progress: inLevel / span, isMax: false };
}
