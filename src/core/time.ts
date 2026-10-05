// 날짜 계산은 "로컬 달력 날짜" 기준이다. (자정이 지나면 하루가 지난 것으로 본다)

const DAY_MS = 24 * 60 * 60 * 1000;

export function dateKey(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** from 날짜에서 to 날짜까지 지난 달력 일수 (같은 날이면 0) */
export function daysBetween(from: number, to: number): number {
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS);
}

export function shiftDays(ts: number, days: number): number {
  return ts + days * DAY_MS;
}

export function formatDateLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const week = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
  return `${m}월 ${d}일 (${week})`;
}
