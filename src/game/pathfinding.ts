import type { Door, HouseLocation, TilePoint } from '../core/types';

/**
 * 타일 격자 길찾기 (BFS).
 * - 가구가 놓인 칸은 지나갈 수 없다 (walkable 가구 제외)
 * - 다른 공간으로 넘어갈 때는 doors 에 등록된 칸으로만 지나갈 수 있다
 */
export class TileGrid {
  readonly roomOf: (string | null)[];
  readonly blocked: boolean[];
  private readonly doorSet = new Set<string>();

  constructor(
    readonly cols: number,
    readonly rows: number,
    locations: HouseLocation[],
    doors: Door[],
  ) {
    this.roomOf = new Array(cols * rows).fill(null);
    this.blocked = new Array(cols * rows).fill(false);
    for (const loc of locations) {
      const r = loc.rect;
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (this.inBounds(x, y)) this.roomOf[y * cols + x] = loc.id;
      for (const f of loc.furniture) {
        if (f.walkable) continue;
        for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) if (this.inBounds(x, y)) this.blocked[y * cols + x] = true;
      }
    }
    for (const d of doors) {
      this.doorSet.add(edgeKey(d.a, d.b));
    }
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.cols && y < this.rows;
  }

  room(x: number, y: number): string | null {
    return this.inBounds(x, y) ? this.roomOf[y * this.cols + x] : null;
  }

  isWalkable(x: number, y: number): boolean {
    return this.inBounds(x, y) && this.room(x, y) !== null && !this.blocked[y * this.cols + x];
  }

  isDoor(a: TilePoint, b: TilePoint): boolean {
    return this.doorSet.has(edgeKey(a, b));
  }

  canStep(a: TilePoint, b: TilePoint): boolean {
    if (!this.isWalkable(b.x, b.y)) return false;
    return this.room(a.x, a.y) === this.room(b.x, b.y) || this.isDoor(a, b);
  }

  /** 시작 칸과 도착 칸을 포함한 경로. 갈 수 없으면 null */
  findPath(start: TilePoint, goal: TilePoint): TilePoint[] | null {
    const key = (p: TilePoint) => p.y * this.cols + p.x;
    const prev = new Map<number, number>();
    const queue: TilePoint[] = [start];
    prev.set(key(start), -1);
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    while (queue.length) {
      const cur = queue.shift()!;
      if (cur.x === goal.x && cur.y === goal.y) {
        const path: TilePoint[] = [];
        let k = key(cur);
        while (k !== -1) {
          path.unshift({ x: k % this.cols, y: Math.floor(k / this.cols) });
          k = prev.get(k)!;
        }
        return path;
      }
      for (const [dx, dy] of dirs) {
        const next = { x: cur.x + dx, y: cur.y + dy };
        if (prev.has(key(next)) || !this.canStep(cur, next)) continue;
        prev.set(key(next), key(cur));
        queue.push(next);
      }
    }
    return null;
  }

  /** 공간 안의 빈 바닥 칸들 */
  freeTiles(loc: HouseLocation): TilePoint[] {
    const out: TilePoint[] = [];
    const r = loc.rect;
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (this.isWalkable(x, y)) out.push({ x, y });
    return out;
  }
}

function edgeKey(a: TilePoint, b: TilePoint): string {
  const [p, q] = a.y < b.y || (a.y === b.y && a.x < b.x) ? [a, b] : [b, a];
  return `${p.x},${p.y}|${q.x},${q.y}`;
}
