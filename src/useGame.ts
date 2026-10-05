import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { applyAction, createInitialData, type GameAction } from './core/game';
import { houseCleanLevels } from './core/quests';
import { LocalStorageRepository } from './core/storage';
import { shiftDays } from './core/time';
import type { GameData, GameEvent } from './core/types';

const repo = new LocalStorageRepository();

/** 게임 데이터 + 규칙(applyAction) 을 React 상태로 연결하는 훅 */
export function useGame() {
  const [data, setData] = useState<GameData>(() => repo.load() ?? createInitialData(Date.now()));
  const dataRef = useRef(data);
  const [clock, setClock] = useState(() => Date.now());

  // 시간이 흐르면 집 상태가 바뀌므로 30초마다 시계를 갱신한다
  useEffect(() => {
    const id = window.setInterval(() => setClock(Date.now()), 30_000);
    const onVisible = () => document.visibilityState === 'visible' && setClock(Date.now());
    document.addEventListener('visibilitychange', onVisible);
    // NFC 태그(URL)로 새 탭이 열려 저장 데이터가 바뀌면 이 탭에도 반영한다
    const onStorage = (e: StorageEvent) => {
      if (e.key !== repo.key) return;
      const next = repo.load();
      if (next) {
        dataRef.current = next;
        setData(next);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const now = shiftDays(clock, data.debugDayOffset);

  const dispatch = useCallback((action: GameAction): GameEvent[] => {
    const at = shiftDays(Date.now(), dataRef.current.debugDayOffset);
    const { data: next, events } = applyAction(dataRef.current, action, at);
    if (next !== dataRef.current) {
      dataRef.current = next;
      repo.save(next);
      setData(next);
      setClock(Date.now());
    }
    return events;
  }, []);

  const replaceData = useCallback((next: GameData) => {
    dataRef.current = next;
    repo.save(next);
    setData(next);
  }, []);

  const cleanLevels = useMemo(() => houseCleanLevels(data, now), [data, now]);

  return { data, now, dispatch, replaceData, cleanLevels };
}

export type GameApi = ReturnType<typeof useGame>;
