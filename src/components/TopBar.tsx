import { levelFor } from '../core/progression';

interface Props {
  xp: number;
  points: number;
  nfcOn: boolean;
  dayOffset: number;
}

export function TopBar({ xp, points, nfcOn, dayOffset }: Props) {
  const lv = levelFor(xp);
  return (
    <header className="topbar">
      <div className="lv-block">
        <div className="lv-line">
          <span className="lv">Lv.{String(lv.level).padStart(2, '0')}</span>
          <span className="lv-title">{lv.title}</span>
        </div>
        <div className="xp-bar" aria-label={`XP ${Math.round(lv.progress * 100)}%`}>
          <div className="xp-fill" style={{ width: `${Math.round(lv.progress * 100)}%` }} />
          <span className="xp-text">{lv.isMax ? 'MAX' : `${lv.xpInLevel}/${lv.xpForNext} XP`}</span>
        </div>
      </div>
      <div className="top-right">
        {dayOffset !== 0 && <span className="chip warn">⏩ {dayOffset > 0 ? `+${dayOffset}` : dayOffset}일</span>}
        {nfcOn && <span className="chip nfc">📡 NFC</span>}
        <span className="chip points">🪙 {points}P</span>
      </div>
    </header>
  );
}
