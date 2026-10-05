// 게임 전체에서 쓰는 데이터 타입.
// 저장 데이터(GameData)는 이 파일의 타입만으로 표현되므로,
// 나중에 서버 DB로 옮길 때도 이 구조를 그대로 직렬화하면 된다.

export type LocationId = string;
export type NfcId = string;

/** 타일 좌표 (16px 단위) */
export interface TilePoint {
  x: number;
  y: number;
}

export interface TileRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type FurnitureKind =
  | 'bed'
  | 'nightstand'
  | 'wardrobe'
  | 'yogaMat'
  | 'plant'
  | 'rug'
  | 'sofa'
  | 'tv'
  | 'coffeeTable'
  | 'counter'
  | 'stove'
  | 'sink'
  | 'fridge'
  | 'diningTable'
  | 'washer'
  | 'basket'
  | 'dryingRack'
  | 'desk'
  | 'chair'
  | 'bookshelf'
  | 'catTower'
  | 'catBowl'
  | 'catBed';

export interface Furniture {
  kind: FurnitureKind;
  x: number;
  y: number;
  w: number;
  h: number;
  /** 바닥 장식(러그, 요가매트)은 지나갈 수 있다 */
  walkable?: boolean;
}

/** 공간이 더러워졌을 때 어떤 물건이 늘어나는지 */
export type MessKind = 'dishes' | 'laundry' | 'clutter' | 'papers' | 'fur';

export interface HouseLocation {
  id: LocationId;
  name: string;
  emoji: string;
  nfcId: NfcId;
  /** 게임 맵 위의 공간 영역 (타일 단위) */
  rect: TileRect;
  /** 캐릭터가 서서 NFC/퀘스트를 수행하는 위치 */
  spot: TilePoint;
  floor: 'wood' | 'tile' | 'carpet' | 'mint';
  messKind: MessKind;
  furniture: Furniture[];
}

/** 두 칸 사이의 문. a와 b는 서로 인접한 타일이다 */
export interface Door {
  a: TilePoint;
  b: TilePoint;
}

export interface HouseMap {
  cols: number;
  rows: number;
  locations: HouseLocation[];
  doors: Door[];
}

export type TimeSlot = 'none' | 'morning' | 'afternoon' | 'evening' | 'specific';

export interface QuestTime {
  slot: TimeSlot;
  /** slot === 'specific' 일 때 "HH:MM" */
  at?: string;
}

export interface Quest {
  id: string;
  title: string;
  icon: string;
  time: QuestTime;
  location: LocationId;
  /** 반복 주기 (일) */
  repeatDays: number;
  xp: number;
  /** 미완료 시 집 상태(지저분함)에 반영할지. 요가·작업 같은 퀘스트는 끌 수 있다 */
  affectsHome: boolean;
  createdAt: number;
  lastCompletedAt: number | null;
}

export type QuestDraft = Omit<Quest, 'id' | 'createdAt' | 'lastCompletedAt'>;

export type ItemSlot = 'hat' | 'hair' | 'outfit' | 'bag' | 'extra';

export interface ShopItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
  slot: ItemSlot;
  description: string;
}

export interface CompletionLog {
  questId: string;
  title: string;
  icon: string;
  location: LocationId;
  xp: number;
  at: number;
}

export interface DiaryEntry {
  /** YYYY-MM-DD (로컬 날짜) */
  date: string;
  text: string;
  updatedAt: number;
  pointsAwarded: number;
}

export interface GameData {
  version: number;
  locations: HouseLocation[];
  doors: Door[];
  mapSize: { cols: number; rows: number };
  quests: Quest[];
  xp: number;
  points: number;
  ownedItems: string[];
  equipped: Partial<Record<ItemSlot, string>>;
  history: CompletionLog[];
  diary: Record<string, DiaryEntry>;
  /** 테스트용 시간 여행 (일 단위). 실제 사용 시 0 */
  debugDayOffset: number;
}

/** 공간 상태: 0 깨끗함, 1 관리 필요, 2 지저분함, 3 매우 지저분함 */
export type CleanLevel = 0 | 1 | 2 | 3;

export type QuestStatus = 'done' | 'due' | 'upcoming';

/** 화면 연출용 이벤트 (퀘스트 완료, 레벨업, 아이템 획득 등) */
export type GameEvent =
  | { type: 'questComplete'; questTitle: string; icon: string; xp: number; homeClean: boolean; locationName: string }
  | { type: 'levelUp'; level: number; title: string }
  | { type: 'newItem'; itemId: string }
  | { type: 'diarySaved'; points: number };
