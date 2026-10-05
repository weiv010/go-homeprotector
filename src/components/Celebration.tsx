import { useEffect, useRef } from 'react';
import type { GameEvent } from '../core/types';
import { findItem } from '../data/shopItems';

/** 화면 녹화했을 때 잘 보이도록 크게 띄우는 연출 */
export type Celebration = GameEvent | { type: 'nfc'; locationName: string; source: string };

const DURATION: Record<Celebration['type'], number> = {
  nfc: 1500,
  questComplete: 2600,
  levelUp: 3200,
  newItem: 2600,
  diarySaved: 2200,
};

export function CelebrationOverlay({ item, onDone }: { item: Celebration; onDone(): void }) {
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const id = window.setTimeout(() => done.current(), DURATION[item.type]);
    return () => window.clearTimeout(id);
  }, [item]);

  return (
    <div className={`celebrate ${item.type}`} onPointerDown={onDone}>
      <div className="confetti" aria-hidden>
        {Array.from({ length: 18 }, (_, i) => (
          <i key={i} style={{ '--i': i } as React.CSSProperties} />
        ))}
      </div>
      <div className="celebrate-card pop-in">{renderBody(item)}</div>
    </div>
  );
}

function renderBody(item: Celebration) {
  switch (item.type) {
    case 'nfc':
      return (
        <>
          <div className="big-title blink">📱 NFC DETECTED!</div>
          <div className="dash-run">
            🏃<span className="dash-1">💨</span>
            <span className="dash-2">💨</span>
          </div>
          <div className="sub">{item.locationName}(으)로 출동!</div>
        </>
      );
    case 'questComplete':
      return (
        <>
          <div className="big-title">QUEST COMPLETE!</div>
          <div className="quest-name">
            {item.icon} {item.questTitle}
          </div>
          <div className="gain xp">+{item.xp} XP</div>
          {item.homeClean && <div className="home-clean">✨ HOME CLEAN! ✨</div>}
        </>
      );
    case 'levelUp':
      return (
        <>
          <div className="big-title rainbow">LEVEL UP!</div>
          <div className="lv-big">Lv.{String(item.level).padStart(2, '0')}</div>
          <div className="quest-name">{item.title}</div>
        </>
      );
    case 'newItem': {
      const it = findItem(item.itemId);
      return (
        <>
          <div className="big-title">NEW ITEM!</div>
          <div className="item-big bounce">{it?.emoji}</div>
          <div className="quest-name">{it?.name}</div>
          <div className="sub">바로 장착했어요!</div>
        </>
      );
    }
    case 'diarySaved':
      return (
        <>
          <div className="big-title">DIARY SAVED!</div>
          <div className="item-big">📝</div>
          <div className="gain points">+{item.points}P</div>
        </>
      );
  }
}
