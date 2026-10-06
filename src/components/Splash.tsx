import { useState } from 'react';
import titleUrl from '../assets/title.webp';

/** 앱을 열면 나오는 타이틀 화면. 아무 곳이나 누르면 시작 */
export function Splash({ onStart }: { onStart(): void }) {
  const [leaving, setLeaving] = useState(false);
  const start = () => {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(onStart, 320);
  };
  return (
    <div className={`splash ${leaving ? 'leaving' : ''}`} onPointerDown={start} role="button" aria-label="게임 시작">
      <img className="splash-logo" src={titleUrl} alt="GO! 홈프로텍터 — 초특급 홈프로텍터가 되자!" />
      <div className="splash-start">▶ TAP TO START</div>
      <div className="splash-sub">현실의 집을 돌보면, 게임 속 집도 반짝반짝 ✨</div>
    </div>
  );
}
