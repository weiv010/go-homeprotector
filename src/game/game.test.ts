import { describe, expect, it } from 'vitest';
import { HOUSE_MAP } from '../data/houseMap';
import { parseTagPayload } from '../nfc/nfc';
import { TileGrid } from './pathfinding';
import { CAT_FRAMES, CHAR_H, CHAR_W, CHARACTER_FRAMES } from './sprites';

describe('집 맵', () => {
  const grid = new TileGrid(HOUSE_MAP.cols, HOUSE_MAP.rows, HOUSE_MAP.locations, HOUSE_MAP.doors);

  it('모든 공간의 서는 위치는 걸을 수 있는 칸이다', () => {
    for (const l of HOUSE_MAP.locations) expect(grid.isWalkable(l.spot.x, l.spot.y), l.id).toBe(true);
  });

  it('모든 공간끼리 서로 걸어서 갈 수 있다', () => {
    for (const a of HOUSE_MAP.locations)
      for (const b of HOUSE_MAP.locations) expect(grid.findPath(a.spot, b.spot), `${a.id}→${b.id}`).not.toBeNull();
  });

  it('문은 서로 다른 공간을 잇는다', () => {
    for (const d of HOUSE_MAP.doors) {
      expect(Math.abs(d.a.x - d.b.x) + Math.abs(d.a.y - d.b.y)).toBe(1);
      expect(grid.room(d.a.x, d.a.y)).not.toBe(grid.room(d.b.x, d.b.y));
    }
  });

  it('NFC ID 는 겹치지 않는다', () => {
    const ids = HOUSE_MAP.locations.map((l) => l.nfcId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('도트 스프라이트', () => {
  it('캐릭터 프레임 크기가 일정하다', () => {
    for (const frames of Object.values(CHARACTER_FRAMES))
      for (const f of frames) {
        expect(f.length).toBe(CHAR_H);
        for (const row of f) expect(row.length).toBe(CHAR_W);
      }
  });
  it('고양이 프레임 크기가 일정하다', () => {
    for (const f of [...CAT_FRAMES.walk, CAT_FRAMES.sit]) for (const row of f) expect(row.length).toBe(12);
  });
});

describe('NFC 태그 해석', () => {
  it('텍스트 / URL 모두 NFC ID 로 바꾼다', () => {
    expect(parseTagPayload('kitchen_nfc')).toBe('kitchen_nfc');
    expect(parseTagPayload('https://example.com/app/?tag=desk_nfc')).toBe('desk_nfc');
    expect(parseTagPayload('hello world')).toBeNull();
  });
});
