// ─────────────────────────────────────────────────────────────
// NFC 추상화 계층
//
// 게임은 "어떤 NFC_LOCATION_ID 가 인식되었다" 는 사실만 알면 된다.
// 실제로 어떻게 인식했는지는 아래 세 가지 방법 중 하나다.
//
//  1) webnfc : 안드로이드 크롬의 Web NFC (NDEFReader) 로 직접 읽기
//  2) url    : 태그에 "앱주소?tag=kitchen_nfc" URL 을 기록해 두면
//              휴대폰(아이폰 포함)이 태그를 읽고 앱을 열어준다. QR 코드로도 동일하게 동작.
//  3) test   : NFC 가 없는 환경에서 쓰는 "NFC 태그 완료" 테스트 버튼
//
// 어느 방법이든 NfcTagEvent 로 통일되어 게임에 전달된다.
// ─────────────────────────────────────────────────────────────

export type NfcSource = 'webnfc' | 'url' | 'test';

export interface NfcTagEvent {
  nfcId: string;
  source: NfcSource;
}

export const TAG_URL_PARAM = 'tag';

/* Web NFC 는 아직 표준 DOM 타입에 없어서 필요한 부분만 선언한다 */
interface NDEFRecordLike {
  recordType: string;
  data?: DataView;
  encoding?: string;
}
interface NDEFReadingEventLike extends Event {
  serialNumber: string;
  message: { records: NDEFRecordLike[] };
}
interface NDEFReaderLike extends EventTarget {
  scan(options?: { signal?: AbortSignal }): Promise<void>;
}
declare global {
  interface Window {
    NDEFReader?: { new (): NDEFReaderLike };
  }
}

export function isWebNfcSupported(): boolean {
  return typeof window !== 'undefined' && 'NDEFReader' in window;
}

/** 태그 내용(텍스트 또는 URL)에서 NFC ID 를 꺼낸다 */
export function parseTagPayload(payload: string): string | null {
  const text = payload.trim();
  if (!text) return null;
  try {
    const url = new URL(text);
    const id = url.searchParams.get(TAG_URL_PARAM) ?? url.searchParams.get('nfc');
    if (id) return id;
  } catch {
    /* URL 이 아니면 텍스트 그대로 ID 로 본다 */
  }
  return /^[\w-]+$/.test(text) ? text : null;
}

function decodeRecord(r: NDEFRecordLike): string | null {
  if (!r.data) return null;
  if (r.recordType === 'text' || r.recordType === 'url' || r.recordType === 'absolute-url') {
    return new TextDecoder(r.encoding || 'utf-8').decode(r.data);
  }
  return null;
}

export class WebNfcReader {
  private abort: AbortController | null = null;

  get scanning(): boolean {
    return this.abort !== null;
  }

  /** 사용자 동작(버튼 탭) 안에서 호출해야 권한 요청이 뜬다 */
  async start(onTag: (e: NfcTagEvent) => void, onUnknown?: (serial: string) => void): Promise<void> {
    if (!window.NDEFReader) throw new Error('이 브라우저는 Web NFC 를 지원하지 않아요');
    if (this.abort) return;
    const reader = new window.NDEFReader();
    const abort = new AbortController();
    reader.addEventListener('reading', (ev) => {
      const e = ev as NDEFReadingEventLike;
      for (const rec of e.message.records) {
        const payload = decodeRecord(rec);
        const id = payload ? parseTagPayload(payload) : null;
        if (id) {
          onTag({ nfcId: id, source: 'webnfc' });
          return;
        }
      }
      onUnknown?.(e.serialNumber);
    });
    await reader.scan({ signal: abort.signal });
    this.abort = abort;
  }

  stop(): void {
    this.abort?.abort();
    this.abort = null;
  }
}

/** 앱이 "?tag=xxx" 로 열렸는지 확인하고, 확인한 뒤에는 주소창에서 지운다 */
export function consumeTagFromUrl(): NfcTagEvent | null {
  const url = new URL(window.location.href);
  const raw = url.searchParams.get(TAG_URL_PARAM) ?? url.searchParams.get('nfc');
  if (!raw) return null;
  url.searchParams.delete(TAG_URL_PARAM);
  url.searchParams.delete('nfc');
  window.history.replaceState(null, '', url.toString());
  const id = parseTagPayload(raw);
  return id ? { nfcId: id, source: 'url' } : null;
}

/** NFC 태그(또는 QR)에 기록할 URL */
export function tagUrlFor(nfcId: string): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set(TAG_URL_PARAM, nfcId);
  return url.toString();
}
