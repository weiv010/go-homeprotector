// 레벨 / 타이틀 표. minXp 는 해당 레벨에 도달하는 누적 XP.
// 숫자와 이름은 자유롭게 바꿔도 된다 (위에서부터 오름차순 유지).
export interface TitleDef {
  level: number;
  title: string;
  minXp: number;
}

export const TITLES: TitleDef[] = [
  { level: 1, title: '집주인', minXp: 0 },
  { level: 2, title: '생활인', minXp: 60 },
  { level: 3, title: '집관리자', minXp: 180 },
  { level: 4, title: '홈프로텍터', minXp: 400 },
  { level: 5, title: '슈퍼 홈프로텍터', minXp: 750 },
  { level: 6, title: '초특급 홈프로텍터', minXp: 1200 },
];
