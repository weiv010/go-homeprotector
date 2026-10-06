import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { applyAction, createInitialData, type GameAction } from './core/game';
import { houseCleanLevels } from './core/quests';
import { LocalStorageRepository } from './core/storage';
import { autoBackup } from './core/cloudBackup';
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
    const onVisible = () => {
      if (document.visibilityState === 'visible') setClock(Date.now());
      // 앱을 내리거나 닫을 때 밀린 백업을 바로 보낸다
      else void autoBackup.flush(true);
    };
    // 앱을 열 때마다 한 번 백업 (설정돼 있을 때만)
    autoBackup.schedule(dataRef.current);
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
      autoBackup.schedule(next);
      setData(next);
      setClock(Date.now());
    }
    return events;
  }, []);

  const replaceData = useCallback((next: GameData) => {
    dataRef.current = next;
    repo.save(next);
    autoBackup.schedule(next);
    setData(next);
  }, []);

  const cleanLevels = useMemo(() => houseCleanLevels(data, now), [data, now]);

  return { data, now, dispatch, replaceData, cleanLevels };
}

export type GameApi = ReturnType<typeof useGame>;
