import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AutoBackup, getBackupCode, getCloudConfig, loadBackup, saveBackup, setCloudConfig } from './cloudBackup';
import { createInitialData } from './game';

const store = new Map<string, string>();
const cfg = { url: 'https://demo.supabase.co', anonKey: 'anon-key' };

beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  });
  vi.useFakeTimers();
  vi.stubGlobal('window', {
    setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
    clearTimeout: (id: number) => clearTimeout(id),
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function mockFetch(handler: (url: string, body: any) => { status?: number; json: unknown }) {
  const calls: { url: string; body: any; headers: any }[] = [];
  vi.stubGlobal('fetch', async (url: string, init: any) => {
    const body = JSON.parse(init.body);
    calls.push({ url, body, headers: init.headers });
    const r = handler(url, body);
    return { ok: (r.status ?? 200) < 400, status: r.status ?? 200, json: async () => r.json };
  });
  return calls;
}

describe('Supabase 자동 백업', () => {
  it('백업 코드는 한 번 만들면 계속 같다', () => {
    const a = getBackupCode();
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
    expect(getBackupCode()).toBe(a);
  });

  it('저장/불러오기 RPC 를 anon 키로 호출한다', async () => {
    const calls = mockFetch((url) =>
      url.endsWith('save_backup') ? { json: '2026-10-06T05:00:00Z' } : { json: [{ data: { xp: 7 }, updated_at: '2026-10-06T05:00:00Z' }] },
    );
    const at = await saveBackup(cfg, 'code-1', createInitialData(0));
    expect(at).toBe(Date.parse('2026-10-06T05:00:00Z'));
    expect(calls[0].url).toBe('https://demo.supabase.co/rest/v1/rpc/homeprotector_save_backup');
    expect(calls[0].headers.apikey).toBe('anon-key');
    expect(calls[0].headers.Authorization).toBeUndefined();
    expect(calls[0].body.p_key).toBe('code-1');
    const found = await loadBackup(cfg, 'code-1');
    expect(found?.data).toEqual({ xp: 7 });
  });

  it('함수가 없으면 SQL 실행 안내 오류를 낸다', async () => {
    mockFetch(() => ({ status: 404, json: { message: 'Could not find the function' } }));
    await expect(saveBackup(cfg, 'c', createInitialData(0))).rejects.toThrow('backup.sql');
  });

  it('연속 변경은 한 번으로 묶어서 잠시 뒤 백업한다', async () => {
    setCloudConfig(cfg);
    const calls = mockFetch(() => ({ json: '2026-10-06T05:00:00Z' }));
    const ab = new AutoBackup();
    const d = createInitialData(0);
    ab.schedule({ ...d, xp: 1 });
    ab.schedule({ ...d, xp: 2 });
    ab.schedule({ ...d, xp: 3 });
    expect(calls).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(5000);
    expect(calls).toHaveLength(1);
    expect(calls[0].body.p_data.xp).toBe(3);
    expect(ab.state).toMatchObject({ kind: 'idle' });
  });

  it('설정이 없으면 기본 프로젝트로 백업한다', () => {
    expect(getCloudConfig()?.url).toBe('https://ueyevbzcdtlolszjsqva.supabase.co');
    expect(new AutoBackup().state.kind).toBe('idle');
  });

  it('첫 키가 거부되면 예비 키(JWT)로 다시 시도하고, JWT 는 Bearer 로도 보낸다', async () => {
    const calls = mockFetch((_u, _b) => ({ json: '2026-10-06T05:00:00Z' }));
    let n = 0;
    vi.stubGlobal('fetch', async (url: string, init: any) => {
      calls.push({ url, body: JSON.parse(init.body), headers: init.headers });
      n++;
      return n === 1
        ? { ok: false, status: 401, json: async () => ({ message: 'Invalid API key' }) }
        : { ok: true, status: 200, json: async () => '2026-10-06T05:00:00Z' };
    });
    await saveBackup({ url: 'https://x.supabase.co', anonKey: 'sb_publishable_x', fallbackKey: 'eyJabc' }, 'c', createInitialData(0));
    expect(calls).toHaveLength(2);
    expect(calls[0].headers).toEqual({ apikey: 'sb_publishable_x', 'Content-Type': 'application/json' });
    expect(calls[1].headers.Authorization).toBe('Bearer eyJabc');
  });

  it('실패하면 오류 상태가 되고 다음에 다시 시도한다', async () => {
    setCloudConfig(cfg);
    let fail = true;
    const calls = mockFetch(() => (fail ? { status: 500, json: { message: 'down' } } : { json: '2026-10-06T05:00:00Z' }));
    const ab = new AutoBackup();
    ab.schedule(createInitialData(0));
    await vi.advanceTimersByTimeAsync(5000);
    expect(ab.state).toMatchObject({ kind: 'error', message: 'down' });
    fail = false;
    await ab.flush();
    expect(calls).toHaveLength(2);
    expect(ab.state.kind).toBe('idle');
  });
});
