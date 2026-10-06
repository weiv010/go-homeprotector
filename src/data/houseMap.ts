import type { HouseMap } from '../core/types';

// ─────────────────────────────────────────────────────────────
// 실제 집 구조 ↔ 게임 맵 (1:1 대응)
//
// 16×16px 타일 기준 22 × 14 격자. 손그림 평면도를 그대로 옮겼다.
//
//    x 0   3        8    12                    21
//   y┌───┬─────────┬────┬──────────────────────┐
//   0│세탁│ 작업Zone│옷방│     고양이 Zone  캣타워│
//   2├───┤  (책상) ├─ ─┤                      │
//   3│화장│          ·   ├─── ───   ───────────┤ ← 반벽 (가운데 뚫림)
//   4│ 실 │          ·  ::                      │
//   6├───┘   거실    ·  ::                      │  :: = 왼쪽 집 ↔ 오른쪽 방 통로
//   7│    주방        ·   │             침대      │
//    │                 ·   │                      │
//  13└────────────── [현관]┴──────────────────────┘
//
// room 이 같은 공간(작업Zone·주방·거실)은 벽 없이 이어진 하나의 큰 방이다.
// nfcId 가 '' 인 공간(화장실·거실)은 태그 없이 바로 퀘스트 창이 열린다.
// NFC 태그를 붙이는 곳: 세탁실, 책상, 옷방, 주방, 고양이, 침대 (6곳)
// ─────────────────────────────────────────────────────────────

export const HOUSE_MAP: HouseMap = {
  cols: 22,
  rows: 14,
  windows: [4, 13, 18],
  locations: [
    {
      id: 'laundry',
      name: '세탁실',
      emoji: '🧺',
      nfcId: 'washing_machine_nfc',
      rect: { x: 0, y: 0, w: 3, h: 3 },
      spot: { x: 1, y: 1 },
      floor: 'tile',
      messKind: 'laundry',
      furniture: [
        { kind: 'basket', x: 0, y: 0, w: 1, h: 1 },
        { kind: 'washer', x: 1, y: 0, w: 1, h: 1 },
      ],
    },
    {
      id: 'bathroom',
      name: '화장실',
      emoji: '🚽',
      nfcId: '',
      rect: { x: 0, y: 3, w: 3, h: 4 },
      spot: { x: 1, y: 4 },
      floor: 'blueTile',
      messKind: 'laundry',
      furniture: [
        { kind: 'toilet', x: 0, y: 3, w: 1, h: 1 },
        { kind: 'bathSink', x: 1, y: 3, w: 1, h: 1 },
      ],
    },
    {
      id: 'desk',
      name: '작업 Zone',
      emoji: '💻',
      nfcId: 'desk_nfc',
      room: 'main',
      rect: { x: 3, y: 0, w: 5, h: 7 },
      spot: { x: 5, y: 1 },
      label: { x: 5.5, y: 4 },
      floor: 'wood',
      messKind: 'papers',
      furniture: [
        { kind: 'rug', x: 4, y: 1, w: 3, h: 2, walkable: true, color: '#9a97a8' },
        { kind: 'desk', x: 4, y: 0, w: 3, h: 1 },
        { kind: 'chair', x: 5, y: 1, w: 1, h: 1, walkable: true },
        { kind: 'plant', x: 7, y: 0, w: 1, h: 1 },
      ],
    },
    {
      id: 'closet',
      name: '옷방',
      emoji: '👚',
      nfcId: 'closet_nfc',
      rect: { x: 8, y: 0, w: 4, h: 3 },
      spot: { x: 9, y: 1 },
      floor: 'wood',
      messKind: 'laundry',
      furniture: [
        { kind: 'clothesRack', x: 8, y: 0, w: 2, h: 1 },
        { kind: 'plant', x: 10, y: 0, w: 1, h: 1 },
        { kind: 'dresser', x: 11, y: 0, w: 1, h: 1 },
      ],
    },
    {
      id: 'kitchen',
      name: '주방',
      emoji: '🍳',
      nfcId: 'kitchen_nfc',
      room: 'main',
      rect: { x: 0, y: 7, w: 8, h: 7 },
      spot: { x: 3, y: 8 },
      floor: 'tile',
      messKind: 'dishes',
      furniture: [
        { kind: 'fridge', x: 0, y: 7, w: 1, h: 1 },
        { kind: 'counter', x: 1, y: 7, w: 2, h: 1 },
        { kind: 'sink', x: 3, y: 7, w: 1, h: 1 },
        { kind: 'stove', x: 4, y: 7, w: 1, h: 1 },
        { kind: 'counter', x: 5, y: 7, w: 1, h: 1 },
        { kind: 'diningTable', x: 2, y: 10, w: 2, h: 2 },
      ],
    },
    {
      id: 'hall',
      name: '거실',
      emoji: '🛋️',
      nfcId: '',
      room: 'main',
      rect: { x: 8, y: 3, w: 4, h: 11 },
      spot: { x: 9, y: 7 },
      floor: 'wood',
      messKind: 'clutter',
      furniture: [
        { kind: 'mirror', x: 11, y: 7, w: 1, h: 2 },
        { kind: 'plant', x: 11, y: 10, w: 1, h: 1 },
        { kind: 'doormat', x: 9, y: 13, w: 2, h: 1, walkable: true },
      ],
    },
    {
      id: 'cat',
      name: '고양이 Zone',
      emoji: '🐈',
      nfcId: 'cat_tower_nfc',
      rect: { x: 12, y: 0, w: 10, h: 4 },
      spot: { x: 16, y: 2 },
      floor: 'wood',
      messKind: 'fur',
      furniture: [
        { kind: 'catBed', x: 13, y: 0, w: 1, h: 1 },
        { kind: 'catTower', x: 16, y: 0, w: 1, h: 2 },
        { kind: 'catBowl', x: 18, y: 0, w: 1, h: 1 },
        { kind: 'catTower', x: 21, y: 0, w: 1, h: 2 },
      ],
    },
    {
      id: 'bedroom',
      name: '침대',
      emoji: '🛏️',
      nfcId: 'bedroom_nfc',
      rect: { x: 12, y: 4, w: 10, h: 10 },
      spot: { x: 18, y: 11 },
      floor: 'wood',
      messKind: 'laundry',
      furniture: [
        { kind: 'rug', x: 16, y: 7, w: 6, h: 7, walkable: true, color: '#8e6f9e' },
        { kind: 'rug', x: 17, y: 11, w: 3, h: 2, walkable: true, color: '#6f93c9' },
        { kind: 'yogaMat', x: 13, y: 9, w: 3, h: 1, walkable: true },
        { kind: 'bookshelf', x: 21, y: 4, w: 1, h: 2 },
        { kind: 'plant', x: 21, y: 6, w: 1, h: 1 },
        { kind: 'bed', x: 17, y: 8, w: 3, h: 3 },
        { kind: 'nightstand', x: 20, y: 8, w: 1, h: 1 },
        { kind: 'pouf', x: 20, y: 12, w: 1, h: 1 },
      ],
    },
  ],
  doors: [
    { a: { x: 2, y: 1 }, b: { x: 3, y: 1 } }, // 세탁실 ↔ 작업Zone
    { a: { x: 2, y: 5 }, b: { x: 3, y: 5 } }, // 화장실 ↔ 거실
    { a: { x: 9, y: 2 }, b: { x: 9, y: 3 } }, // 옷방 ↔ 거실
    { a: { x: 11, y: 4 }, b: { x: 12, y: 4 } }, // 거실 ↔ 침실 (통로)
    { a: { x: 11, y: 5 }, b: { x: 12, y: 5 } },
    { a: { x: 14, y: 3 }, b: { x: 14, y: 4 } }, // 고양이 Zone ↔ 침실 (반벽 사이)
    { a: { x: 15, y: 3 }, b: { x: 15, y: 4 } },
    { a: { x: 16, y: 3 }, b: { x: 16, y: 4 } },
    { a: { x: 17, y: 3 }, b: { x: 17, y: 4 } },
  ],
};

/** 캐릭터가 처음 서 있는 공간 */
export const START_LOCATION = 'hall';

/** 고양이가 돌아다니는 공간 */
export const CAT_ROAM = ['cat', 'bedroom', 'hall'];

/** 예전 버전 공간 ID → 새 공간 ID (저장 데이터 이전용) */
export const LEGACY_LOCATION_IDS: Record<string, string> = {
  living: 'hall',
};
