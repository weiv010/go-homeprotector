import { useEffect, useState } from 'react';
import type { GameData } from '../core/types';
import { completionsOn } from '../core/quests';
import { dateKey, formatDateLabel } from '../core/time';
import { DIARY_POINTS } from '../data/options';

interface Props {
  data: GameData;
  now: number;
  onSaveDiary(text: string): void;
}

/** 📖 RECORD + 📝 DIARY */
export function RecordScreen({ data, now, onSaveDiary }: Props) {
  const today = dateKey(now);
  const entry = data.diary[today];
  const [text, setText] = useState(entry?.text ?? '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setText(data.diary[today]?.text ?? '');
    // 날짜가 바뀌었을 때만 다시 불러온다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  const todayDone = completionsOn(data, today);
  const todayXp = todayDone.reduce((s, h) => s + h.xp, 0);
  const todayP = entry?.pointsAwarded ?? 0;

  // 과거 기록: 완료 기록이나 일기가 있는 날짜들
  const days = Array.from(new Set([...data.history.map((h) => dateKey(h.at)), ...Object.keys(data.diary)]))
    .filter((d) => d !== today && d < today)
    .sort()
    .reverse();

  const save = () => {
    onSaveDiary(text);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="screen">
      <section className="card pixel-box">
        <h2>📖 RECORD</h2>
        <p className="muted">{formatDateLabel(today)} · 오늘</p>
        <div className="stats">
          <div className="stat">
            <span className="stat-num">{todayDone.length}</span>
            <span className="stat-label">완료 퀘스트</span>
          </div>
          <div className="stat">
            <span className="stat-num xp">+{todayXp}</span>
            <span className="stat-label">획득 XP</span>
          </div>
          <div className="stat">
            <span className="stat-num points">+{todayP}</span>
            <span className="stat-label">획득 P</span>
          </div>
        </div>
        {todayDone.length > 0 && (
          <ul className="done-list">
            {todayDone.map((h, i) => (
              <li key={i}>
                {h.icon} {h.title} <span className="muted">+{h.xp}XP</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card pixel-box">
        <h2>📝 DIARY</h2>
        <label className="field">
          <span className="field-label">오늘 하루는 어땠나요?</span>
          <textarea
            className="input diary-input"
            rows={4}
            maxLength={500}
            value={text}
            placeholder="오늘은 주방을 깨끗하게 정리했다."
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <button className="btn primary wide" disabled={!text.trim()} onClick={save}>
          {saved ? '저장했어요!' : entry?.pointsAwarded ? '일기 고치기' : `일기 저장하기 (+${DIARY_POINTS}P)`}
        </button>
      </section>

      <section className="card pixel-box">
        <h2>🗓️ 지난 기록</h2>
        {days.length === 0 && <p className="muted">아직 지난 기록이 없어요. 내일 다시 와서 확인해 보세요!</p>}
        <ul className="past-list">
          {days.map((d) => {
            const done = completionsOn(data, d);
            const xp = done.reduce((s, h) => s + h.xp, 0);
            const diary = data.diary[d];
            return (
              <li key={d} className="past-day">
                <div className="row between">
                  <b>{formatDateLabel(d)}</b>
                  <span className="muted">
                    {done.length}개 · +{xp}XP{diary?.pointsAwarded ? ` · +${diary.pointsAwarded}P` : ''}
                  </span>
                </div>
                {done.length > 0 && <div className="past-icons">{done.map((h) => h.icon).join(' ')}</div>}
                {diary?.text && <p className="past-diary">“{diary.text}”</p>}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
