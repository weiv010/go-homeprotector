import type { CleanLevel, GameData, LocationId, Quest, QuestStatus } from './types';
import { dateKey, daysBetween } from './time';

/**
 * 퀘스트 상태
 * - done: 오늘 완료함
 * - due: 오늘 할 차례 (한 번도 안 했거나 주기가 돌아옴)
 * - upcoming: 아직 주기가 남음
 */
export function questStatus(q: Quest, now: number): QuestStatus {
  if (q.lastCompletedAt === null) return 'due';
  const d = daysBetween(q.lastCompletedAt, now);
  if (d === 0) return 'done';
  return d >= q.repeatDays ? 'due' : 'upcoming';
}

/** 다음 차례까지 남은 일수 (due/done 이면 0) */
export function daysUntilDue(q: Quest, now: number): number {
  if (q.lastCompletedAt === null) return 0;
  return Math.max(0, q.repeatDays - daysBetween(q.lastCompletedAt, now));
}

/**
 * 반복 주기에 따른 지저분함 단계.
 * 예) 2일 주기: 0~1일 깨끗함 / 2일 관리 필요 / 3일 지저분함 / 4일 이상 매우 지저분함
 * 한 번도 완료하지 않은 퀘스트는 만든 날부터 계산한다 (시작하자마자 더러워지지 않도록).
 */
export function questCleanLevel(q: Quest, now: number): CleanLevel {
  if (!q.affectsHome) return 0;
  const base = q.lastCompletedAt ?? q.createdAt;
  const d = daysBetween(base, now);
  const over = d - q.repeatDays + 1;
  if (over <= 0) return 0;
  return Math.min(3, over) as CleanLevel;
}

export function locationCleanLevel(quests: Quest[], location: LocationId, now: number): CleanLevel {
  let level: CleanLevel = 0;
  for (const q of quests) {
    if (q.location !== location) continue;
    const l = questCleanLevel(q, now);
    if (l > level) level = l;
  }
  return level;
}

export function houseCleanLevels(data: GameData, now: number): Record<LocationId, CleanLevel> {
  const out: Record<LocationId, CleanLevel> = {};
  for (const loc of data.locations) out[loc.id] = locationCleanLevel(data.quests, loc.id, now);
  return out;
}

export const CLEAN_LABELS: Record<CleanLevel, string> = {
  0: '깨끗함',
  1: '관리 필요',
  2: '지저분함',
  3: '매우 지저분함',
};

export const CLEAN_BADGES: Record<CleanLevel, string> = {
  0: '✨',
  1: '🧽',
  2: '💦',
  3: '🌀',
};

const SLOT_ORDER = { morning: 0, afternoon: 1, specific: 1, evening: 2, none: 3 } as const;

function timeSortKey(q: Quest): number {
  if (q.time.slot === 'specific' && q.time.at) {
    const [h, m] = q.time.at.split(':').map(Number);
    // 특정 시각은 해당 시간대 안에 섞이도록 시각 기준으로 배치
    const slot = h < 12 ? 0 : h < 18 ? 1 : 2;
    return slot * 10000 + h * 60 + m;
  }
  return SLOT_ORDER[q.time.slot] * 10000 + 5000;
}

/** 오늘의 퀘스트: 할 차례인 것 + 오늘 완료한 것 (시간 순, 완료한 건 아래로) */
export function todaysQuests(quests: Quest[], now: number): Quest[] {
  return quests
    .filter((q) => questStatus(q, now) !== 'upcoming')
    .sort((a, b) => {
      const da = questStatus(a, now) === 'done' ? 1 : 0;
      const db = questStatus(b, now) === 'done' ? 1 : 0;
      if (da !== db) return da - db;
      return timeSortKey(a) - timeSortKey(b);
    });
}

export function upcomingQuests(quests: Quest[], now: number): Quest[] {
  return quests
    .filter((q) => questStatus(q, now) === 'upcoming')
    .sort((a, b) => daysUntilDue(a, now) - daysUntilDue(b, now));
}

export function completionsOn(data: GameData, key: string) {
  return data.history.filter((h) => dateKey(h.at) === key);
}
