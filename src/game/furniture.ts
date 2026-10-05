import type { Furniture, FurnitureKind } from '../core/types';
import { C } from './palette';
import { box, rect, type Ctx } from './pixel';

// 가구 도트. (x, y, w, h) 는 바닥 위 점유 영역(px).
// 키가 큰 가구는 영역 위쪽으로 튀어나오게 그린다 (3/4 시점).

type Draw = (ctx: Ctx, x: number, y: number, w: number, h: number, t: number) => void;

const shadow = (ctx: Ctx, x: number, y: number, w: number, h: number) => rect(ctx, x + 1, y + h - 2, w - 1, 2, C.shadow);

const DRAW: Record<FurnitureKind, Draw> = {
  bed(ctx, x, y, w, h) {
    shadow(ctx, x, y, w, h);
    box(ctx, x, y - 6, w, 10, C.woodDark, C.outline); // 헤드보드
    rect(ctx, x + 2, y - 4, w - 4, 2, C.woodMid);
    box(ctx, x + 1, y + 2, w - 2, h - 3, C.cream, C.outline); // 매트리스
    box(ctx, x + 4, y + 4, w - 8, 8, C.white, C.outline); // 베개
    rect(ctx, x + 5, y + 5, w - 10, 2, '#f3eef7');
    box(ctx, x + 1, y + 15, w - 2, h - 16, C.pink, C.outline); // 이불
    rect(ctx, x + 2, y + 16, w - 4, 2, '#ffc2d1');
    for (let i = 0; i < 3; i++) rect(ctx, x + 6 + i * 8, y + 24 + (i % 2) * 6, 3, 3, C.white);
  },
  nightstand(ctx, x, y, w, h) {
    shadow(ctx, x, y, w, h);
    box(ctx, x + 1, y + 2, w - 2, h - 3, C.woodMid, C.outline);
    rect(ctx, x + 2, y + 8, w - 4, 1, C.woodDeep);
    rect(ctx, x + 7, y + 10, 2, 1, C.yellowDark);
    // 스탠드
    rect(ctx, x + 7, y - 2, 2, 5, C.outline);
    box(ctx, x + 3, y - 8, 10, 7, C.yellow, C.outline);
    rect(ctx, x + 4, y - 7, 8, 2, '#fff0a8');
  },
  wardrobe(ctx, x, y, w, h) {
    shadow(ctx, x, y, w, h);
    box(ctx, x, y - 14, w, h + 13, C.woodMid, C.outline);
    rect(ctx, x + 1, y - 13, w - 2, 2, C.woodLight);
    rect(ctx, x + w / 2, y - 11, 1, h + 9, C.woodDeep);
    rect(ctx, x + w / 2 - 3, y - 3, 2, 3, C.yellowDark);
    rect(ctx, x + w / 2 + 2, y - 3, 2, 3, C.yellowDark);
  },
  yogaMat(ctx, x, y, w, h) {
    box(ctx, x + 1, y + 3, w - 2, h - 6, C.purple, C.purpleDark);
    for (let i = 6; i < w - 6; i += 8) rect(ctx, x + i, y + 5, 4, h - 10, '#c9b3f0');
    box(ctx, x + w - 6, y + 2, 6, h - 4, C.purpleDark, C.outline); // 말린 끝
  },
  plant(ctx, x, y, w, h, t) {
    shadow(ctx, x, y, w, h);
    const sway = Math.round(Math.sin(t / 900 + x) * 0.6);
    box(ctx, x + 4, y + 6, 8, 8, C.terracotta, C.outline);
    rect(ctx, x + 5, y + 7, 6, 1, '#eba585');
    box(ctx, x + 2 + sway, y - 6, 6, 9, C.green, C.outline);
    box(ctx, x + 8 + sway, y - 8, 6, 11, C.green, C.outline);
    box(ctx, x + 5, y - 2, 6, 9, C.greenDark, C.outline);
    rect(ctx, x + 10 + sway, y - 6, 2, 3, '#a7e3a8');
  },
  rug(ctx, x, y, w, h) {
    box(ctx, x + 1, y + 1, w - 2, h - 2, '#f6c3a8', C.outline);
    rect(ctx, x + 3, y + 3, w - 6, h - 6, '#ffd9c4');
    for (let i = x + 6; i < x + w - 6; i += 6) rect(ctx, i, y + h / 2 - 1, 3, 2, '#f2a98a');
    for (let i = x + 2; i < x + w - 2; i += 3) {
      rect(ctx, i, y, 1, 1, '#e8a888');
      rect(ctx, i, y + h - 1, 1, 1, '#e8a888');
    }
  },
  sofa(ctx, x, y, w, h) {
    shadow(ctx, x, y, w, h);
    box(ctx, x, y - 8, w, h + 6, '#8fb8e8', C.outline); // 등받이
    box(ctx, x + 4, y - 2, w - 8, h - 1, '#a9cbf0', C.outline); // 좌석
    rect(ctx, x + w / 2, y - 1, 1, h - 3, '#7fa6d6');
    box(ctx, x, y - 4, 5, h + 2, '#7fa6d6', C.outline);
    box(ctx, x + w - 5, y - 4, 5, h + 2, '#7fa6d6', C.outline);
    box(ctx, x + 8, y - 6, 8, 6, C.yellow, C.outline); // 쿠션
  },
  tv(ctx, x, y, w, h, t) {
    shadow(ctx, x, y, w, h);
    box(ctx, x, y + 4, w, h - 4, C.woodMid, C.outline);
    rect(ctx, x + 2, y + 9, w - 4, 1, C.woodDeep);
    box(ctx, x + 8, y - 10, w - 16, 15, C.black, C.outline);
    const glow = Math.floor(t / 1500) % 2 === 0 ? C.screen : '#465680';
    rect(ctx, x + 10, y - 8, w - 20, 10, glow);
    rect(ctx, x + 12, y - 6, 4, 1, C.screenGlow);
  },
  coffeeTable(ctx, x, y, w, h) {
    shadow(ctx, x, y, w, h);
    box(ctx, x + 2, y + 3, w - 4, h - 6, C.woodLight, C.outline);
  },
  counter(ctx, x, y, w, h) {
    box(ctx, x, y - 4, w, h + 3, '#f0ece6', C.outline);
    rect(ctx, x + 1, y + 4, w - 2, h - 6, '#d8d0c6');
    for (let i = x + 3; i < x + w - 3; i += 8) rect(ctx, i, y + 7, 4, 1, C.grayDark);
  },
  stove(ctx, x, y, w, h, t) {
    DRAW.counter(ctx, x, y, w, h, t);
    rect(ctx, x + 2, y - 3, w - 4, 6, C.black);
    rect(ctx, x + 3, y - 2, 4, 4, '#555');
    rect(ctx, x + 9, y - 2, 4, 4, '#555');
    box(ctx, x + 2, y - 6, 7, 4, C.red, C.outline); // 냄비
  },
  sink(ctx, x, y, w, h, t) {
    DRAW.counter(ctx, x, y, w, h, t);
    box(ctx, x + 2, y - 3, w - 4, 6, '#9fb6c8', C.outline);
    rect(ctx, x + 3, y - 2, w - 6, 2, '#c7dbea');
    rect(ctx, x + 7, y - 8, 2, 6, C.metal);
    rect(ctx, x + 7, y - 8, 4, 2, C.metal);
  },
  fridge(ctx, x, y, w, h) {
    shadow(ctx, x, y, w, h);
    box(ctx, x, y - 14, w, h + 13, '#f4fbff', C.outline);
    rect(ctx, x + 1, y - 4, w - 2, 1, C.grayDark);
    rect(ctx, x + w - 4, y - 11, 2, 5, C.grayDark);
    rect(ctx, x + w - 4, y - 1, 2, 4, C.grayDark);
    rect(ctx, x + 3, y - 11, 3, 3, C.pink); // 자석
  },
  diningTable(ctx, x, y, w, h) {
    shadow(ctx, x, y, w, h);
    box(ctx, x + 2, y + 2, w - 4, h - 6, C.woodLight, C.outline);
    rect(ctx, x + 3, y + h - 6, w - 6, 2, C.woodDark);
    box(ctx, x + 6, y + 6, 8, 6, C.white, C.outline); // 접시
    box(ctx, x + 18, y + 14, 8, 6, C.white, C.outline);
    box(ctx, x + 20, y + 4, 4, 5, '#ffe28a', C.outline); // 컵
  },
  washer(ctx, x, y, w, h, t) {
    shadow(ctx, x, y, w, h);
    box(ctx, x, y - 6, w, h + 5, '#f4fbff', C.outline);
    rect(ctx, x + 2, y - 5, w - 4, 2, '#cfe3f0');
    rect(ctx, x + 11, y - 5, 2, 1, C.green);
    box(ctx, x + 3, y - 1, 10, 10, C.metal, C.outline);
    const spin = Math.floor(t / 300) % 2;
    rect(ctx, x + 5, y + 1, 6, 6, '#8fc9ec');
    rect(ctx, x + 6 + spin * 2, y + 3, 2, 2, C.white);
  },
  basket(ctx, x, y, w, h) {
    shadow(ctx, x, y, w, h);
    box(ctx, x + 2, y + 3, w - 4, h - 4, C.tan, C.outline);
    for (let i = y + 6; i < y + h - 2; i += 3) rect(ctx, x + 3, i, w - 6, 1, C.tanDark);
    rect(ctx, x + 4, y + 1, 4, 3, C.blue);
    rect(ctx, x + 8, y + 2, 4, 2, C.pink);
  },
  dryingRack(ctx, x, y, w, h, t) {
    rect(ctx, x + 1, y + h - 3, w - 2, 1, C.grayDark);
    rect(ctx, x + 2, y - 4, 1, h + 1, C.grayDark);
    rect(ctx, x + w - 3, y - 4, 1, h + 1, C.grayDark);
    rect(ctx, x + 2, y - 4, w - 4, 1, C.metal);
    const colors = [C.blue, C.yellow, C.pink, C.green, C.white];
    for (let i = 0; i < 5; i++) {
      const sway = Math.round(Math.sin(t / 700 + i) * 0.7);
      box(ctx, x + 5 + i * 8 + sway, y - 3, 6, 8 + (i % 2) * 2, colors[i], C.outline);
    }
  },
  desk(ctx, x, y, w, h, t) {
    shadow(ctx, x, y, w, h);
    box(ctx, x, y - 2, w, h + 1, C.woodLight, C.outline);
    rect(ctx, x + 1, y + 10, w - 2, 2, C.woodDark);
    box(ctx, x + 8, y - 12, 16, 11, C.black, C.outline); // 모니터
    rect(ctx, x + 9, y - 11, 14, 8, Math.floor(t / 900) % 2 ? '#5fa8d3' : '#68b3dd');
    rect(ctx, x + 11, y - 9, 6, 1, C.white);
    rect(ctx, x + 11, y - 7, 9, 1, '#cfeaff');
    rect(ctx, x + 15, y - 2, 2, 2, C.outline);
    box(ctx, x + 9, y + 2, 14, 4, C.gray, C.outline); // 키보드
    box(ctx, x + 2, y - 4, 5, 6, C.white, C.outline); // 머그
  },
  chair(ctx, x, y) {
    box(ctx, x + 3, y + 1, 10, 8, '#9fd8c9', C.outline);
    rect(ctx, x + 7, y + 9, 2, 4, C.outline);
    rect(ctx, x + 4, y + 13, 8, 1, C.outline);
  },
  bookshelf(ctx, x, y, w, h) {
    shadow(ctx, x, y, w, h);
    box(ctx, x, y - 10, w, h + 9, C.woodMid, C.outline);
    const colors = [C.red, C.blue, C.yellow, C.green, C.purple, C.pink];
    for (let s = 0; s < 4; s++) {
      const sy = y - 8 + s * 10;
      rect(ctx, x + 1, sy + 8, w - 2, 1, C.woodDeep);
      for (let b = 0; b < 4; b++) rect(ctx, x + 2 + b * 3, sy + 2 + ((b + s) % 2), 2, 6 - ((b + s) % 2), colors[(b + s * 2) % colors.length]);
    }
  },
  catTower(ctx, x, y, w, h) {
    shadow(ctx, x, y, w, h);
    rect(ctx, x + 6, y - 8, 4, h + 6, C.tanDark);
    for (let i = y - 6; i < y + h - 2; i += 3) rect(ctx, x + 6, i, 4, 1, '#b08f58');
    box(ctx, x, y - 12, w, 5, C.peach, C.outline);
    box(ctx, x + 1, y + 8, w - 2, 4, C.peach, C.outline);
    box(ctx, x - 1, y + h - 5, w + 2, 5, C.peach, C.outline);
    rect(ctx, x + 2, y - 7, 1, 5, C.outline); // 장난감 끈
    box(ctx, x + 1, y - 2, 3, 3, C.pink, C.outline);
  },
  catBowl(ctx, x, y) {
    box(ctx, x + 1, y + 7, 7, 5, C.blue, C.outline);
    rect(ctx, x + 2, y + 8, 5, 1, '#c7ecff');
    box(ctx, x + 8, y + 7, 7, 5, C.pink, C.outline);
    rect(ctx, x + 9, y + 8, 5, 1, '#b07a4a');
  },
  catBed(ctx, x, y) {
    box(ctx, x, y + 3, 16, 12, C.purple, C.outline);
    rect(ctx, x + 3, y + 6, 10, 6, '#e6dcfb');
  },
};

export function drawFurniture(ctx: Ctx, f: Furniture, ox: number, oy: number, t: number): void {
  DRAW[f.kind](ctx, ox + f.x * 16, oy + f.y * 16, f.w * 16, f.h * 16, t);
}

/** 바닥에 깔리는 가구 (캐릭터보다 항상 아래) */
export function isFlat(kind: FurnitureKind): boolean {
  return kind === 'rug' || kind === 'yogaMat';
}
