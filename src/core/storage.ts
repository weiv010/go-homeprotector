import type { GameData } from './types';
import { createInitialData, DATA_VERSION } from './game';

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

/** 예전 버전 저장 데이터를 현재 구조에 맞춘다. 빠진 필드는 기본값으로 채운다 */
export function migrate(raw: unknown): GameData | null {
  if (!raw || typeof raw !== 'object') return null;
  const base = createInitialData(Date.now());
  const r = raw as Partial<GameData>;
  return {
    ...base,
    ...r,
    // 새로 추가된 기본 공간은 저장 데이터에 없으면 붙여준다
    locations: [
      ...(r.locations ?? []),
      ...base.locations.filter((l) => !(r.locations ?? []).some((x) => x.id === l.id)),
    ],
    quests: (r.quests ?? base.quests).map((q) => ({ ...q, affectsHome: q.affectsHome ?? true })),
    equipped: r.equipped ?? {},
    diary: r.diary ?? {},
    history: r.history ?? [],
    version: DATA_VERSION,
  };
}
