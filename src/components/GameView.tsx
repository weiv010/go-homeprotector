import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import type { CleanLevel, GameData } from '../core/types';
import { CLEAN_BADGES } from '../core/quests';
import { GameEngine, MAP_OX, MAP_OY, mapPixelSize, TILE, type MoveMode } from '../game/engine';
import { HOUSE_MAP, START_LOCATION } from '../data/houseMap';
import { formatRemaining, remainingMs, timersByLocation } from '../core/timers';
import { useNow } from '../useNow';

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

const OVERVIEW_KEY = 'go-homeprotector/overview';

function loadOverview(): boolean {
  try {
    return localStorage.getItem(OVERVIEW_KEY) === '1';
  } catch {
    return false;
  }
}

export const GameView = forwardRef<GameViewHandle, Props>(function GameView(
  { data, cleanLevels, selected, onRoomTap, bubble, children },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const [overview, setOverview] = useState(loadOverview);
  const { w, h } = mapPixelSize(data.mapSize.cols, data.mapSize.rows);
  const tick = useNow(data.timers.length > 0);
  const roomTimers = timersByLocation(data.timers, tick);

  const world = () => ({
    cols: data.mapSize.cols,
    rows: data.mapSize.rows,
    locations: data.locations,
    doors: data.doors,
    windows: HOUSE_MAP.windows,
  });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const engine = new GameEngine(canvas, world(), START_LOCATION);
    engineRef.current = engine;
    engine.onFrame = ({ head, camOffset, camView }) => {
      // 공간 이름표 레이어를 카메라와 같이 움직인다
      const layer = layerRef.current;
      if (layer) {
        layer.style.width = `${100 / camView}%`;
        layer.style.left = `${(-camOffset / camView) * 100}%`;
      }
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
    engineRef.current?.setWorld(world());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.locations, data.doors, data.mapSize]);
  useEffect(() => engineRef.current?.setCleanLevels(cleanLevels), [cleanLevels]);
  useEffect(() => engineRef.current?.setEquipped(data.equipped), [data.equipped]);
  useEffect(() => engineRef.current?.setSelected(selected), [selected]);

  useImperativeHandle(ref, () => ({
    walkTo: (id, mode) => engineRef.current?.walkTo(id, mode) ?? Promise.resolve(false),
    celebrate: (id) => engineRef.current?.celebrate(id),
  }));

  // 탭하면 공간 선택, 옆으로 끌면 맵 둘러보기
  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < 8) return;
    if (!d.moved) (e.target as Element).setPointerCapture?.(e.pointerId);
    d.moved = true;
    engineRef.current?.pan(dx);
    d.x = e.clientX;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.moved) return;
    const id = engineRef.current?.locationAt(e.clientX, e.clientY);
    if (id) onRoomTap(id);
  };

  const toggleOverview = () => {
    const next = !overview;
    setOverview(next);
    engineRef.current?.follow();
    try {
      localStorage.setItem(OVERVIEW_KEY, next ? '1' : '0');
    } catch {
      /* noop */
    }
  };

  return (
    <div
      className={`map-wrap ${overview ? 'overview' : 'follow'}`}
      style={overview ? { aspectRatio: `${w} / ${h}` } : { height: `min(54dvh, calc(100vw * ${h} / ${w} * 1.9))` }}
    >
      <canvas
        ref={canvasRef}
        className="map-canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (drag.current = null)}
      />
      <div className="label-clip">
        <div ref={layerRef} className="label-layer">
          {data.locations.map((loc) => {
            const level = cleanLevels[loc.id] ?? 0;
            const lx = loc.label?.x ?? loc.rect.x + loc.rect.w / 2;
            const ly = loc.label?.y ?? loc.rect.y + loc.rect.h;
            const left = ((MAP_OX + lx * TILE) / w) * 100;
            const top = ((MAP_OY + ly * TILE - 4) / h) * 100;
            return (
              <div
                key={loc.id}
                className={`room-label lv${level} ${selected === loc.id ? 'selected' : ''}`}
                style={{ left: `${left}%`, top: `${top}%` }}
              >
                {roomTimers[loc.id] && <RoomTimerChip {...roomTimers[loc.id]} now={tick} />}
                {loc.nfcId && <span className="nfc-dot" title="NFC">🐾</span>}
                {loc.name} <span className="badge">{CLEAN_BADGES[level]}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div ref={bubbleRef} className="char-bubble-anchor">
        {bubble && <div className="char-bubble">{bubble}</div>}
      </div>
      <button className="map-zoom" onClick={toggleOverview} aria-label={overview ? '확대해서 보기' : '집 전체 보기'}>
        {overview ? '🔎' : '🏠'}
      </button>
      {children}
    </div>
  );
});

/** 공간 이름표 위에 뜨는 타이머 */
function RoomTimerChip({ timer, count, now }: { timer: { startedAt: number; durationMs: number; questId: string; location: string }; count: number; now: number }) {
  const left = remainingMs(timer, now);
  return (
    <span className={`room-timer ${left === 0 ? 'done' : ''}`}>
      {left === 0 ? '⏰ 완료!' : `⏳ ${formatRemaining(left)}`}
      {count > 1 && <small> +{count - 1}</small>}
    </span>
  );
}
