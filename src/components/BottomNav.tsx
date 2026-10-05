export type Tab = 'home' | 'record' | 'closet' | 'settings';

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'home', icon: '🏠', label: '집' },
  { id: 'record', icon: '📖', label: '기록' },
  { id: 'closet', icon: '👗', label: '옷장' },
  { id: 'settings', icon: '⚙️', label: '설정' },
];

export function BottomNav({ tab, onChange }: { tab: Tab; onChange(t: Tab): void }) {
  return (
    <nav className="bottom-nav">
      {TABS.map((t) => (
        <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => onChange(t.id)}>
          <span className="nav-icon">{t.icon}</span>
          <span className="nav-label">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
