import type { QuestDraft } from '../core/types';

// 처음 실행했을 때 들어있는 퀘스트. 앱 안에서 자유롭게 추가/수정/삭제할 수 있다.
export const DEFAULT_QUESTS: (QuestDraft & { id: string })[] = [
  { id: 'dishwashing', title: '설거지', icon: '🍽️', time: { slot: 'evening' }, location: 'kitchen', repeatDays: 2, xp: 10, affectsHome: true },
  { id: 'laundry', title: '빨래', icon: '🧺', time: { slot: 'morning' }, location: 'laundry', repeatDays: 3, xp: 15, affectsHome: true },
  { id: 'cat_care', title: '고양이 케어', icon: '🐈', time: { slot: 'none' }, location: 'cat', repeatDays: 1, xp: 10, affectsHome: true },
  { id: 'make_bed', title: '이불 정리', icon: '🛏️', time: { slot: 'morning' }, location: 'bedroom', repeatDays: 1, xp: 5, affectsHome: true },
  { id: 'yoga', title: '요가', icon: '🧘', time: { slot: 'morning' }, location: 'bedroom', repeatDays: 1, xp: 10, affectsHome: false },
  { id: 'work', title: '작업', icon: '💻', time: { slot: 'afternoon' }, location: 'desk', repeatDays: 1, xp: 10, affectsHome: false },
  { id: 'desk_tidy', title: '책상 정리', icon: '📚', time: { slot: 'evening' }, location: 'desk', repeatDays: 7, xp: 15, affectsHome: true },
  { id: 'closet_tidy', title: '옷 정리', icon: '👕', time: { slot: 'none' }, location: 'closet', repeatDays: 7, xp: 15, affectsHome: true },
  { id: 'living_clean', title: '바닥 청소기', icon: '🧹', time: { slot: 'afternoon' }, location: 'hall', repeatDays: 3, xp: 20, affectsHome: true },
  { id: 'bathroom_clean', title: '화장실 청소', icon: '🧽', time: { slot: 'none' }, location: 'bathroom', repeatDays: 7, xp: 20, affectsHome: true },
];
