import type { HouseMap } from '../core/types';

// ─────────────────────────────────────────────────────────────
// 실제 집 구조 ↔ 게임 맵 (1:1 대응)
//
// 맵은 16×16px 타일 기준이며 cols × rows 크기의 격자다.
// 각 공간(location)은 rect 로 영역을 지정하고, 공간 사이 벽은
// doors 에 적힌 칸끼리만 통과할 수 있다.
//
//   ┌──────────────────────────────┐
//   │            침실              │  y 0~4
//   ├──────────────┬───────────────┤
//   │    주방      │     거실      │  y 5~9
//   ├─────────┬────┴───┬───────────┤
//   │ 세탁공간 │ 고양이 │ 작업공간  │  y 10~14
//   └─────────┴────────┴───────────┘
//
// 실제 집에 맞게 rect / furniture / doors 를 고치면 맵이 바뀐다.
// nfcId 는 실제 NFC 태그에 기록할 값이다.
// ─────────────────────────────────────────────────────────────

export const HOUSE_MAP: HouseMap = {
  cols: 14,
  rows: 15,
  locations: [
    {
      id: 'bedroom',
      name: '침실',
      emoji: '🛏️',
      nfcId: 'bedroom_nfc',
      rect: { x: 0, y: 0, w: 14, h: 5 },
      spot: { x: 4, y: 2 },
      floor: 'wood',
      messKind: 'laundry',
      furniture: [
        { kind: 'bed', x: 1, y: 0, w: 2, h: 3 },
        { kind: 'nightstand', x: 3, y: 0, w: 1, h: 1 },
        { kind: 'yogaMat', x: 5, y: 2, w: 3, h: 1, walkable: true },
        { kind: 'wardrobe', x: 11, y: 0, w: 2, h: 1 },
        { kind: 'plant', x: 13, y: 0, w: 1, h: 1 },
      ],
    },
    {
      id: 'kitchen',
      name: '주방',
      emoji: '🍳',
      nfcId: 'kitchen_nfc',
      rect: { x: 0, y: 5, w: 7, h: 5 },
      spot: { x: 3, y: 6 },
      floor: 'tile',
      messKind: 'dishes',
      furniture: [
        { kind: 'counter', x: 0, y: 5, w: 2, h: 1 },
        { kind: 'stove', x: 2, y: 5, w: 1, h: 1 },
        { kind: 'sink', x: 3, y: 5, w: 1, h: 1 },
        { kind: 'counter', x: 4, y: 5, w: 1, h: 1 },
        { kind: 'fridge', x: 5, y: 5, w: 1, h: 1 },
        { kind: 'diningTable', x: 1, y: 7, w: 2, h: 2 },
      ],
    },
    {
      id: 'living',
      name: '거실',
      emoji: '🛋️',
      nfcId: 'living_nfc',
      rect: { x: 7, y: 5, w: 7, h: 5 },
      spot: { x: 8, y: 7 },
      floor: 'wood',
      messKind: 'clutter',
      furniture: [
        { kind: 'tv', x: 10, y: 5, w: 3, h: 1 },
        { kind: 'plant', x: 13, y: 5, w: 1, h: 1 },
        { kind: 'rug', x: 9, y: 6, w: 4, h: 2, walkable: true },
        { kind: 'sofa', x: 10, y: 8, w: 3, h: 1 },
      ],
    },
    {
      id: 'laundry',
      name: '세탁공간',
      emoji: '🧺',
      nfcId: 'washing_machine_nfc',
      rect: { x: 0, y: 10, w: 5, h: 5 },
      spot: { x: 1, y: 11 },
      floor: 'tile',
      messKind: 'laundry',
      furniture: [
        { kind: 'washer', x: 0, y: 10, w: 1, h: 1 },
        { kind: 'basket', x: 3, y: 10, w: 1, h: 1 },
        { kind: 'dryingRack', x: 0, y: 13, w: 3, h: 1 },
      ],
    },
    {
      id: 'cat',
      name: '고양이 공간',
      emoji: '🐈',
      nfcId: 'cat_tower_nfc',
      rect: { x: 5, y: 10, w: 4, h: 5 },
      spot: { x: 6, y: 12 },
      floor: 'mint',
      messKind: 'fur',
      furniture: [
        { kind: 'catTower', x: 5, y: 10, w: 1, h: 2 },
        { kind: 'catBowl', x: 5, y: 14, w: 1, h: 1 },
        { kind: 'catBed', x: 8, y: 14, w: 1, h: 1 },
      ],
    },
    {
      id: 'desk',
      name: '작업공간',
      emoji: '💻',
      nfcId: 'desk_nfc',
      rect: { x: 9, y: 10, w: 5, h: 5 },
      spot: { x: 11, y: 13 },
      floor: 'carpet',
      messKind: 'papers',
      furniture: [
        { kind: 'bookshelf', x: 13, y: 10, w: 1, h: 2 },
        { kind: 'desk', x: 10, y: 12, w: 2, h: 1 },
        { kind: 'chair', x: 11, y: 13, w: 1, h: 1, walkable: true },
        { kind: 'plant', x: 13, y: 14, w: 1, h: 1 },
      ],
    },
  ],
  doors: [
    { a: { x: 8, y: 4 }, b: { x: 8, y: 5 } }, // 침실 ↔ 거실
    { a: { x: 6, y: 7 }, b: { x: 7, y: 7 } }, // 주방 ↔ 거실
    { a: { x: 2, y: 9 }, b: { x: 2, y: 10 } }, // 주방 ↔ 세탁공간
    { a: { x: 7, y: 9 }, b: { x: 7, y: 10 } }, // 거실 ↔ 고양이 공간
    { a: { x: 10, y: 9 }, b: { x: 10, y: 10 } }, // 거실 ↔ 작업공간
    { a: { x: 4, y: 12 }, b: { x: 5, y: 12 } }, // 세탁공간 ↔ 고양이 공간
  ],
};

/** 캐릭터가 처음 서 있는 공간 */
export const START_LOCATION = 'living';
