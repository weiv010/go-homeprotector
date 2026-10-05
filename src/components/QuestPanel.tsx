import { useState } from 'react';
import type { GameData, Quest } from '../core/types';
import { daysUntilDue, questStatus, todaysQuests } from '../core/quests';
import { repeatLabel, TIME_SLOT_LABELS, DIARY_POINTS } from '../data/options';
import { dateKey } from '../core/time';

interface Props {
  data: GameData;
  now: number;
  onGo(quest: Quest): void;
  onEdit(quest: Quest): void;
  onAdd(): void;
  onDiary(): void;
}

export function timeLabel(q: Quest): string {
  return q.time.slot === 'specific' && q.time.at ? q.time.at : TIME_SLOT_LABELS[q.time.slot];
}

export function QuestRow({ q, data, now, onGo, onEdit }: { q: Quest; data: GameData; now: number; onGo?(): void; onEdit?(): void }) {
  const status = questStatus(q, now);
  const loc = data.locations.find((l) => l.id === q.location);
  const left = daysUntilDue(q, now);
  return (
    <li className={`quest-row ${status}`}>
      <button className="quest-main" onClick={onGo} disabled={!onGo}>
        <span className="quest-icon">{status === 'done' ? '✅' : q.icon}</span>
        <span className="quest-text">
          <span className="quest-title">{q.title}</span>
          <span className="quest-meta">
            {timeLabel(q)} · {loc ? `${loc.emoji} ${loc.name}` : '어딘가'} · {repeatLabel(q.repeatDays)}
          </span>
        </span>
        <span className="quest-right">
          <span className="quest-xp">+{q.xp}XP</span>
          {status === 'done' && <span className="quest-status done">완료!</span>}
          {status === 'upcoming' && <span className="quest-status">D-{left}</span>}
        </span>
      </button>
      {onEdit && (
        <button className="icon-btn small" onClick={onEdit} aria-label={`${q.title} 수정`}>
          ✏️
        </button>
      )}
    </li>
  );
}

export function QuestPanel({ data, now, onGo, onEdit, onAdd, onDiary }: Props) {
  const [view, setView] = useState<'today' | 'all'>('today');
  const list = view === 'today' ? todaysQuests(data.quests, now) : data.quests;
  const diaryDone = !!data.diary[dateKey(now)]?.pointsAwarded;
  const remaining = todaysQuests(data.quests, now).filter((q) => questStatus(q, now) === 'due').length;

  return (
    <section className="quest-panel">
      <div className="panel-head">
        <div className="seg">
          <button className={view === 'today' ? 'on' : ''} onClick={() => setView('today')}>
            TODAY'S QUEST
          </button>
          <button className={view === 'all' ? 'on' : ''} onClick={() => setView('all')}>
            전체
          </button>
        </div>
        <button className="add-btn" onClick={onAdd} aria-label="퀘스트 추가">
          +
        </button>
      </div>
      {view === 'today' && (
        <p className="panel-hint">{remaining ? `남은 퀘스트 ${remaining}개 · 퀘스트를 누르면 그 공간으로 가요` : '오늘 퀘스트 끝! 집이 반짝반짝해요 ✨'}</p>
      )}
      <ul className="quest-list">
        {list.map((q) => (
          <QuestRow key={q.id} q={q} data={data} now={now} onGo={() => onGo(q)} onEdit={() => onEdit(q)} />
        ))}
        {view === 'today' && (
          <li className={`quest-row diary ${diaryDone ? 'done' : 'due'}`}>
            <button className="quest-main" onClick={onDiary}>
              <span className="quest-icon">{diaryDone ? '✅' : '📝'}</span>
              <span className="quest-text">
                <span className="quest-title">하루 일기</span>
                <span className="quest-meta">하루를 마무리하며 짧게 한 줄</span>
              </span>
              <span className="quest-right">
                <span className="quest-xp points">+{DIARY_POINTS}P</span>
                {diaryDone && <span className="quest-status done">완료!</span>}
              </span>
            </button>
          </li>
        )}
        {list.length === 0 && view === 'all' && <li className="empty">아직 퀘스트가 없어요. + 버튼으로 추가해 보세요!</li>}
      </ul>
    </section>
  );
}
