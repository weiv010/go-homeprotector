import { useState } from 'react';
import type { HouseLocation, Quest, QuestDraft, TimeSlot } from '../core/types';
import { QUEST_ICONS, REPEAT_PRESETS, TIME_SLOT_LABELS, TIME_SLOT_ORDER, XP_PRESETS } from '../data/options';
import { ConfirmDialog, Modal } from './Modal';

interface Props {
  quest: Quest | null;
  locations: HouseLocation[];
  defaultLocation?: string;
  onSave(draft: QuestDraft): void;
  onDelete?(): void;
  onClose(): void;
}

/** 퀘스트 추가 / 수정 화면 */
export function QuestForm({ quest, locations, defaultLocation, onSave, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(quest?.title ?? '');
  const [icon, setIcon] = useState(quest?.icon ?? QUEST_ICONS[2]);
  const [slot, setSlot] = useState<TimeSlot>(quest?.time.slot ?? 'none');
  const [at, setAt] = useState(quest?.time.at ?? '20:00');
  const [location, setLocation] = useState(quest?.location ?? defaultLocation ?? locations[0]?.id ?? '');
  const [repeatDays, setRepeatDays] = useState(quest?.repeatDays ?? 1);
  const [customRepeat, setCustomRepeat] = useState(!!quest && !REPEAT_PRESETS.some((p) => p.days === quest.repeatDays));
  const [xp, setXp] = useState(quest?.xp ?? 10);
  const [affectsHome, setAffectsHome] = useState(quest?.affectsHome ?? true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canSave = title.trim().length > 0 && !!location;

  const save = () => {
    if (!canSave) return;
    onSave({
      title: title.trim(),
      icon,
      time: slot === 'specific' ? { slot, at } : { slot },
      location,
      repeatDays,
      xp,
      affectsHome,
    });
  };

  return (
    <Modal
      title={quest ? '퀘스트 수정' : '새 퀘스트'}
      onClose={onClose}
      footer={
        <>
          {quest && onDelete && (
            <button className="btn danger ghost" onClick={() => setConfirmDelete(true)}>
              🗑️ 삭제
            </button>
          )}
          <button className="btn primary grow" disabled={!canSave} onClick={save}>
            저장하기
          </button>
        </>
      }
    >
      <label className="field">
        <span className="field-label">할 일</span>
        <div className="row gap">
          <span className="icon-preview">{icon}</span>
          <input
            className="input grow"
            value={title}
            placeholder="예: 설거지"
            maxLength={20}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus={!quest}
          />
        </div>
      </label>
      <div className="icon-grid">
        {QUEST_ICONS.map((i) => (
          <button key={i} className={`chip-btn ${icon === i ? 'on' : ''}`} onClick={() => setIcon(i)}>
            {i}
          </button>
        ))}
      </div>

      <div className="field">
        <span className="field-label">시간</span>
        <div className="chips">
          {TIME_SLOT_ORDER.map((s) => (
            <button key={s} className={`chip-btn ${slot === s ? 'on' : ''}`} onClick={() => setSlot(s)}>
              {TIME_SLOT_LABELS[s]}
            </button>
          ))}
        </div>
        {slot === 'specific' && <input className="input time" type="time" value={at} onChange={(e) => setAt(e.target.value)} />}
      </div>

      <div className="field">
        <span className="field-label">위치</span>
        <div className="chips">
          {locations.map((l) => (
            <button key={l.id} className={`chip-btn ${location === l.id ? 'on' : ''}`} onClick={() => setLocation(l.id)}>
              {l.emoji} {l.name}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field-label">반복 주기</span>
        <div className="chips">
          {REPEAT_PRESETS.map((p) => (
            <button
              key={p.days}
              className={`chip-btn ${!customRepeat && repeatDays === p.days ? 'on' : ''}`}
              onClick={() => {
                setCustomRepeat(false);
                setRepeatDays(p.days);
              }}
            >
              {p.label}
            </button>
          ))}
          <button className={`chip-btn ${customRepeat ? 'on' : ''}`} onClick={() => setCustomRepeat(true)}>
            사용자 지정
          </button>
        </div>
        {customRepeat && (
          <div className="row gap center-y">
            <input
              className="input num"
              type="number"
              min={1}
              max={365}
              value={repeatDays}
              onChange={(e) => setRepeatDays(Math.max(1, Number(e.target.value) || 1))}
            />
            <span>일마다</span>
          </div>
        )}
      </div>

      <div className="field">
        <span className="field-label">XP</span>
        <div className="chips">
          {XP_PRESETS.map((v) => (
            <button key={v} className={`chip-btn ${xp === v ? 'on' : ''}`} onClick={() => setXp(v)}>
              +{v}
            </button>
          ))}
          <input
            className="input num"
            type="number"
            min={0}
            max={999}
            value={xp}
            aria-label="XP 직접 입력"
            onChange={(e) => setXp(Math.max(0, Number(e.target.value) || 0))}
          />
        </div>
      </div>

      <label className="toggle-row">
        <input type="checkbox" checked={affectsHome} onChange={(e) => setAffectsHome(e.target.checked)} />
        <span>
          집 상태에 반영하기
          <small>끄면 미뤄도 공간이 지저분해지지 않아요 (요가·작업 등)</small>
        </span>
      </label>

      {confirmDelete && onDelete && (
        <ConfirmDialog
          message={
            <>
              <b>{quest?.title}</b> 퀘스트를 삭제할까요?
            </>
          }
          confirmLabel="삭제"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={onDelete}
        />
      )}
    </Modal>
  );
}
