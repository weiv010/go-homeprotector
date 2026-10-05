import { forwardRef, useEffect, useImperativeHandle, useRef, type ReactNode } from 'react';
import type { CleanLevel, GameData } from '../core/types';
import { CLEAN_BADGES } from '../core/quests';
import { GameEngine, MAP_OX, MAP_OY, mapPixelSize, TILE, type MoveMode } from '../game/engine';
import { START_LOCATION } from '../data/houseMap';

export interface GameViewHandle {
  walkTo(locationId: string, mode?: MoveMode): Promise<boolean>;
  celebrate(locationId: string): void;
}

interface Props {
  data: GameData;
  cleanLevels: Record<string, CleanLevel>;
  selected: string | null;
  onRoomTap(locationId: string): void;
  /** 캐릭터 머리 위 말풍선 */
  bubble?: ReactNode;
  /** 맵 아래쪽에 겹쳐 보이는 조작 버튼 */
  children?: ReactNode;
}

export const GameView = forwardRef<GameViewHandle, Props>(function GameView(
  { data, cleanLevels, selected, onRoomTap, bubble, children },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const { w, h } = mapPixelSize(data.mapSize.cols, data.mapSize.rows);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const engine = new GameEngine(
      canvas,
      { cols: data.mapSize.cols, rows: data.mapSize.rows, locations: data.locations, doors: data.doors },
      START_LOCATION,
    );
    engineRef.current = engine;
    engine.onFrame = (head) => {
      const el = bubbleRef.current;
      if (!el) return;
      el.style.left = `${head.x * 100}%`;
      el.style.top = `${head.y * 100}%`;
      // 말풍선이 맵 밖으로 잘리지 않도록 좌우 위치를 보정하고, 꼬리는 캐릭터를 가리키게 둔다
      const bub = el.firstElementChild as HTMLElement | null;
      if (!bub) return;
      const cw = canvas.clientWidth;
      const bw = bub.offsetWidth;
      const ax = head.x * cw;
      const left = Math.min(Math.max(-bw / 2, 4 - ax), cw - 4 - ax - bw);
      bub.style.left = `${left}px`;
      bub.style.setProperty('--tail', `${-left}px`);
    };
    const ro = new ResizeObserver(() => engine.resize());
    ro.observe(canvas);
    return () => {
      ro.disconnect();
      engine.destroy();
      engineRef.current = null;
    };
    // 엔진은 한 번만 만든다. 이후 변경은 아래 effect 들이 전달한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.setWorld({ cols: data.mapSize.cols, rows: data.mapSize.rows, locations: data.locations, doors: data.doors });
  }, [data.locations, data.doors, data.mapSize]);
  useEffect(() => engineRef.current?.setCleanLevels(cleanLevels), [cleanLevels]);
  useEffect(() => engineRef.current?.setEquipped(data.equipped), [data.equipped]);
  useEffect(() => engineRef.current?.setSelected(selected), [selected]);

  useImperativeHandle(ref, () => ({
    walkTo: (id, mode) => engineRef.current?.walkTo(id, mode) ?? Promise.resolve(false),
    celebrate: (id) => engineRef.current?.celebrate(id),
  }));

  const handlePointer = (e: React.PointerEvent) => {
    const id = engineRef.current?.locationAt(e.clientX, e.clientY);
    if (id) onRoomTap(id);
  };

  return (
    <div className="map-wrap" style={{ aspectRatio: `${w} / ${h}`, width: `min(100%, calc(56dvh * ${w} / ${h}))` }}>
      <canvas ref={canvasRef} className="map-canvas" onPointerDown={handlePointer} />
      {data.locations.map((loc) => {
        const level = cleanLevels[loc.id] ?? 0;
        const left = ((MAP_OX + (loc.rect.x + loc.rect.w / 2) * TILE) / w) * 100;
        const top = ((MAP_OY + (loc.rect.y + loc.rect.h) * TILE - 3) / h) * 100;
        return (
          <div
            key={loc.id}
            className={`room-label lv${level} ${selected === loc.id ? 'selected' : ''}`}
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            {loc.name} <span className="badge">{CLEAN_BADGES[level]}</span>
          </div>
        );
      })}
      <div ref={bubbleRef} className="char-bubble-anchor">
        {bubble && <div className="char-bubble">{bubble}</div>}
      </div>
      {children}
    </div>
  );
});
