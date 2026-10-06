import { useState } from 'react';
import type { GameData, Quest } from '../core/types';
import { allQuestsSorted, daysUntilDue, questStatus, todaysQuests } from '../core/quests';
import { plannedIds } from '../core/game';
import { repeatLabel, TIME_SLOT_LABELS, DIARY_POINTS } from '../data/options';
import { dateKey } from '../core/time';

interface Props {
  data: GameData;
  now: number;
  onGo(quest: Quest): void;
  onEdit(quest: Quest): void;
  onAdd(): void;
  onDiary(): void;
  onPlan(quest: Quest): void;
  onUnplan(quest: Quest): void;
}

export function timeLabel(q: Quest): string {
  return q.time.slot === 'specific' && q.time.at ? q.time.at : TIME_SLOT_LABELS[q.time.slot];
}

interface RowProps {
  q: Quest;
  data: GameData;
  now: number;
  onGo?(): void;
  onEdit?(): void;
  /** 전체 할 일에서: 오늘 하기 버튼 */
  plan?: { planned: boolean; onPlan(): void };
  /** 오늘의 퀘스트에서: X 로 빼기 */
  onRemove?(): void;
}

export function QuestRow({ q, data, now, onGo, onEdit, plan, onRemove }: RowProps) {
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
          {status === 'due' && plan && <span className="quest-status due">할 차례</span>}
          {status === 'upcoming' && <span className="quest-status">D-{left}</span>}
        </span>
      </button>
      {plan &&
        status !== 'done' &&
        (plan.planned ? (
          <span className="plan-badge" aria-label="오늘 할 일에 들어 있음">
            ✓ 오늘
          </span>
        ) : (
          <button className="plan-btn" onClick={plan.onPlan}>
            오늘 하기
          </button>
        ))}
      {onRemove && status !== 'done' && (
        <button className="icon-btn small remove-btn" onClick={onRemove} aria-label={`${q.title} 오늘 할 일에서 빼기`}>
          ✕
        </button>
      )}
      {onEdit && (
        <button className="icon-btn small" onClick={onEdit} aria-label={`${q.title} 수정`}>
          ✏️
        </button>
      )}
    </li>
  );
}

export function QuestPanel({ data, now, onGo, onEdit, onAdd, onDiary, onPlan, onUnplan }: Props) {
  const planned = plannedIds(data, now);
  const today = todaysQuests(data.quests, planned, now);
  const [view, setView] = useState<'today' | 'all'>(() => (today.length ? 'today' : 'all'));
  const diaryDone = !!data.diary[dateKey(now)]?.pointsAwarded;
  const remaining = today.filter((q) => questStatus(q, now) !== 'done').length;

  return (
    <section className="quest-panel">
      <div className="panel-head">
        <div className="seg">
          <button className={view === 'today' ? 'on' : ''} onClick={() => setView('today')}>
            TODAY'S QUEST{today.length ? ` ${today.length}` : ''}
          </button>
          <button className={view === 'all' ? 'on' : ''} onClick={() => setView('all')}>
            전체 할 일
          </button>
        </div>
        <button className="add-btn" onClick={onAdd} aria-label="퀘스트 추가">
          +
        </button>
      </div>

      {view === 'today' ? (
        <>
          <p className="panel-hint">
            {today.length === 0
              ? '오늘 할 일을 골라 볼까요?'
              : remaining
                ? `남은 퀘스트 ${remaining}개 · 누르면 그 공간으로 가요 · ✕ 로 빼기`
                : '오늘 퀘스트 끝! 집이 반짝반짝해요 ✨'}
          </p>
          <ul className="quest-list">
            {today.map((q) => (
              <QuestRow key={q.id} q={q} data={data} now={now} onGo={() => onGo(q)} onRemove={() => onUnplan(q)} />
            ))}
            {today.length === 0 && (
              <li className="empty">
                <button className="btn" onClick={() => setView('all')}>
                  📋 전체 할 일에서 고르기
                </button>
              </li>
            )}
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
          </ul>
        </>
      ) : (
        <>
          <p className="panel-hint">'오늘 하기'로 오늘 할 일에 넣어요 · ✏️ 수정</p>
          <ul className="quest-list">
            {allQuestsSorted(data.quests, now).map((q) => (
              <QuestRow
                key={q.id}
                q={q}
                data={data}
                now={now}
                onGo={() => onGo(q)}
                onEdit={() => onEdit(q)}
                plan={{ planned: planned.includes(q.id), onPlan: () => onPlan(q) }}
              />
            ))}
            {data.quests.length === 0 && <li className="empty">아직 퀘스트가 없어요. + 버튼으로 추가해 보세요!</li>}
          </ul>
        </>
      )}
    </section>
  );
}
