import type { CleanLevel, GameData, HouseLocation, Quest } from '../core/types';
import { CLEAN_BADGES, CLEAN_LABELS, daysUntilDue, questStatus } from '../core/quests';
import { timeLabel } from './QuestPanel';

interface Props {
  data: GameData;
  now: number;
  location: HouseLocation;
  level: CleanLevel;
  onComplete(q: Quest): void;
  onAdd(): void;
  onClose(): void;
}

const ORDER = { due: 0, upcoming: 1, done: 2 } as const;

/** NFC 인식 후 열리는 "오늘의 OO 퀘스트" 창 */
export function RoomSheet({ data, now, location, level, onComplete, onAdd, onClose }: Props) {
  const quests = data.quests
    .filter((q) => q.location === location.id)
    .sort((a, b) => ORDER[questStatus(a, now)] - ORDER[questStatus(b, now)]);
  const headIcon = quests.find((q) => questStatus(q, now) === 'due')?.icon ?? location.emoji;

  return (
    <div className="room-sheet pixel-box pop-in">
      <div className="room-sheet-head">
        <h2>
          {headIcon} 오늘의 {location.name} 퀘스트
        </h2>
        <button className="icon-btn" onClick={onClose} aria-label="닫기">
          ✕
        </button>
      </div>
      <p className={`room-state lv${level}`}>
        {CLEAN_BADGES[level]} 지금 {location.name}: <b>{CLEAN_LABELS[level]}</b>
      </p>
      <ul className="room-quests">
        {quests.map((q) => {
          const st = questStatus(q, now);
          return (
            <li key={q.id} className={`room-quest ${st}`}>
              <span className="quest-icon">{q.icon}</span>
              <span className="quest-text">
                <span className="quest-title">{q.title}</span>
                <span className="quest-meta">
                  {timeLabel(q)} · +{q.xp}XP{st === 'upcoming' ? ` · D-${daysUntilDue(q, now)}` : ''}
                </span>
              </span>
              {st === 'done' ? (
                <span className="done-stamp">CLEAR!</span>
              ) : (
                <button className={`btn ${st === 'due' ? 'primary' : ''}`} onClick={() => onComplete(q)}>
                  {st === 'due' ? '완료!' : '미리 하기'}
                </button>
              )}
            </li>
          );
        })}
        {quests.length === 0 && <li className="empty">이 공간에는 아직 퀘스트가 없어요</li>}
      </ul>
      <button className="btn ghost wide" onClick={onAdd}>
        + 이 공간에 퀘스트 추가
      </button>
    </div>
  );
}
