import { useState } from 'react';
import type { Quest } from '../core/types';
import { formatMinutes } from '../core/timers';
import { Modal } from './Modal';

interface Props {
  quest: Quest;
  onStart(minutes: number): void;
  onCompleteNow(): void;
  onClose(): void;
}

const PRESETS = [5, 10, 15, 30, 60, 90];

/** 할 일을 누르면 나오는 타이머 설정 (몇 시간 몇 분 할지) */
export function TimerSetup({ quest, onStart, onCompleteNow, onClose }: Props) {
  const initial = quest.timerMinutes ?? 15;
  const [hours, setHours] = useState(Math.floor(initial / 60));
  const [mins, setMins] = useState(initial % 60);
  const total = hours * 60 + mins;

  const set = (m: number) => {
    setHours(Math.floor(m / 60));
    setMins(m % 60);
  };

  return (
    <Modal
      title={
        <>
          ⏳ {quest.icon} {quest.title}
        </>
      }
      onClose={onClose}
      footer={
        <button className="btn primary grow" disabled={total <= 0} onClick={() => onStart(total)}>
          ▶ {formatMinutes(total)} 타이머 시작
        </button>
      }
    >
      <p className="muted center">얼마나 할까요? 타이머가 끝나면 완료할 수 있어요.</p>

      <div className="timer-dial">
        <Stepper label="시간" value={hours} max={12} onChange={setHours} />
        <span className="timer-colon">:</span>
        <Stepper label="분" value={mins} max={59} step={5} onChange={setMins} />
      </div>

      <div className="chips center-chips">
        {PRESETS.map((p) => (
          <button key={p} className={`chip-btn ${total === p ? 'on' : ''}`} onClick={() => set(p)}>
            {formatMinutes(p)}
          </button>
        ))}
      </div>

      <button className="btn ghost wide" onClick={onCompleteNow}>
        타이머 없이 바로 완료하기
      </button>
    </Modal>
  );
}

function Stepper({
  label,
  value,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  step?: number;
  onChange(v: number): void;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(0, v));
  return (
    <div className="stepper">
      <button className="step-btn" onClick={() => onChange(clamp(value + step))} aria-label={`${label} 늘리기`}>
        ▲
      </button>
      <input
        className="step-value"
        inputMode="numeric"
        value={String(value).padStart(2, '0')}
        aria-label={label}
        onChange={(e) => onChange(clamp(Number(e.target.value.replace(/\D/g, '').slice(-2)) || 0))}
      />
      <span className="step-label">{label}</span>
      <button className="step-btn" onClick={() => onChange(clamp(value - step))} aria-label={`${label} 줄이기`}>
        ▼
      </button>
    </div>
  );
}
