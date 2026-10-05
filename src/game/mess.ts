import type { CleanLevel, MessKind } from '../core/types';
import { C } from './palette';
import { box, rect, type Ctx } from './pixel';

// 공간이 지저분해질수록 늘어나는 물건들 (각 16×16 타일 안에 그림)

type MessDraw = (ctx: Ctx, x: number, y: number) => void;

const plates: MessDraw = (ctx, x, y) => {
  for (let i = 0; i < 3; i++) box(ctx, x + 3, y + 10 - i * 3, 10, 4, C.white, C.outline);
  rect(ctx, x + 6, y + 5, 3, 1, '#d9a36b');
};
const cup: MessDraw = (ctx, x, y) => {
  box(ctx, x + 5, y + 6, 6, 7, '#ffe28a', C.outline);
  rect(ctx, x + 11, y + 8, 2, 3, C.outline);
  rect(ctx, x + 6, y + 7, 4, 1, '#a0703e');
};
const pot: MessDraw = (ctx, x, y) => {
  box(ctx, x + 2, y + 6, 12, 8, C.grayDark, C.outline);
  rect(ctx, x + 3, y + 7, 10, 2, '#c0815a');
  rect(ctx, x + 1, y + 8, 1, 2, C.outline);
  rect(ctx, x + 14, y + 8, 1, 2, C.outline);
};
const clothes = (color: string, accent: string): MessDraw => (ctx, x, y) => {
  box(ctx, x + 1, y + 8, 14, 7, color, C.outline);
  rect(ctx, x + 3, y + 7, 6, 3, color);
  rect(ctx, x + 2, y + 10, 5, 1, accent);
  rect(ctx, x + 9, y + 12, 4, 1, accent);
};
const sock: MessDraw = (ctx, x, y) => {
  box(ctx, x + 5, y + 6, 4, 7, C.white, C.outline);
  box(ctx, x + 5, y + 10, 8, 4, C.white, C.outline);
  rect(ctx, x + 6, y + 7, 2, 1, C.red);
};
const box16: MessDraw = (ctx, x, y) => {
  box(ctx, x + 2, y + 5, 12, 10, C.tanDark, C.outline);
  rect(ctx, x + 3, y + 6, 10, 2, C.tan);
  rect(ctx, x + 7, y + 6, 2, 8, '#e9d9a6');
};
const snack: MessDraw = (ctx, x, y) => {
  box(ctx, x + 3, y + 6, 9, 9, C.red, C.outline);
  rect(ctx, x + 5, y + 9, 5, 3, C.yellow);
  rect(ctx, x + 12, y + 13, 2, 2, '#f0b44a');
};
const can: MessDraw = (ctx, x, y) => {
  box(ctx, x + 4, y + 11, 9, 4, C.blue, C.outline);
  rect(ctx, x + 12, y + 12, 1, 2, C.metal);
};
const paper: MessDraw = (ctx, x, y) => {
  box(ctx, x + 2, y + 6, 10, 8, C.white, C.outline);
  rect(ctx, x + 4, y + 8, 6, 1, C.gray);
  rect(ctx, x + 4, y + 10, 5, 1, C.gray);
  box(ctx, x + 7, y + 9, 8, 6, '#fffbe0', C.outline);
};
const crumple: MessDraw = (ctx, x, y) => {
  box(ctx, x + 5, y + 9, 6, 6, C.white, C.outline);
  rect(ctx, x + 6, y + 11, 2, 1, C.gray);
  box(ctx, x + 10, y + 11, 4, 4, '#fffbe0', C.outline);
};
const fur: MessDraw = (ctx, x, y) => {
  rect(ctx, x + 4, y + 11, 6, 3, '#f5d2a8');
  rect(ctx, x + 5, y + 10, 4, 1, '#f5d2a8');
  rect(ctx, x + 10, y + 13, 3, 2, '#f0c08c');
  rect(ctx, x + 3, y + 13, 1, 1, '#f0c08c');
};
const yarn: MessDraw = (ctx, x, y) => {
  box(ctx, x + 4, y + 8, 7, 7, C.pink, C.outline);
  rect(ctx, x + 6, y + 10, 3, 1, C.pinkDark);
  rect(ctx, x + 11, y + 13, 4, 1, C.pinkDark);
};
const dust: MessDraw = (ctx, x, y) => {
  rect(ctx, x + 3, y + 12, 5, 3, '#b7adb9');
  rect(ctx, x + 4, y + 11, 3, 1, '#c9c1cb');
  rect(ctx, x + 4, y + 12, 1, 1, C.outline);
  rect(ctx, x + 6, y + 12, 1, 1, C.outline);
};
export const trashBag: MessDraw = (ctx, x, y) => {
  box(ctx, x + 2, y + 4, 12, 11, '#5d5868', C.outline);
  rect(ctx, x + 6, y + 1, 4, 4, '#5d5868');
  rect(ctx, x + 6, y + 3, 4, 1, C.yellow);
  rect(ctx, x + 4, y + 7, 2, 4, '#78738a');
};

const BY_KIND: Record<MessKind, MessDraw[]> = {
  dishes: [plates, cup, pot, plates, cup],
  laundry: [clothes(C.blue, C.blueDark), sock, clothes(C.yellow, C.yellowDark), clothes(C.pink, C.pinkDark)],
  clutter: [box16, snack, can, clothes(C.green, C.greenDark)],
  papers: [paper, crumple, cup, paper],
  fur: [fur, yarn, fur, dust],
};

/** level 별로 보여줄 물건 개수 */
export const MESS_COUNT: Record<CleanLevel, number> = { 0: 0, 1: 2, 2: 4, 3: 7 };

export function drawMess(ctx: Ctx, kind: MessKind, index: number, x: number, y: number): void {
  const list = BY_KIND[kind];
  // 3개 중 1개는 먼지 뭉치로 섞어서 "어질러진 느낌"을 준다
  const fn = index > 0 && index % 3 === 2 ? dust : list[index % list.length];
  fn(ctx, x, y);
}

/** 매우 지저분할 때 머리 위에 날아다니는 파리 */
export function drawFly(ctx: Ctx, x: number, y: number, t: number): void {
  const wing = Math.floor(t / 80) % 2;
  rect(ctx, x, y, 2, 2, C.outline);
  rect(ctx, x - 1, y - 1 - wing, 1, 1, '#d8eefc');
  rect(ctx, x + 2, y - 1 - wing, 1, 1, '#d8eefc');
}

/** 악취 물결 */
export function drawStink(ctx: Ctx, x: number, y: number, t: number): void {
  const off = Math.floor(t / 200) % 3;
  ctx.fillStyle = 'rgba(140, 190, 90, 0.8)';
  for (let i = 0; i < 6; i++) {
    const dx = (i + off) % 3 === 0 ? 0 : (i + off) % 3 === 1 ? 1 : 0;
    ctx.fillRect(x + dx, y - i * 2, 1, 2);
    ctx.fillRect(x + 5 - dx, y - 1 - i * 2, 1, 2);
  }
}
