import type { CleanLevel, Door, HouseLocation, ItemSlot, TilePoint } from '../core/types';
import { drawFurniture, isFlat } from './furniture';
import { drawFly, drawMess, drawStink, MESS_COUNT, trashBag } from './mess';
import { C } from './palette';
import { box, rect, seeded, sprite, type Ctx } from './pixel';
import { TileGrid } from './pathfinding';
import { CAT_FRAMES, CAT_PALETTES, CHAR_H, CHAR_W, drawCharacter, type Facing } from './sprites';
import { CAT_ROAM } from '../data/houseMap';

// ─────────────────────────────────────────────────────────────
// 도트 집 맵을 그리고 캐릭터를 움직이는 캔버스 엔진.
// React 와는 메서드 호출로만 통신한다 (walkTo, setCleanLevels ...).
// 내부 해상도로 그린 뒤 정수 배율로 확대해 도트가 흐려지지 않게 한다.
// ─────────────────────────────────────────────────────────────

export const TILE = 16;
export const MAP_OX = 6;
export const MAP_OY = 20;
const MAP_PAD_BOTTOM = 8;

export function mapPixelSize(cols: number, rows: number) {
  return { w: cols * TILE + MAP_OX * 2, h: rows * TILE + MAP_OY + MAP_PAD_BOTTOM };
}

export type MoveMode = 'walk' | 'dash';

interface Actor {
  x: number;
  y: number;
  path: TilePoint[];
  facing: Facing;
  moving: boolean;
  animT: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  kind: 'dust' | 'sparkle' | 'heart' | 'star';
  color: string;
}

const WALK_SPEED = 46;
const DASH_SPEED = 150;
const CAT_SPEED = 28;

function tileCenter(p: TilePoint) {
  return { x: MAP_OX + p.x * TILE + 8, y: MAP_OY + p.y * TILE + 13 };
}

export interface WorldConfig {
  cols: number;
  rows: number;
  locations: HouseLocation[];
  doors: Door[];
  windows?: number[];
}

/** 매 프레임 화면 정보: 캐릭터 머리 위치(보이는 화면 대비 0~1)와 카메라(맵 전체 대비 0~1) */
export interface FrameInfo {
  head: { x: number; y: number };
  camOffset: number;
  camView: number;
}

export class GameEngine {
  private ctx: Ctx;
  private grid!: TileGrid;
  private world!: WorldConfig;
  private W = 0;
  private H = 0;
  private scale = 1;
  /** 화면에 보이는 맵 폭(내부 px). 세로 화면에서는 맵 일부만 보이고 카메라가 따라간다 */
  private viewW = 0;
  private camX = 0;
  private manualCam = false;
  private camReady = false;
  private raf = 0;
  private last = 0;
  private time = 0;

  private player: Actor;
  private mode: MoveMode = 'walk';
  private arrive: ((ok: boolean) => void) | null = null;
  private equipped: Partial<Record<ItemSlot, string>> = {};
  private jumpT = 0;

  private cats: (Actor & { sitT: number; palette: keyof typeof CAT_PALETTES })[] = [];
  private markers: string[] = [];
  private particles: Particle[] = [];
  private sparkleT = 0;
  private dustT = 0;

  private clean: Record<string, CleanLevel> = {};
  private messSpots: Record<string, TilePoint[]> = {};
  private selected: string | null = null;

  /** 매 프레임 호출. 말풍선·공간 이름표 위치용 */
  onFrame: ((info: FrameInfo) => void) | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    world: WorldConfig,
    startLocation: string,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d not supported');
    this.ctx = ctx;
    this.player = { x: 0, y: 0, path: [], facing: 'down', moving: false, animT: 0 };
    this.setWorld(world);
    const start = world.locations.find((l) => l.id === startLocation) ?? world.locations[0];
    if (start) this.placeAt(start.spot);
    this.resize();
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.arrive?.(false);
  }

  setWorld(world: WorldConfig): void {
    this.world = world;
    this.grid = new TileGrid(world.cols, world.rows, world.locations, world.doors);
    const size = mapPixelSize(world.cols, world.rows);
    this.W = size.w;
    this.H = size.h;
    this.computeMessSpots();
    const catRoom = world.locations.find((l) => l.id === CAT_ROAM[0]);
    if (catRoom && !this.cats.length) {
      const free = this.grid.freeTiles(catRoom).filter((t) => t.x !== catRoom.spot.x || t.y !== catRoom.spot.y);
      (['brown', 'gray'] as const).forEach((palette, i) => {
        const c = tileCenter(free[Math.floor(((i + 1) * free.length) / 3)] ?? catRoom.spot);
        this.cats.push({ ...c, path: [], facing: i ? 'right' : 'left', moving: false, animT: 0, sitT: 1 + i * 2.5, palette });
      });
    }
  }

  setCleanLevels(levels: Record<string, CleanLevel>): void {
    this.clean = levels;
  }

  setEquipped(equipped: Partial<Record<ItemSlot, string>>): void {
    this.equipped = equipped;
  }

  /** 할 일이 있는 공간 위에 빨간 ! 말풍선 */
  setQuestMarkers(locationIds: string[]): void {
    this.markers = locationIds;
  }

  setSelected(locationId: string | null): void {
    this.selected = locationId;
  }

  /** 캐릭터를 해당 공간의 지정 위치로 이동. 도착하면 true, 다른 명령으로 취소되면 false */
  walkTo(locationId: string, mode: MoveMode = 'walk'): Promise<boolean> {
    const loc = this.world.locations.find((l) => l.id === locationId);
    if (!loc) return Promise.resolve(false);
    this.arrive?.(false);
    this.mode = mode;
    this.manualCam = false;
    const from = this.currentTile();
    const path = this.grid.findPath(from, loc.spot);
    return new Promise((resolve) => {
      this.arrive = resolve;
      if (!path) {
        // 길이 막혀 있으면 순간이동
        this.placeAt(loc.spot);
        this.finishMove();
        return;
      }
      this.player.path = path;
      this.player.moving = true;
    });
  }

  /** 퀘스트 완료 시 반짝이 + 점프 */
  celebrate(locationId: string): void {
    const loc = this.world.locations.find((l) => l.id === locationId);
    this.jumpT = 0.6;
    const cx = this.player.x;
    const cy = this.player.y - CHAR_H / 2;
    for (let i = 0; i < 26; i++) {
      const a = (Math.PI * 2 * i) / 26;
      const sp = 30 + Math.random() * 40;
      this.particles.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, life: 1.1, max: 1.1, kind: i % 3 === 0 ? 'star' : 'sparkle', color: i % 2 ? C.yellow : C.white });
    }
    if (loc) {
      const r = loc.rect;
      for (let i = 0; i < 14; i++) {
        this.particles.push({
          x: MAP_OX + (r.x + Math.random() * r.w) * TILE,
          y: MAP_OY + (r.y + Math.random() * r.h) * TILE,
          vx: 0,
          vy: -8,
          life: 0.8 + Math.random() * 0.8,
          max: 1.6,
          kind: 'sparkle',
          color: C.white,
        });
      }
    }
  }

  /** 화면 좌표 → 공간 ID */
  locationAt(clientX: number, clientY: number): string | null {
    const b = this.canvas.getBoundingClientRect();
    const px = ((clientX - b.left) / b.width) * this.viewW + this.camX;
    const py = ((clientY - b.top) / b.height) * this.H;
    const tx = Math.floor((px - MAP_OX) / TILE);
    const ty = Math.floor((py - MAP_OY) / TILE);
    // 윗벽을 눌러도 첫 줄 공간으로 인식
    return this.grid.room(tx, Math.max(0, ty));
  }

  /** 손가락으로 끌어서 맵 둘러보기 (화면 px) */
  pan(dxCss: number): void {
    const cssW = this.canvas.clientWidth || 1;
    this.camX = this.clampCam(this.camX - (dxCss * this.viewW) / cssW);
    this.manualCam = true;
  }

  /** 캐릭터를 다시 따라가기 */
  follow(): void {
    this.manualCam = false;
  }

  resize(): void {
    const cssW = this.canvas.clientWidth || this.W;
    const cssH = this.canvas.clientHeight || this.H;
    const dpr = window.devicePixelRatio || 1;
    this.viewW = Math.max(32, Math.round((this.H * cssW) / cssH));
    this.scale = Math.max(1, Math.round((cssH * dpr) / this.H));
    this.canvas.width = this.viewW * this.scale;
    this.canvas.height = this.H * this.scale;
    this.ctx.imageSmoothingEnabled = false;
    this.camX = this.clampCam(this.camReady ? this.camX : this.player.x - this.viewW / 2);
    this.camReady = true;
  }

  private clampCam(x: number): number {
    if (this.viewW >= this.W) return (this.W - this.viewW) / 2;
    return Math.min(Math.max(0, x), this.W - this.viewW);
  }

  // ───────────────────────── 내부 ─────────────────────────

  private placeAt(t: TilePoint) {
    const c = tileCenter(t);
    this.player.x = c.x;
    this.player.y = c.y;
    this.player.path = [];
    this.player.moving = false;
  }

  private currentTile(): TilePoint {
    return { x: Math.floor((this.player.x - MAP_OX) / TILE), y: Math.floor((this.player.y - MAP_OY) / TILE) };
  }

  private finishMove() {
    const p = this.player;
    p.moving = false;
    const t = this.currentTile();
    // 바로 위에 가구가 있으면 가구를 바라본다 (설거지하는 느낌)
    p.facing = this.grid.inBounds(t.x, t.y - 1) && this.grid.blocked[(t.y - 1) * this.grid.cols + t.x] ? 'up' : 'down';
    const cb = this.arrive;
    this.arrive = null;
    cb?.(true);
  }

  private computeMessSpots() {
    this.messSpots = {};
    const doorTiles = new Set(this.world.doors.flatMap((d) => [`${d.a.x},${d.a.y}`, `${d.b.x},${d.b.y}`]));
    for (const loc of this.world.locations) {
      const rnd = seeded(loc.id);
      const free = this.grid
        .freeTiles(loc)
        .filter((t) => !(t.x === loc.spot.x && t.y === loc.spot.y) && !doorTiles.has(`${t.x},${t.y}`));
      for (let i = free.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [free[i], free[j]] = [free[j], free[i]];
      }
      this.messSpots[loc.id] = free.slice(0, MESS_COUNT[3]);
    }
  }

  private loop = (ts: number) => {
    const dt = Math.min(0.05, this.last ? (ts - this.last) / 1000 : 0);
    this.last = ts;
    this.time = ts;
    this.update(dt);
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  };

  private stepActor(a: Actor, speed: number, dt: number): boolean {
    if (!a.path.length) return false;
    const target = tileCenter(a.path[0]);
    const dx = target.x - a.x;
    const dy = target.y - a.y;
    const dist = Math.hypot(dx, dy);
    const step = speed * dt;
    if (Math.abs(dx) > Math.abs(dy)) a.facing = dx > 0 ? 'right' : 'left';
    else if (dist > 0.01) a.facing = dy > 0 ? 'down' : 'up';
    if (dist <= step) {
      a.x = target.x;
      a.y = target.y;
      a.path.shift();
      return a.path.length === 0;
    }
    a.x += (dx / dist) * step;
    a.y += (dy / dist) * step;
    return false;
  }

  private update(dt: number) {
    const p = this.player;
    if (p.moving) {
      const speed = this.mode === 'dash' ? DASH_SPEED : WALK_SPEED;
      p.animT += dt * (this.mode === 'dash' ? 16 : 8);
      if (this.mode === 'dash') {
        this.dustT -= dt;
        if (this.dustT <= 0) {
          this.dustT = 0.03;
          this.particles.push({ x: p.x + (Math.random() * 6 - 3), y: p.y - 1, vx: Math.random() * 10 - 5, vy: -6, life: 0.45, max: 0.45, kind: 'dust', color: C.white });
        }
      }
      if (this.stepActor(p, speed, dt)) this.finishMove();
    } else {
      p.animT = 0;
    }
    if (this.jumpT > 0) this.jumpT = Math.max(0, this.jumpT - dt);
    if (!this.manualCam) {
      const target = this.clampCam(p.x - this.viewW / 2);
      this.camX += (target - this.camX) * Math.min(1, dt * (this.mode === 'dash' && p.moving ? 8 : 4));
    }

    for (const cat of this.cats) this.updateCat(cat, dt);

    // 깨끗한 공간에서 반짝반짝
    this.sparkleT -= dt;
    if (this.sparkleT <= 0) {
      this.sparkleT = 0.35;
      const cleanRooms = this.world.locations.filter((l) => (this.clean[l.id] ?? 0) === 0);
      if (cleanRooms.length) {
        const l = cleanRooms[Math.floor(Math.random() * cleanRooms.length)];
        this.particles.push({
          x: MAP_OX + (l.rect.x + Math.random() * l.rect.w) * TILE,
          y: MAP_OY + (l.rect.y + Math.random() * l.rect.h) * TILE,
          vx: 0,
          vy: -3,
          life: 0.9,
          max: 0.9,
          kind: 'sparkle',
          color: C.white,
        });
      }
    }

    for (const pt of this.particles) {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.94;
      pt.vy = pt.vy * 0.94 + (pt.kind === 'heart' ? -4 : 0) * dt;
      pt.life -= dt;
    }
    this.particles = this.particles.filter((pt) => pt.life > 0);
  }

  private updateCat(cat: Actor & { sitT: number }, dt: number) {
    if (cat.moving) {
      cat.animT += dt * 6;
      if (this.stepActor(cat, CAT_SPEED, dt)) {
        cat.moving = false;
        cat.sitT = 2 + Math.random() * 4;
      }
      return;
    }
    cat.sitT -= dt;
    if ((this.clean[CAT_ROAM[0]] ?? 0) === 0 && Math.random() < dt * 0.25) {
      this.particles.push({ x: cat.x, y: cat.y - 12, vx: 0, vy: -10, life: 1.2, max: 1.2, kind: 'heart', color: C.pink });
    }
    if (cat.sitT > 0) return;
    const rooms = this.world.locations.filter((l) => CAT_ROAM.includes(l.id));
    const room = rooms[Math.floor(Math.random() * rooms.length)];
    const tiles = this.grid.freeTiles(room);
    const goal = tiles[Math.floor(Math.random() * tiles.length)];
    const from = { x: Math.floor((cat.x - MAP_OX) / TILE), y: Math.floor((cat.y - MAP_OY) / TILE) };
    const path = goal ? this.grid.findPath(from, goal) : null;
    if (path && path.length > 1) {
      cat.path = path;
      cat.moving = true;
    } else {
      cat.sitT = 2;
    }
  }

  // ───────────────────────── 그리기 ─────────────────────────

  private render() {
    const ctx = this.ctx;
    const t = this.time;
    const cam = Math.round(this.camX);
    ctx.setTransform(this.scale, 0, 0, this.scale, -cam * this.scale, 0);
    ctx.imageSmoothingEnabled = false;
    rect(ctx, cam - 1, 0, this.viewW + 2, this.H, C.outside);

    this.drawTopWall(t);
    for (const loc of this.world.locations) this.drawFloor(loc);
    for (const loc of this.world.locations) for (const f of loc.furniture) if (isFlat(f.kind)) drawFurniture(ctx, f, MAP_OX, MAP_OY, t);
    for (const loc of this.world.locations) this.drawMessFor(loc);
    this.drawWalls();

    // y 정렬해서 가구·캐릭터를 그린다 (앞에 있는 것이 위에)
    type Item = { y: number; draw: () => void };
    const items: Item[] = [];
    for (const loc of this.world.locations) {
      for (const f of loc.furniture) {
        if (isFlat(f.kind)) continue;
        items.push({ y: MAP_OY + (f.y + f.h) * TILE - (f.walkable ? 8 : 1), draw: () => drawFurniture(ctx, f, MAP_OX, MAP_OY, t) });
      }
    }
    const p = this.player;
    items.push({ y: p.y, draw: () => this.drawPlayer() });
    for (const cat of this.cats) items.push({ y: cat.y, draw: () => this.drawCat(cat) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();

    this.drawSelection(t);
    this.drawMarkers(t);
    this.drawRoomEffects(t);
    this.drawParticles();

    this.drawOuterWall();

    if (this.onFrame) {
      const jump = this.jumpOffset();
      this.onFrame({
        head: { x: (p.x - this.camX) / this.viewW, y: (p.y - CHAR_H - 2 - jump) / this.H },
        camOffset: this.camX / this.W,
        camView: this.viewW / this.W,
      });
    }
  }

  private jumpOffset() {
    if (this.jumpT <= 0) return 0;
    const k = this.jumpT / 0.6;
    return Math.round(Math.abs(Math.sin(k * Math.PI * 2)) * 6);
  }

  private drawTopWall(t: number) {
    const ctx = this.ctx;
    const w = this.world.cols * TILE;
    rect(ctx, MAP_OX, 2, w, MAP_OY - 2, C.wallFace);
    for (let x = MAP_OX + 4; x < MAP_OX + w; x += 8) rect(ctx, x, 5, 1, MAP_OY - 8, C.wallFaceDark);
    rect(ctx, MAP_OX, MAP_OY - 3, w, 3, C.wallTrim);
    rect(ctx, MAP_OX, 2, w, 2, C.wallTop);
    // 창문 (낮/밤 하늘)
    const hour = new Date().getHours();
    const sky = hour >= 7 && hour < 18 ? '#bfe6ff' : hour >= 18 && hour < 20 ? '#ffb88a' : '#4b4f8f';
    for (const wx of (this.world.windows ?? [5, 9]).map((x) => x * TILE)) {
      box(ctx, MAP_OX + wx, 5, 22, 12, sky, C.outline);
      rect(ctx, MAP_OX + wx + 10, 6, 1, 10, C.outline);
      rect(ctx, MAP_OX + wx + 2, 7, 3, 1, '#ffffff');
      if (sky === '#4b4f8f') rect(ctx, MAP_OX + wx + 15, 8, 2, 2, C.yellow);
    }
    // 벽시계
    const cx = MAP_OX + 3 * TILE + 2;
    box(ctx, cx, 6, 9, 9, C.white, C.outline);
    const sec = Math.floor(t / 1000) % 4;
    rect(ctx, cx + 4, 8, 1, 3, C.outline);
    rect(ctx, cx + 4 + (sec % 2), 10, 2, 1, C.red);
  }

  private drawFloor(loc: HouseLocation) {
    const ctx = this.ctx;
    const r = loc.rect;
    const x0 = MAP_OX + r.x * TILE;
    const y0 = MAP_OY + r.y * TILE;
    for (let ty = 0; ty < r.h; ty++) {
      for (let tx = 0; tx < r.w; tx++) {
        const x = x0 + tx * TILE;
        const y = y0 + ty * TILE;
        switch (loc.floor) {
          case 'wood':
            rect(ctx, x, y, TILE, TILE, (ty % 2 === 0) !== (tx % 2 === 0) ? C.woodLight : '#d49b5f');
            rect(ctx, x, y + 15, TILE, 1, C.woodMid);
            rect(ctx, x + ((ty * 7) % 16), y, 1, 15, C.woodMid);
            break;
          case 'tile':
            rect(ctx, x, y, TILE, TILE, (tx + ty) % 2 === 0 ? C.tileA : C.tileB);
            rect(ctx, x, y, TILE, 1, '#d8c6a6');
            rect(ctx, x, y, 1, TILE, '#d8c6a6');
            break;
          case 'blueTile':
            rect(ctx, x, y, TILE, TILE, C.bathA);
            rect(ctx, x, y, TILE, 1, C.bathB);
            rect(ctx, x, y, 1, TILE, C.bathB);
            rect(ctx, x + 8, y, 1, TILE, C.bathB);
            rect(ctx, x, y + 8, TILE, 1, C.bathB);
            break;
          case 'carpet':
            rect(ctx, x, y, TILE, TILE, C.carpet);
            rect(ctx, x + 4, y + 4, 1, 1, C.carpetDot);
            rect(ctx, x + 12, y + 11, 1, 1, C.carpetDot);
            break;
          case 'mint':
            rect(ctx, x, y, TILE, TILE, C.mint);
            if ((tx + ty) % 2 === 0) {
              // 발바닥 무늬
              rect(ctx, x + 6, y + 8, 4, 3, C.mintDot);
              rect(ctx, x + 5, y + 6, 1, 1, C.mintDot);
              rect(ctx, x + 7, y + 5, 2, 1, C.mintDot);
              rect(ctx, x + 10, y + 6, 1, 1, C.mintDot);
            }
            break;
        }
      }
    }
    const level = this.clean[loc.id] ?? 0;
    if (level >= 2) rect(ctx, x0, y0, r.w * TILE, r.h * TILE, level === 3 ? 'rgba(90, 70, 40, 0.18)' : 'rgba(90, 70, 40, 0.08)');
  }

  private drawMessFor(loc: HouseLocation) {
    const level = this.clean[loc.id] ?? 0;
    if (!level) return;
    const spots = this.messSpots[loc.id] ?? [];
    const n = Math.min(spots.length, MESS_COUNT[level]);
    for (let i = 0; i < n; i++) {
      const s = spots[i];
      const x = MAP_OX + s.x * TILE;
      const y = MAP_OY + s.y * TILE;
      if (level === 3 && i === n - 1) trashBag(this.ctx, x, y);
      else drawMess(this.ctx, loc.messKind, i, x, y);
    }
  }

  private drawRoomEffects(t: number) {
    for (const loc of this.world.locations) {
      const level = this.clean[loc.id] ?? 0;
      if (level < 2) continue;
      const spots = this.messSpots[loc.id] ?? [];
      const flies = level === 3 ? 3 : 1;
      for (let i = 0; i < flies && i < spots.length; i++) {
        const s = spots[i];
        const a = t / 400 + i * 2.1;
        drawFly(this.ctx, MAP_OX + s.x * TILE + 8 + Math.cos(a) * 6, MAP_OY + s.y * TILE + 2 + Math.sin(a * 1.7) * 4, t);
      }
      if (level === 3 && spots[1]) drawStink(this.ctx, MAP_OX + spots[1].x * TILE + 5, MAP_OY + spots[1].y * TILE + 4, t);
    }
  }

  /** 벽으로 나뉜 방(room) 사이에만 두꺼운 벽을 그린다. 문 자리는 비워 둔다 */
  private drawWalls() {
    const ctx = this.ctx;
    const g = this.grid;
    for (let y = 0; y < g.rows; y++) {
      for (let x = 0; x < g.cols; x++) {
        const here = g.phys(x, y);
        if (x + 1 < g.cols && g.phys(x + 1, y) !== here && !g.isDoor({ x, y }, { x: x + 1, y })) {
          const px = MAP_OX + (x + 1) * TILE;
          const py = MAP_OY + y * TILE;
          // 맨 윗줄은 윗벽까지 칸막이를 이어 그린다
          const top = y === 0 ? 2 : py - 3;
          rect(ctx, px - 3, top, 6, py + TILE + 3 - top, C.wall);
          rect(ctx, px - 2, top, 1, py + TILE + 3 - top, C.wallCap);
        }
        if (y + 1 < g.rows && g.phys(x, y + 1) !== here && !g.isDoor({ x, y }, { x, y: y + 1 })) {
          const px = MAP_OX + x * TILE;
          const py = MAP_OY + (y + 1) * TILE;
          rect(ctx, px - 3, py - 4, TILE + 6, 5, C.wall);
          rect(ctx, px - 3, py - 4, TILE + 6, 1, C.wallCap);
          rect(ctx, px - 3, py + 1, TILE + 6, 2, C.wallShade);
        }
      }
    }
  }

  private drawOuterWall() {
    const ctx = this.ctx;
    const w = this.world.cols * TILE;
    const bottom = MAP_OY + this.world.rows * TILE;
    rect(ctx, MAP_OX - 4, 0, 4, bottom + 4, C.wall);
    rect(ctx, MAP_OX + w, 0, 4, bottom + 4, C.wall);
    rect(ctx, MAP_OX - 4, 0, w + 8, 3, C.wall);
    rect(ctx, MAP_OX - 4, bottom, w + 8, 4, C.wall);
    rect(ctx, MAP_OX - 4, bottom + 4, w + 8, 2, C.wallShade);
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;
    const jump = this.jumpOffset();
    rect(ctx, p.x - 5, p.y - 1, 10, 2, C.shadow);
    const frame = p.moving ? 1 + (Math.floor(p.animT) % 2) : 0;
    const bob = p.moving && Math.floor(p.animT) % 2 === 1 ? 1 : 0;
    const sx = Math.round(p.x - CHAR_W / 2);
    const sy = Math.round(p.y - CHAR_H + 1 - bob - jump);
    drawCharacter(ctx, sx, sy, p.facing, frame, this.equipped);
    if (this.equipped.extra === 'sparkle') {
      const k = Math.floor(this.time / 150) % 4;
      const pts = [
        [-3, 4],
        [CHAR_W + 1, 8],
        [-2, 16],
        [CHAR_W, 18],
      ];
      for (let i = 0; i < pts.length; i++) {
        if ((i + k) % 2) continue;
        this.drawSparkle(sx + pts[i][0], sy + pts[i][1], C.yellow);
      }
    }
  }

  private drawCat(cat: Actor & { palette: keyof typeof CAT_PALETTES }) {
    const ctx = this.ctx;
    rect(ctx, cat.x - 5, cat.y - 1, 10, 2, C.shadow);
    const flip = cat.facing === 'right';
    const rows = cat.moving ? CAT_FRAMES.walk[Math.floor(cat.animT) % 2] : CAT_FRAMES.sit;
    sprite(ctx, rows, CAT_PALETTES[cat.palette], Math.round(cat.x - 6), Math.round(cat.y - 10), flip);
  }

  private drawSelection(t: number) {
    if (!this.selected) return;
    const loc = this.world.locations.find((l) => l.id === this.selected);
    if (!loc) return;
    const ctx = this.ctx;
    const r = loc.rect;
    const on = Math.floor(t / 250) % 2 === 0;
    ctx.fillStyle = on ? C.yellow : '#fff3b0';
    const x0 = MAP_OX + r.x * TILE + 1;
    const y0 = MAP_OY + r.y * TILE + 1;
    const w = r.w * TILE - 2;
    const h = r.h * TILE - 2;
    const dash = 4;
    const off = Math.floor(t / 120) % (dash * 2);
    for (let i = -off; i < w; i += dash * 2) {
      const a = Math.max(0, i);
      const b = Math.min(w, i + dash);
      if (b > a) {
        ctx.fillRect(x0 + a, y0, b - a, 2);
        ctx.fillRect(x0 + w - b, y0 + h - 2, b - a, 2);
      }
    }
    for (let i = -off; i < h; i += dash * 2) {
      const a = Math.max(0, i);
      const b = Math.min(h, i + dash);
      if (b > a) {
        ctx.fillRect(x0 + w - 2, y0 + a, 2, b - a);
        ctx.fillRect(x0, y0 + h - b, 2, b - a);
      }
    }
  }

  /** 빨간 말풍선 + 하얀 ! (공간의 서는 자리 위, 통통 튄다) */
  private drawMarkers(t: number) {
    const ctx = this.ctx;
    for (const id of this.markers) {
      // 지금 가 있는 공간은 말풍선 안내가 대신 뜨므로 생략
      if (id === this.selected) continue;
      const loc = this.world.locations.find((l) => l.id === id);
      if (!loc) continue;
      const bob = Math.floor(t / 300 + loc.spot.x) % 2;
      const x = MAP_OX + loc.spot.x * TILE + 4;
      // 캐릭터가 그 자리에 서 있어도 머리 위에 보이도록 충분히 위로 띄운다
      const y = MAP_OY + loc.spot.y * TILE - 27 - bob;
      box(ctx, x, y, 9, 10, '#e5483f', C.outline);
      rect(ctx, x + 1, y + 1, 7, 1, '#f27a6f');
      rect(ctx, x + 4, y + 2, 1, 4, C.white);
      rect(ctx, x + 4, y + 7, 1, 1, C.white);
      // 말풍선 꼬리
      rect(ctx, x + 3, y + 10, 3, 1, C.outline);
      rect(ctx, x + 4, y + 10, 1, 1, '#e5483f');
      rect(ctx, x + 4, y + 11, 1, 1, C.outline);
    }
  }

  private drawSparkle(x: number, y: number, color: string) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y) - 1, 1, 3);
    ctx.fillRect(Math.round(x) - 1, Math.round(y), 3, 1);
  }

  private drawParticles() {
    const ctx = this.ctx;
    for (const pt of this.particles) {
      const k = pt.life / pt.max;
      const x = Math.round(pt.x);
      const y = Math.round(pt.y);
      switch (pt.kind) {
        case 'dust': {
          const s = k > 0.5 ? 3 : 2;
          ctx.fillStyle = `rgba(255,255,255,${0.4 + k * 0.6})`;
          ctx.fillRect(x - 1, y - 1, s, s);
          break;
        }
        case 'sparkle':
          if (k > 0.5 || Math.floor(pt.life * 20) % 2 === 0) this.drawSparkle(x, y, pt.color);
          break;
        case 'star':
          ctx.fillStyle = pt.color;
          ctx.fillRect(x - 1, y - 2, 3, 5);
          ctx.fillRect(x - 2, y - 1, 5, 3);
          ctx.fillStyle = C.white;
          ctx.fillRect(x, y, 1, 1);
          break;
        case 'heart':
          ctx.fillStyle = pt.color;
          ctx.fillRect(x - 2, y, 2, 2);
          ctx.fillRect(x + 1, y, 2, 2);
          ctx.fillRect(x - 2, y + 1, 5, 2);
          ctx.fillRect(x - 1, y + 3, 3, 1);
          ctx.fillRect(x, y + 4, 1, 1);
          break;
      }
    }
  }
}
