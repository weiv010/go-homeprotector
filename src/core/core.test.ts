import { describe, expect, it } from 'vitest';
import { applyAction, createInitialData } from './game';
import { levelFor } from './progression';
import { questCleanLevel, questStatus, todaysQuests } from './quests';
import { migrate } from './storage';
import type { Quest } from './types';

const DAY = 24 * 60 * 60 * 1000;
const T0 = new Date(2026, 9, 5, 10, 0).getTime();

function quest(over: Partial<Quest> = {}): Quest {
  return {
    id: 'dishwashing',
    title: '설거지',
    icon: '🍽️',
    time: { slot: 'evening' },
    location: 'kitchen',
    repeatDays: 2,
    xp: 10,
    affectsHome: true,
    createdAt: T0,
    lastCompletedAt: T0,
    ...over,
  };
}

describe('집 상태 (반복 주기 2일)', () => {
  it('0~1일 깨끗함 / 2일 관리 필요 / 3일 지저분함 / 4일 이상 매우 지저분함', () => {
    const q = quest();
    expect([0, 1, 2, 3, 4, 9].map((d) => questCleanLevel(q, T0 + d * DAY))).toEqual([0, 0, 1, 2, 3, 3]);
  });

  it('한 번도 안 한 퀘스트는 만든 날부터 계산한다', () => {
    const q = quest({ lastCompletedAt: null });
    expect(questCleanLevel(q, T0)).toBe(0);
    expect(questCleanLevel(q, T0 + 2 * DAY)).toBe(1);
  });

  it('집 상태에 반영하지 않는 퀘스트는 항상 깨끗함', () => {
    expect(questCleanLevel(quest({ affectsHome: false }), T0 + 10 * DAY)).toBe(0);
  });
});

describe('퀘스트 상태', () => {
  it('오늘 완료 → done, 주기 전 → upcoming, 주기 도래 → due', () => {
    const q = quest();
    expect(questStatus(q, T0)).toBe('done');
    expect(questStatus(q, T0 + DAY)).toBe('upcoming');
    expect(questStatus(q, T0 + 2 * DAY)).toBe('due');
    expect(questStatus(quest({ lastCompletedAt: null }), T0)).toBe('due');
  });

  it('오늘의 퀘스트는 할 일 먼저, 완료한 것은 뒤로', () => {
    const a = quest({ id: 'a', lastCompletedAt: T0 });
    const b = quest({ id: 'b', lastCompletedAt: null, time: { slot: 'morning' } });
    const c = quest({ id: 'c', lastCompletedAt: T0 - DAY });
    expect(todaysQuests([a, b, c], T0).map((q) => q.id)).toEqual(['b', 'a']);
  });
});

describe('게임 규칙', () => {
  it('퀘스트 완료 → XP 획득, 같은 날 두 번은 안 됨', () => {
    let data = createInitialData(T0);
    const r1 = applyAction(data, { type: 'completeQuest', id: 'dishwashing' }, T0);
    expect(r1.data.xp).toBe(10);
    expect(r1.events[0]).toMatchObject({ type: 'questComplete', xp: 10, homeClean: true });
    data = r1.data;
    const r2 = applyAction(data, { type: 'completeQuest', id: 'dishwashing' }, T0 + 1000);
    expect(r2.data.xp).toBe(10);
    expect(r2.events).toEqual([]);
  });

  it('XP 가 기준을 넘으면 레벨업 이벤트', () => {
    const data = { ...createInitialData(T0), xp: 55 };
    const r = applyAction(data, { type: 'completeQuest', id: 'dishwashing' }, T0);
    expect(r.events.map((e) => e.type)).toEqual(['questComplete', 'levelUp']);
    expect(levelFor(r.data.xp).title).toBe('생활인');
  });

  it('일기는 하루 한 번만 +10P', () => {
    let data = createInitialData(T0);
    data = applyAction(data, { type: 'saveDiary', text: '오늘은 주방을 정리했다' }, T0).data;
    expect(data.points).toBe(10);
    data = applyAction(data, { type: 'saveDiary', text: '고쳐 쓰기' }, T0 + 1000).data;
    expect(data.points).toBe(10);
    data = applyAction(data, { type: 'saveDiary', text: '다음 날' }, T0 + DAY).data;
    expect(data.points).toBe(20);
  });

  it('XP 와 포인트는 분리되어 있다', () => {
    const r = applyAction(createInitialData(T0), { type: 'completeQuest', id: 'laundry' }, T0);
    expect(r.data.points).toBe(0);
  });

  it('포인트로 아이템 구매 → 자동 장착, 부족하면 구매 불가', () => {
    let data = { ...createInitialData(T0), points: 90 };
    expect(applyAction(data, { type: 'buyItem', itemId: 'frog_hat' }, T0).data).toBe(data);
    data = applyAction(data, { type: 'buyItem', itemId: 'ribbon' }, T0).data;
    expect(data.points).toBe(10);
    expect(data.ownedItems).toContain('ribbon');
    expect(data.equipped.hair).toBe('ribbon');
  });

  it('퀘스트 추가 / 수정 / 삭제', () => {
    let data = createInitialData(T0);
    const draft = { title: '  화분 물주기 ', icon: '🪴', time: { slot: 'morning' as const }, location: 'living', repeatDays: 3, xp: 5, affectsHome: true };
    data = applyAction(data, { type: 'addQuest', draft }, T0).data;
    const added = data.quests.at(-1)!;
    expect(added.title).toBe('화분 물주기');
    data = applyAction(data, { type: 'updateQuest', id: added.id, draft: { ...draft, xp: 15 } }, T0).data;
    expect(data.quests.find((q) => q.id === added.id)!.xp).toBe(15);
    data = applyAction(data, { type: 'deleteQuest', id: added.id }, T0).data;
    expect(data.quests.find((q) => q.id === added.id)).toBeUndefined();
  });
});

describe('저장 데이터', () => {
  it('빠진 필드는 기본값으로 채운다', () => {
    const m = migrate({ xp: 42, quests: [{ ...quest(), affectsHome: undefined }] })!;
    expect(m.xp).toBe(42);
    expect(m.quests[0].affectsHome).toBe(true);
    expect(m.locations.length).toBeGreaterThan(0);
    expect(m.diary).toEqual({});
  });
});
