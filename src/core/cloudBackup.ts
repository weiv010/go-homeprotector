import type { GameData } from './types';

// ─────────────────────────────────────────────────────────────
// Supabase 자동 백업
//
// - 데이터는 항상 이 기기(localStorage)에 먼저 저장되고, 바뀔 때마다 잠시 뒤 Supabase 에도 올린다.
// - 로그인 대신 기기마다 무작위 "백업 코드"(UUID)를 만들어 열쇠로 쓴다.
//   다른 기기에서 이 코드를 입력하면 같은 백업을 불러올 수 있다.
// - Supabase 쪽 테이블/함수는 supabase/backup.sql 참고.
// - 연결 정보는 빌드 시 환경변수(VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) 또는
//   앱 설정 화면에서 직접 입력한 값을 쓴다. (anon 키는 공개돼도 되는 키)
// ─────────────────────────────────────────────────────────────

export interface CloudConfig {
  url: string;
  anonKey: string;
}

export type BackupState =
  | { kind: 'off' }
  | { kind: 'idle'; lastAt: number | null }
  | { kind: 'saving'; lastAt: number | null }
  | { kind: 'error'; message: string; lastAt: number | null };

const CONFIG_KEY = 'go-homeprotector/cloud-config';
const CODE_KEY = 'go-homeprotector/backup-code';
const LAST_KEY = 'go-homeprotector/backup-last';
const DEBOUNCE_MS = 4000;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* noop */
  }
}

export function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
}

/** 설정 화면에서 입력한 값 → 없으면 빌드 환경변수 */
export function getCloudConfig(): CloudConfig | null {
  try {
    const saved = JSON.parse(read(CONFIG_KEY) ?? 'null') as CloudConfig | null;
    if (saved?.url && saved.anonKey) return saved;
  } catch {
    /* noop */
  }
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  return url && anonKey ? { url: normalizeUrl(url), anonKey: anonKey.trim() } : null;
}

export function configSource(): 'app' | 'build' | null {
  if (read(CONFIG_KEY)) return 'app';
  return import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY ? 'build' : null;
}

export function setCloudConfig(cfg: CloudConfig | null): void {
  write(CONFIG_KEY, cfg ? JSON.stringify({ url: normalizeUrl(cfg.url), anonKey: cfg.anonKey.trim() }) : null);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isBackupCode(code: string): boolean {
  return UUID_RE.test(code.trim());
}

/** 이 기기의 백업 코드 (없으면 새로 만든다) */
export function getBackupCode(): string {
  let code = read(CODE_KEY);
  if (!code || !isBackupCode(code)) {
    code = crypto.randomUUID();
    write(CODE_KEY, code);
  }
  return code;
}

export function setBackupCode(code: string): void {
  write(CODE_KEY, code.trim().toLowerCase());
}

async function rpc<T>(cfg: CloudConfig, fn: string, body: unknown, keepalive = false): Promise<T> {
  const json = JSON.stringify(body);
  const res = await fetch(`${cfg.url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    // 화면을 닫는 순간에도 전송되도록 keepalive (브라우저 제한 64KB 이하일 때만)
    keepalive: keepalive && json.length < 60_000,
    headers: {
      apikey: cfg.anonKey,
      Authorization: `Bearer ${cfg.anonKey}`,
      'Content-Type': 'application/json',
    },
    body: json,
  });
  if (!res.ok) {
    let detail = '';
    try {
      const j = await res.json();
      detail = j.message || j.hint || '';
    } catch {
      /* noop */
    }
    if (res.status === 404 || /could not find the function/i.test(detail)) {
      throw new Error('Supabase 에 백업 함수가 없어요. supabase/backup.sql 을 실행해 주세요');
    }
    if (res.status === 401 || res.status === 403) throw new Error('Supabase 키가 맞지 않아요');
    throw new Error(detail || `Supabase 오류 (${res.status})`);
  }
  return (await res.json()) as T;
}

export async function saveBackup(cfg: CloudConfig, code: string, data: GameData, keepalive = false): Promise<number> {
  const at = await rpc<string>(cfg, 'homeprotector_save_backup', { p_key: code, p_data: data }, keepalive);
  return new Date(at).getTime();
}

export async function loadBackup(cfg: CloudConfig, code: string): Promise<{ data: unknown; updatedAt: number } | null> {
  const rows = await rpc<{ data: unknown; updated_at: string }[]>(cfg, 'homeprotector_load_backup', { p_key: code.trim() });
  if (!rows.length) return null;
  return { data: rows[0].data, updatedAt: new Date(rows[0].updated_at).getTime() };
}

/** 연결 확인: 아무 것도 없는 코드로 불러오기를 해 본다 */
export async function testConnection(cfg: CloudConfig): Promise<void> {
  await rpc(cfg, 'homeprotector_load_backup', { p_key: '00000000-0000-0000-0000-000000000000' });
}

/**
 * 데이터가 바뀔 때마다 호출하면, 잠시 기다렸다가(연속 변경은 한 번으로 묶어) 자동으로 백업한다.
 * 화면을 떠날 때는 flush() 로 바로 보낸다.
 */
export class AutoBackup {
  private timer: number | null = null;
  private pending: GameData | null = null;
  private listeners = new Set<(s: BackupState) => void>();
  private _state: BackupState;

  constructor() {
    const last = Number(read(LAST_KEY)) || null;
    this._state = getCloudConfig() ? { kind: 'idle', lastAt: last } : { kind: 'off' };
  }

  get state(): BackupState {
    return this._state;
  }

  subscribe(fn: (s: BackupState) => void): () => void {
    this.listeners.add(fn);
    fn(this._state);
    return () => this.listeners.delete(fn);
  }

  private set(s: BackupState) {
    this._state = s;
    for (const l of this.listeners) l(s);
  }

  private lastAt(): number | null {
    return 'lastAt' in this._state ? this._state.lastAt : Number(read(LAST_KEY)) || null;
  }

  /** 연결 설정이 바뀌었을 때 상태를 다시 계산 */
  refresh(): void {
    this.set(getCloudConfig() ? { kind: 'idle', lastAt: this.lastAt() } : { kind: 'off' });
  }

  schedule(data: GameData): void {
    if (!getCloudConfig()) return;
    this.pending = data;
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => void this.flush(), DEBOUNCE_MS);
  }

  async flush(keepalive = false, data?: GameData): Promise<boolean> {
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    const payload = data ?? this.pending;
    const cfg = getCloudConfig();
    if (!payload || !cfg) return false;
    this.pending = null;
    this.set({ kind: 'saving', lastAt: this.lastAt() });
    try {
      const at = await saveBackup(cfg, getBackupCode(), payload, keepalive);
      write(LAST_KEY, String(at));
      this.set({ kind: 'idle', lastAt: at });
      return true;
    } catch (e) {
      // 실패하면 다음 변경 때 다시 시도하도록 남겨 둔다
      this.pending = this.pending ?? payload;
      this.set({ kind: 'error', message: e instanceof Error ? e.message : '백업 실패', lastAt: this.lastAt() });
      return false;
    }
  }
}

export const autoBackup = new AutoBackup();
