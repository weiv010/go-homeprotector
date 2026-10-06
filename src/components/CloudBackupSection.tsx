import { useEffect, useState } from 'react';
import {
  autoBackup,
  configSource,
  getBackupCode,
  getCloudConfig,
  isBackupCode,
  loadBackup,
  setBackupCode,
  setCloudConfig,
  testConnection,
  type BackupState,
} from '../core/cloudBackup';
import { migrate } from '../core/storage';
import type { GameData } from '../core/types';
import { ConfirmDialog } from './Modal';

interface Props {
  data: GameData;
  replaceData(d: GameData): void;
  toast(msg: string): void;
  copy(text: string): void;
}

function timeText(ts: number | null): string {
  if (!ts) return '아직 없음';
  const d = new Date(ts);
  const sameDay = new Date().toDateString() === d.toDateString();
  const hm = d.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
  return sameDay ? `오늘 ${hm}` : `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
}

/** ☁️ Supabase 자동 백업 설정 */
export function CloudBackupSection({ data, replaceData, toast, copy }: Props) {
  const [state, setState] = useState<BackupState>(autoBackup.state);
  const [showSetup, setShowSetup] = useState(false);
  const [url, setUrl] = useState(() => getCloudConfig()?.url ?? '');
  const [key, setKey] = useState(() => getCloudConfig()?.anonKey ?? '');
  const [restoreCode, setRestoreCode] = useState('');
  const [pending, setPending] = useState<{ data: GameData; updatedAt: number; code: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const code = getBackupCode();

  useEffect(() => autoBackup.subscribe(setState), []);

  const connect = async () => {
    const cfg = { url, anonKey: key };
    setBusy(true);
    try {
      await testConnection({ url: url.trim().replace(/\/+$/, ''), anonKey: key.trim() });
      setCloudConfig(cfg);
      autoBackup.refresh();
      await autoBackup.flush(false, data);
      setShowSetup(false);
      toast('☁️ Supabase 에 연결했어요!');
    } catch (e) {
      toast(e instanceof Error ? e.message : '연결할 수 없어요');
    } finally {
      setBusy(false);
    }
  };

  const findBackup = async () => {
    const cfg = getCloudConfig();
    if (!cfg || !isBackupCode(restoreCode)) return;
    setBusy(true);
    try {
      const found = await loadBackup(cfg, restoreCode);
      const parsed = found ? migrate(found.data) : null;
      if (!found || !parsed) toast('이 코드로 저장된 백업이 없어요');
      else setPending({ data: parsed, updatedAt: found.updatedAt, code: restoreCode.trim() });
    } catch (e) {
      toast(e instanceof Error ? e.message : '불러올 수 없어요');
    } finally {
      setBusy(false);
    }
  };

  const status =
    state.kind === 'off'
      ? { cls: 'off', text: '연결 안 됨 — 이 기기에만 저장 중' }
      : state.kind === 'saving'
        ? { cls: 'saving', text: '백업하는 중…' }
        : state.kind === 'error'
          ? { cls: 'error', text: `백업 실패: ${state.message}` }
          : { cls: 'ok', text: `자동 백업 켜짐 · 마지막 백업 ${timeText(state.lastAt)}` };

  return (
    <section className="card pixel-box">
      <h2>☁️ 자동 백업</h2>
      <p className={`backup-status ${status.cls}`}>{status.text}</p>

      {state.kind !== 'off' && (
        <>
          <p className="muted">
            기록이 바뀔 때마다, 그리고 앱을 열고 닫을 때 Supabase 에 자동으로 올려요.
            {configSource() === 'default' && ' (기본 연결된 내 Supabase 프로젝트)'}
          </p>
          <div className="field">
            <span className="field-label">내 백업 코드 (다른 기기에서 불러올 때 필요해요 · 꼭 따로 적어 두세요)</span>
            <code className="tag-url">{code}</code>
            <div className="row gap wrap" style={{ marginTop: 6 }}>
              <button className="btn small" onClick={() => copy(code)}>
                📋 코드 복사
              </button>
              <button className="btn small" disabled={state.kind === 'saving'} onClick={() => void autoBackup.flush(false, data)}>
                ⬆️ 지금 백업
              </button>
            </div>
          </div>
          <div className="field">
            <span className="field-label">다른 기기의 백업 불러오기</span>
            <div className="row gap">
              <input
                className="input grow mono"
                placeholder="백업 코드 붙여넣기"
                value={restoreCode}
                onChange={(e) => setRestoreCode(e.target.value)}
              />
              <button className="btn" disabled={busy || !isBackupCode(restoreCode)} onClick={findBackup}>
                찾기
              </button>
            </div>
          </div>
        </>
      )}

      {showSetup || state.kind === 'off' ? (
        <div className="field">
          <span className="field-label">Supabase 연결 (Project Settings → API)</span>
          <input className="input mono wide-input" placeholder="https://xxxx.supabase.co" value={url} onChange={(e) => setUrl(e.target.value)} />
          <input
            className="input mono wide-input"
            placeholder="anon / publishable key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
          <button className="btn primary wide" disabled={busy || !url || !key} onClick={connect}>
            {busy ? '확인하는 중…' : '연결하고 백업 시작'}
          </button>
          {configSource() === 'app' && (
            <button
              className="btn ghost wide"
              onClick={() => {
                setCloudConfig(null);
                autoBackup.refresh();
                toast('앱에 입력한 연결 정보를 지웠어요');
              }}
            >
              입력한 연결 정보 지우기
            </button>
          )}
        </div>
      ) : (
        <button className="btn ghost wide" onClick={() => setShowSetup(true)}>
          연결 정보 바꾸기
        </button>
      )}

      {pending && (
        <ConfirmDialog
          message={
            <>
              {timeText(pending.updatedAt)} 에 저장된 백업을 찾았어요 (XP {pending.data.xp} · {pending.data.points}P).
              <br />
              지금 이 기기의 기록을 이 백업으로 바꿀까요?
            </>
          }
          confirmLabel="불러오기"
          onCancel={() => setPending(null)}
          onConfirm={() => {
            // 이후 자동 백업도 같은 코드로 이어지게 한다
            setBackupCode(pending.code);
            replaceData(pending.data);
            setPending(null);
            setRestoreCode('');
            toast('백업을 불러왔어요!');
          }}
        />
      )}
    </section>
  );
}
