import type { ItemSlot, TimeSlot } from '../core/types';

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  none: '시간 없음',
  morning: '오전',
  afternoon: '오후',
  evening: '저녁',
  specific: '특정 시간',
};

export const TIME_SLOT_ORDER: TimeSlot[] = ['none', 'morning', 'afternoon', 'evening', 'specific'];

export const REPEAT_PRESETS: { days: number; label: string }[] = [
  { days: 1, label: '매일' },
  { days: 2, label: '2일마다' },
  { days: 3, label: '3일마다' },
  { days: 7, label: '일주일마다' },
];

export function repeatLabel(days: number): string {
  return REPEAT_PRESETS.find((p) => p.days === days)?.label ?? `${days}일마다`;
}

export const QUEST_ICONS = [
  '🍽️', '🧺', '🧹', '🧽', '🗑️', '🛏️', '🐈', '🪴', '🧘', '💻', '📚', '🚿', '🧴', '👕', '🍳', '💧', '📦', '✨',
];

export const XP_PRESETS = [5, 10, 15, 20, 30];

export const SLOT_LABELS: Record<ItemSlot, string> = {
  hat: '모자',
  hair: '헤어',
  outfit: '옷',
  bag: '가방',
  extra: '기타',
};

export const DIARY_POINTS = 10;
