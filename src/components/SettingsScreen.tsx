import { useRef, useState } from 'react';
import type { GameAction } from '../core/game';
import { migrate } from '../core/storage';
import type { GameData } from '../core/types';
import { tagUrlFor } from '../nfc/nfc';
import { ConfirmDialog } from './Modal';

interface Props {
  data: GameData;
  dispatch(a: GameAction): void;
  replaceData(d: GameData): void;
  nfcSupported: boolean;
  nfcScanning: boolean;
  onStartNfc(): void;
  showTestButtons: boolean;
  setShowTestButtons(v: boolean): void;
  onSimulateTag(nfcId: string): void;
  toast(msg: string): void;
}

export function SettingsScreen(p: Props) {
  const { data, dispatch } = p;
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      p.toast('복사했어요!');
    } catch {
      window.prompt('아래 주소를 복사하세요', text);
    }
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `homeprotector-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importData = async (file: File) => {
    try {
      const next = migrate(JSON.parse(await file.text()));
      if (!next) throw new Error();
      p.replaceData(next);
      p.toast('데이터를 불러왔어요!');
    } catch {
      p.toast('파일을 읽을 수 없어요');
    }
  };

  return (
    <div className="screen">
      <section className="card pixel-box">
        <h2>📡 NFC</h2>
        {p.nfcSupported ? (
          <>
            <p>이 기기는 Web NFC 를 지원해요. 버튼을 눌러 스캔을 켜면 태그를 바로 읽을 수 있어요.</p>
            <button className="btn primary wide" disabled={p.nfcScanning} onClick={p.onStartNfc}>
              {p.nfcScanning ? '📡 NFC 스캔 중' : 'NFC 스캔 켜기'}
            </button>
          </>
        ) : (
          <p>
            이 브라우저는 Web NFC 를 직접 읽을 수 없어요. 대신 <b>태그에 아래 URL 을 기록</b>해 두면, 태그를 찍었을 때 휴대폰이 앱을
            열고 자동으로 인식해요. (아이폰도 OK · 같은 URL 로 QR 코드를 만들어도 돼요)
          </p>
        )}
        <label className="toggle-row">
          <input type="checkbox" checked={p.showTestButtons} onChange={(e) => p.setShowTestButtons(e.target.checked)} />
          <span>
            "NFC 태그 완료" 테스트 버튼 보이기
            <small>릴스 촬영할 때는 끄면 화면이 깔끔해져요</small>
          </span>
        </label>
      </section>

      <section className="card pixel-box">
        <h2>🏠 공간 & NFC ID</h2>
        <p className="muted">실제 집의 공간과 NFC 태그를 연결해요. 이름과 NFC ID 를 바꿀 수 있어요.</p>
        <ul className="loc-list">
          {data.locations.map((l) => (
            <li key={l.id} className="loc-item">
              <div className="row gap center-y">
                <span className="loc-emoji">{l.emoji}</span>
                <input
                  className="input grow"
                  value={l.name}
                  maxLength={10}
                  aria-label="공간 이름"
                  onChange={(e) => dispatch({ type: 'updateLocation', id: l.id, patch: { name: e.target.value } })}
                />
              </div>
              <div className="row gap center-y">
                <span className="mini-label">NFC ID</span>
                <input
                  className="input grow mono"
                  value={l.nfcId}
                  aria-label="NFC ID"
                  onChange={(e) =>
                    dispatch({ type: 'updateLocation', id: l.id, patch: { nfcId: e.target.value.replace(/[^\w-]/g, '') } })
                  }
                />
              </div>
              <div className="row gap">
                <button className="btn small" onClick={() => copy(tagUrlFor(l.nfcId))}>
                  🔗 태그 URL 복사
                </button>
                <button className="btn small" onClick={() => p.onSimulateTag(l.nfcId)}>
                  📱 테스트 태그
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card pixel-box">
        <h2>🧪 테스트 도구</h2>
        <p className="muted">집 상태 변화를 미리 보거나 촬영할 때 써요. 실제 기록에는 영향이 없도록 끝나면 원래대로 돌려 주세요.</p>
        <div className="row gap wrap">
          <button className="btn" onClick={() => dispatch({ type: 'debugShiftDays', days: 1 })}>
            ⏩ 하루 지나기
          </button>
          <button className="btn" onClick={() => dispatch({ type: 'debugShiftDays', days: -1 })}>
            ⏪ 하루 전으로
          </button>
          <button
            className="btn"
            disabled={data.debugDayOffset === 0}
            onClick={() => dispatch({ type: 'debugShiftDays', days: -data.debugDayOffset })}
          >
            🕒 오늘로 돌아오기
          </button>
          <button className="btn" onClick={() => dispatch({ type: 'debugAddPoints', points: 100 })}>
            🪙 +100P
          </button>
        </div>
      </section>

      <section className="card pixel-box">
        <h2>💾 데이터</h2>
        <p className="muted">데이터는 이 기기의 브라우저에 저장돼요. 가끔 백업해 두면 안심!</p>
        <div className="row gap wrap">
          <button className="btn" onClick={exportData}>
            ⬇️ 백업 파일 저장
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            ⬆️ 백업 불러오기
          </button>
          <button className="btn danger" onClick={() => setConfirmReset(true)}>
            🔄 처음부터 다시
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importData(f);
            e.target.value = '';
          }}
        />
      </section>

      <p className="muted center small-print">GO! 홈프로텍터 v0.1 · 🏆 초특급 홈프로텍터가 되자!</p>

      {confirmReset && (
        <ConfirmDialog
          message="모든 기록·XP·아이템이 지워져요. 처음부터 다시 시작할까요?"
          confirmLabel="초기화"
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            dispatch({ type: 'reset' });
            setConfirmReset(false);
          }}
        />
      )}
    </div>
  );
}
