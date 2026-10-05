// 도트 그리기 도우미. 모든 좌표는 게임 내부 해상도(px) 기준 정수다.

export type Ctx = CanvasRenderingContext2D;

export function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

/** 테두리 있는 사각형 (outline 1px) */
export function box(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, outline: string): void {
  rect(ctx, x, y, w, h, outline);
  rect(ctx, x + 1, y + 1, w - 2, h - 2, fill);
}

export type Palette = Record<string, string>;

/**
 * 문자열 배열로 된 도트 그림을 그린다. '.' 은 투명.
 * flip 이면 좌우 반전.
 */
export function sprite(ctx: Ctx, rows: string[], pal: Palette, x: number, y: number, flip = false): void {
  const ox = Math.round(x);
  const oy = Math.round(y);
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const w = row.length;
    for (let c = 0; c < w; c++) {
      const ch = row[c];
      if (ch === '.' || ch === ' ') continue;
      const color = pal[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(ox + (flip ? w - 1 - c : c), oy + r, 1, 1);
    }
  }
}

/** 시드 기반 난수 (맵 장식이 매번 같은 자리에 나오도록) */
export function seeded(seedStr: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
