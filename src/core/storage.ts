import type { GameData } from './types';
import { createInitialData, DATA_VERSION } from './game';
import { LEGACY_LOCATION_IDS } from '../data/houseMap';

/**
 * 저장소 인터페이스. 지금은 localStorage 를 쓰지만,
 * 나중에 서버 DB 로 바꿀 때는 이 인터페이스를 구현하는 클래스만 새로 만들면 된다.
 */
export interface GameRepository {
  load(): GameData | null;
  save(data: GameData): void;
  clear(): void;
}

const KEY = 'go-homeprotector/save';

export class LocalStorageRepository implements GameRepository {
  constructor(readonly key = KEY) {}

  load(): GameData | null {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return null;
      return migrate(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  save(data: GameData): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
    } catch {
      // 저장 공간 부족·사생활 보호 모드 등: 게임은 계속 진행한다
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(this.key);
    } catch {
      /* noop */
    }
  }
}

/**
 * 예전 버전 저장 데이터를 현재 구조에 맞춘다. 빠진 필드는 기본값으로 채운다.
 * 집 맵(공간 영역·가구·문)은 항상 코드(src/data/houseMap.ts)의 최신 맵을 쓰고,
 * 사용자가 바꾼 공간 이름·NFC ID 만 저장 데이터에서 이어받는다.
 */
export function migrate(raw: unknown): GameData | null {
  if (!raw || typeof raw !== 'object') return null;
  const base = createInitialData(Date.now());
  const r = raw as Partial<GameData>;
  const saved = new Map((r.locations ?? []).map((l) => [LEGACY_LOCATION_IDS[l.id] ?? l.id, l]));
  // 맵이 바뀐 버전(v1)의 이름/NFC ID 는 새 맵과 맞지 않으므로 이어받지 않는다
  const keepCustom = (r.version ?? 0) >= DATA_VERSION;
  const locations = base.locations.map((l) => {
    const s = keepCustom ? saved.get(l.id) : undefined;
    return s ? { ...l, name: s.name ?? l.name, nfcId: s.nfcId ?? l.nfcId } : l;
  });
  const ids = new Set(locations.map((l) => l.id));
  const fixLocation = (id: string) => {
    const mapped = LEGACY_LOCATION_IDS[id] ?? id;
    return ids.has(mapped) ? mapped : locations[0].id;
  };
  return {
    ...base,
    ...r,
    locations,
    doors: base.doors,
    mapSize: base.mapSize,
    quests: (r.quests ?? base.quests).map((q) => ({ ...q, affectsHome: q.affectsHome ?? true, location: fixLocation(q.location) })),
    history: (r.history ?? []).map((h) => ({ ...h, location: fixLocation(h.location) })),
    equipped: r.equipped ?? {},
    diary: r.diary ?? {},
    todayPlan: r.todayPlan ?? base.todayPlan,
    timers: r.timers ?? [],
    version: DATA_VERSION,
  };
}
