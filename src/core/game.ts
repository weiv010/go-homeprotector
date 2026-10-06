import type { GameData, GameEvent, HouseLocation, ItemSlot, Quest, QuestDraft } from './types';
import { DEFAULT_QUESTS } from '../data/defaultQuests';
import { HOUSE_MAP } from '../data/houseMap';
import { DIARY_POINTS } from '../data/options';
import { findItem } from '../data/shopItems';
import { levelFor } from './progression';
import { locationCleanLevel, questStatus } from './quests';
import { dateKey } from './time';

export const DATA_VERSION = 2;

export function createInitialData(now: number): GameData {
  return {
    version: DATA_VERSION,
    locations: structuredClone(HOUSE_MAP.locations),
    doors: structuredClone(HOUSE_MAP.doors),
    mapSize: { cols: HOUSE_MAP.cols, rows: HOUSE_MAP.rows },
    quests: DEFAULT_QUESTS.map((q) => ({ ...q, time: { ...q.time }, createdAt: now, lastCompletedAt: null })),
    xp: 0,
    points: 0,
    ownedItems: [],
    equipped: {},
    history: [],
    diary: {},
    todayPlan: { date: '', questIds: [] },
    debugDayOffset: 0,
  };
}

export type GameAction =
  | { type: 'addQuest'; draft: QuestDraft }
  | { type: 'updateQuest'; id: string; draft: QuestDraft }
  | { type: 'deleteQuest'; id: string }
  | { type: 'completeQuest'; id: string }
  | { type: 'planToday'; id: string }
  | { type: 'unplanToday'; id: string }
  | { type: 'saveDiary'; text: string }
  | { type: 'buyItem'; itemId: string }
  | { type: 'equip'; itemId: string }
  | { type: 'unequip'; slot: ItemSlot }
  | { type: 'updateLocation'; id: string; patch: Partial<Pick<HouseLocation, 'name' | 'nfcId'>> }
  | { type: 'debugShiftDays'; days: number }
  | { type: 'debugAddPoints'; points: number }
  | { type: 'reset' };

export interface ActionResult {
  data: GameData;
  events: GameEvent[];
}

/** 오늘 계획에 들어 있는 퀘스트 ID (날짜가 지난 계획은 비어 있는 것으로 본다) */
export function plannedIds(data: GameData, now: number): string[] {
  return data.todayPlan.date === dateKey(now) ? data.todayPlan.questIds : [];
}

export function newId(prefix = 'q'): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function sanitizeDraft(draft: QuestDraft): QuestDraft {
  return {
    ...draft,
    title: draft.title.trim() || '이름 없는 퀘스트',
    repeatDays: Math.max(1, Math.round(draft.repeatDays) || 1),
    xp: Math.max(0, Math.round(draft.xp) || 0),
  };
}

/**
 * 모든 게임 규칙은 이 함수 하나로 처리한다 (순수 함수).
 * now 는 시간 여행(debugDayOffset)이 반영된 "게임 속 현재 시각"이다.
 */
export function applyAction(data: GameData, action: GameAction, now: number): ActionResult {
  switch (action.type) {
    case 'addQuest': {
      const quest: Quest = { ...sanitizeDraft(action.draft), id: newId(), createdAt: now, lastCompletedAt: null };
      return { data: { ...data, quests: [...data.quests, quest] }, events: [] };
    }
    case 'updateQuest': {
      const quests = data.quests.map((q) => (q.id === action.id ? { ...q, ...sanitizeDraft(action.draft) } : q));
      return { data: { ...data, quests }, events: [] };
    }
    case 'deleteQuest':
      return {
        data: {
          ...data,
          quests: data.quests.filter((q) => q.id !== action.id),
          todayPlan: { ...data.todayPlan, questIds: data.todayPlan.questIds.filter((id) => id !== action.id) },
        },
        events: [],
      };

    case 'planToday': {
      const ids = plannedIds(data, now);
      if (ids.includes(action.id) || !data.quests.some((q) => q.id === action.id)) return { data, events: [] };
      return { data: { ...data, todayPlan: { date: dateKey(now), questIds: [...ids, action.id] } }, events: [] };
    }
    case 'unplanToday':
      return {
        data: { ...data, todayPlan: { date: dateKey(now), questIds: plannedIds(data, now).filter((id) => id !== action.id) } },
        events: [],
      };

    case 'completeQuest': {
      const quest = data.quests.find((q) => q.id === action.id);
      if (!quest || questStatus(quest, now) === 'done') return { data, events: [] };
      const before = levelFor(data.xp);
      const quests = data.quests.map((q) => (q.id === quest.id ? { ...q, lastCompletedAt: now } : q));
      const xp = data.xp + quest.xp;
      const after = levelFor(xp);
      const loc = data.locations.find((l) => l.id === quest.location);
      const events: GameEvent[] = [
        {
          type: 'questComplete',
          questTitle: quest.title,
          icon: quest.icon,
          xp: quest.xp,
          homeClean: quest.affectsHome && locationCleanLevel(quests, quest.location, now) === 0,
          locationName: loc?.name ?? '',
        },
      ];
      if (after.level > before.level) events.push({ type: 'levelUp', level: after.level, title: after.title });
      const history = [
        ...data.history,
        { questId: quest.id, title: quest.title, icon: quest.icon, location: quest.location, xp: quest.xp, at: now },
      ];
      return { data: { ...data, quests, xp, history }, events };
    }

    case 'saveDiary': {
      const key = dateKey(now);
      const text = action.text.trim();
      const prev = data.diary[key];
      if (!text && !prev) return { data, events: [] };
      // 일기 포인트는 하루 한 번만 지급
      const award = !prev?.pointsAwarded && text ? DIARY_POINTS : 0;
      const entry = { date: key, text, updatedAt: now, pointsAwarded: (prev?.pointsAwarded ?? 0) + award };
      return {
        data: { ...data, points: data.points + award, diary: { ...data.diary, [key]: entry } },
        events: award ? [{ type: 'diarySaved', points: award }] : [],
      };
    }

    case 'buyItem': {
      const item = findItem(action.itemId);
      if (!item || data.ownedItems.includes(item.id) || data.points < item.price) return { data, events: [] };
      return {
        data: {
          ...data,
          points: data.points - item.price,
          ownedItems: [...data.ownedItems, item.id],
          equipped: { ...data.equipped, [item.slot]: item.id },
        },
        events: [{ type: 'newItem', itemId: item.id }],
      };
    }
    case 'equip': {
      const item = findItem(action.itemId);
      if (!item || !data.ownedItems.includes(item.id)) return { data, events: [] };
      return { data: { ...data, equipped: { ...data.equipped, [item.slot]: item.id } }, events: [] };
    }
    case 'unequip': {
      const equipped = { ...data.equipped };
      delete equipped[action.slot];
      return { data: { ...data, equipped }, events: [] };
    }
    case 'updateLocation': {
      const locations = data.locations.map((l) => (l.id === action.id ? { ...l, ...action.patch } : l));
      return { data: { ...data, locations }, events: [] };
    }
    case 'debugShiftDays':
      return { data: { ...data, debugDayOffset: data.debugDayOffset + action.days }, events: [] };
    case 'debugAddPoints':
      return { data: { ...data, points: Math.max(0, data.points + action.points) }, events: [] };
    case 'reset':
      return { data: createInitialData(Date.now()), events: [] };
  }
}
