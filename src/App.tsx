import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CelebrationOverlay, type Celebration } from './components/Celebration';
import { ClosetScreen } from './components/ClosetScreen';
import { GameView, type GameViewHandle } from './components/GameView';
import { Modal } from './components/Modal';
import { QuestForm } from './components/QuestForm';
import { QuestPanel } from './components/QuestPanel';
import { RecordScreen } from './components/RecordScreen';
import { RoomSheet } from './components/RoomSheet';
import { SettingsScreen } from './components/SettingsScreen';
import { Splash } from './components/Splash';
import { TimerSetup } from './components/TimerSetup';
import { TopBar } from './components/TopBar';
import { plannedIds, type GameAction } from './core/game';
import { questStatus } from './core/quests';
import { isFinished } from './core/timers';
import type { GameEvent, Quest } from './core/types';
import { consumeTagFromUrl, isWebNfcSupported, nfcPermissionGranted, WebNfcReader, type NfcTagEvent } from './nfc/nfc';
import { useSingleTab } from './singleTab';
import { useGame } from './useGame';
import { useNow } from './useNow';

/**
 * 게임 진행 단계
 *  idle      : 집 구경 중
 *  walking   : 선택한 공간으로 걸어가는 중
 *  awaitTag  : 도착! 현실의 NFC 태그를 기다리는 중 (태그 없이는 퀘스트를 열 수 없다)
 *  dashing   : NFC 인식 → 빠르게 달려가는 중
 *  room      : 공간 퀘스트 창이 열린 상태
 */
type Phase = 'idle' | 'walking' | 'awaitTag' | 'dashing' | 'room';

/** 맵 위에 겹쳐 뜨는 페이지 */
type Page = 'record' | 'closet' | 'settings';

const OVERVIEW_KEY = 'go-homeprotector/overview';

const PAGE_TITLES: Record<Page, string> = {
  record: '📖 기록',
  closet: '👗 옷장',
  settings: '⚙️ 설정',
};

export default function App() {
  const { data, now, dispatch, replaceData, cleanLevels } = useGame();
  const dataRef = useRef(data);
  dataRef.current = data;

  const gameRef = useRef<GameViewHandle>(null);
  const [page, setPage] = useState<Page | null>(null);
  const [questsOpen, setQuestsOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState<{ quest: Quest | null; location?: string } | null>(null);
  const [timerFor, setTimerFor] = useState<Quest | null>(null);
  const [queue, setQueue] = useState<{ id: number; item: Celebration }[]>([]);
  const nextId = useRef(1);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const tabs = useSingleTab();
  const [overview, setOverview] = useState(() => {
    try {
      return localStorage.getItem(OVERVIEW_KEY) === '1';
    } catch {
      return false;
    }
  });
  const toggleOverview = () => {
    const next = !overview;
    setOverview(next);
    try {
      localStorage.setItem(OVERVIEW_KEY, next ? '1' : '0');
    } catch {
      /* noop */
    }
  };

  // NFC 태그(URL)로 열린 경우에는 타이틀을 건너뛰고 바로 게임으로
  const [showSplash, setShowSplash] = useState(() => !new URLSearchParams(window.location.search).has('tag'));

  const nfcReader = useRef(new WebNfcReader());
  const [nfcScanning, setNfcScanning] = useState(false);
  const nfcSupported = isWebNfcSupported();

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg((m) => (m === msg ? null : m)), 2200);
  }, []);

  const wrap = (item: Celebration) => ({ id: nextId.current++, item });

  const pushEvents = useCallback((events: GameEvent[]) => {
    if (events.length) setQueue((q) => [...q, ...events.map(wrap)]);
  }, []);

  const act = useCallback((a: GameAction) => pushEvents(dispatch(a)), [dispatch, pushEvents]);

  // ── 1) 게임에서 공간 선택 → 캐릭터 이동 → NFC 안내 ──
  const goToRoom = useCallback(async (locationId: string) => {
    setPage(null);
    setQuestsOpen(false);
    setSelected(locationId);
    setPhase('walking');
    const arrived = await gameRef.current?.walkTo(locationId, 'walk');
    if (!arrived) return;
    // 태그가 붙은 공간은 반드시 태그해야 퀘스트가 열린다.
    // 예외: 태그가 없는 공간(화장실·거실), 이미 태그하고 타이머를 켜 둔 공간
    const hasTag = !!dataRef.current.locations.find((l) => l.id === locationId)?.nfcId;
    const hasTimer = dataRef.current.timers.some((t) => t.location === locationId);
    setPhase(hasTag && !hasTimer ? 'awaitTag' : 'room');
  }, []);

  const handleRoomTap = (locationId: string) => {
    if (selected === locationId && phase !== 'idle') return;
    void goToRoom(locationId);
  };

  // ── 2) NFC 인식 → 빠르게 달려가기 → 공간 퀘스트 ──
  const handleTag = useCallback(
    async (e: NfcTagEvent) => {
      const loc = dataRef.current.locations.find((l) => l.nfcId === e.nfcId);
      if (!loc) {
        toast(`등록되지 않은 태그예요: ${e.nfcId}`);
        return;
      }
      setPage(null);
      setQuestsOpen(false);
      setSelected(loc.id);
      setPhase('dashing');
      setQueue((q) => [wrap({ type: 'nfc', locationName: loc.name, source: e.source }), ...q]);
      const arrived = await gameRef.current?.walkTo(loc.id, 'dash');
      if (arrived) setPhase('room');
    },
    [toast],
  );

  const simulateTag = (nfcId: string) => void handleTag({ nfcId, source: 'test' });

  /** 앱 안에서 NFC 읽기 (안드로이드 크롬). 켜져 있으면 태그해도 새 창이 생기지 않는다 */
  const startNfc = useCallback(
    async (quiet = false) => {
      if (!nfcSupported || nfcReader.current.scanning) return;
      try {
        await nfcReader.current.start(
          (e) => void handleTag(e),
          (serial) => toast(`ID 가 없는 태그예요 (${serial}). 설정에서 태그 URL 을 기록해 주세요`),
        );
        setNfcScanning(true);
        if (!quiet) toast('📡 NFC 스캔을 켰어요');
      } catch (err) {
        if (!quiet) toast(err instanceof Error ? err.message : 'NFC 를 켤 수 없어요');
      }
    },
    [nfcSupported, handleTag, toast],
  );

  // 이미 NFC 권한을 허락했다면 앱을 열자마자 스캔을 켠다
  useEffect(() => {
    void nfcPermissionGranted().then((ok) => {
      if (ok) void startNfc(true);
    });
  }, [startNfc]);

  // 앱이 NFC 태그(URL)로 열린 경우
  useEffect(() => {
    const tag = consumeTagFromUrl();
    if (!tag) return;
    const id = window.setTimeout(() => void handleTag(tag), 500);
    return () => window.clearTimeout(id);
  }, [handleTag]);

  useEffect(() => () => nfcReader.current.stop(), []);

  // ── 3) 퀘스트 완료 ──
  const completeQuest = (q: Quest) => {
    const events = dispatch({ type: 'completeQuest', id: q.id });
    if (events.length) gameRef.current?.celebrate(q.location);
    pushEvents(events);
  };

  // ── 타이머 ──
  const startTimer = (q: Quest, minutes: number) => {
    act({ type: 'startTimer', id: q.id, minutes, at: Date.now() });
    setTimerFor(null);
    toast(`⏳ ${q.title} 타이머 시작!`);
  };

  // 타이머가 끝나면 한 번 알려준다 (앱을 다시 열었을 때 이미 끝나 있던 것은 조용히 '완료' 표시만)
  const clock = useNow(data.timers.length > 0);
  const alerted = useRef<Set<string> | null>(null);
  useEffect(() => {
    const key = (t: { questId: string; startedAt: number }) => `${t.questId}@${t.startedAt}`;
    if (!alerted.current) {
      alerted.current = new Set(data.timers.filter((t) => isFinished(t, Date.now())).map(key));
      return;
    }
    for (const t of data.timers) {
      if (!isFinished(t, clock) || alerted.current.has(key(t))) continue;
      alerted.current.add(key(t));
      const q = data.quests.find((x) => x.id === t.questId);
      const loc = data.locations.find((l) => l.id === t.location);
      if (!q) continue;
      setQueue((qq) => [...qq, wrap({ type: 'timeUp', questTitle: q.title, icon: q.icon, locationName: loc?.name ?? '' })]);
      try {
        navigator.vibrate?.([200, 100, 200]);
      } catch {
        /* noop */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clock, data.timers]);

  const closeRoom = () => {
    setPhase('idle');
    setSelected(null);
  };

  // 오늘의 퀘스트 중 아직 안 한 것이 있는 공간 → 빨간 ! 말풍선 (타이머가 도는 곳은 타이머 표시로 대신)
  const planned = plannedIds(data, now);
  const todo = data.quests.filter((q) => planned.includes(q.id) && questStatus(q, now) !== 'done');
  const markers = useMemo(
    () => [...new Set(todo.filter((q) => !data.timers.some((t) => t.questId === q.id)).map((q) => q.location))],
    [todo, data.timers],
  );

  const selectedLoc = data.locations.find((l) => l.id === selected) ?? null;

  const bubble =
    phase === 'awaitTag' && selectedLoc ? (
      <>📱 {selectedLoc.name}의 NFC 태그를 찍어주세요</>
    ) : phase === 'walking' && selectedLoc ? (
      <>🚶 {selectedLoc.name}(으)로 가는 중…</>
    ) : null;

  const openPage = (p: Page) => {
    setQuestsOpen(false);
    setPage(p);
  };

  return (
    <div className="app">
      <TopBar xp={data.xp} points={data.points} nfcOn={nfcScanning} dayOffset={data.debugDayOffset} />

      <main className="map-area">
        <GameView
          ref={gameRef}
          data={data}
          cleanLevels={cleanLevels}
          selected={selected}
          markers={markers}
          overview={overview}
          onRoomTap={handleRoomTap}
          bubble={bubble}
        >
          {phase === 'awaitTag' && selectedLoc && (
            <div className="map-actions pop-in">
              <span className="tag-hint">
                {nfcScanning ? '📡 휴대폰 뒷면을 태그에 대 주세요' : '📱 휴대폰으로 태그를 찍어 주세요'}
              </span>
              {nfcSupported && !nfcScanning && (
                <button className="btn primary small" onClick={() => void startNfc()}>
                  📡 앱에서 읽기
                </button>
              )}
              <button className="btn ghost small" onClick={closeRoom}>
                취소
              </button>
            </div>
          )}
        </GameView>

        {/* 사이드 원형 버튼 */}
        <nav className="side-nav" aria-label="메뉴">
          <button className="side-btn quest" onClick={() => setQuestsOpen(true)} aria-label="퀘스트">
            📜{todo.length > 0 && <span className="side-badge">{todo.length}</span>}
            <span className="side-label">퀘스트</span>
          </button>
          <button className="side-btn" onClick={() => openPage('record')} aria-label="기록">
            📖<span className="side-label">기록</span>
          </button>
          <button className="side-btn" onClick={() => openPage('closet')} aria-label="옷장">
            👗<span className="side-label">옷장</span>
          </button>
          <button className="side-btn" onClick={() => openPage('settings')} aria-label="설정">
            ⚙️<span className="side-label">설정</span>
          </button>
          <button className="side-btn small" onClick={toggleOverview} aria-label={overview ? '확대해서 보기' : '집 전체 보기'}>
            {overview ? '🔎' : '🏠'}
            <span className="side-label">{overview ? '확대' : '전체'}</span>
          </button>
        </nav>

        {phase === 'room' && selectedLoc && (
          <div className="room-popup">
            <RoomSheet
              data={data}
              now={now}
              location={selectedLoc}
              level={cleanLevels[selectedLoc.id] ?? 0}
              onComplete={completeQuest}
              onOpenTimer={(q) => setTimerFor(q)}
              onCancelTimer={(q) => act({ type: 'cancelTimer', id: q.id })}
              onAdd={() => setForm({ quest: null, location: selectedLoc.id })}
              onClose={closeRoom}
            />
          </div>
        )}

        {page && (
          <section className="page">
            <header className="page-head">
              <button className="btn small" onClick={() => setPage(null)}>
                ← 집으로
              </button>
              <h1>{PAGE_TITLES[page]}</h1>
            </header>
            {page === 'record' && <RecordScreen data={data} now={now} onSaveDiary={(text) => act({ type: 'saveDiary', text })} />}
            {page === 'closet' && <ClosetScreen data={data} dispatch={act} />}
            {page === 'settings' && (
              <SettingsScreen
                data={data}
                dispatch={act}
                replaceData={replaceData}
                nfcSupported={nfcSupported}
                nfcScanning={nfcScanning}
                onStartNfc={() => void startNfc()}
                onSimulateTag={simulateTag}
                toast={toast}
              />
            )}
          </section>
        )}
      </main>

      {questsOpen && (
        <Modal title="📜 퀘스트" onClose={() => setQuestsOpen(false)}>
          <QuestPanel
            data={data}
            now={now}
            onGo={(q) => void goToRoom(q.location)}
            onEdit={(q) => setForm({ quest: q })}
            onAdd={() => setForm({ quest: null })}
            onDiary={() => openPage('record')}
            onPlan={(q) => {
              act({ type: 'planToday', id: q.id });
              toast(`${q.icon} ${q.title} 오늘 추가!`);
            }}
            onUnplan={(q) => act({ type: 'unplanToday', id: q.id })}
          />
        </Modal>
      )}

      {form && (
        <QuestForm
          quest={form.quest}
          locations={data.locations}
          defaultLocation={form.location}
          onClose={() => setForm(null)}
          onSave={(draft) => {
            act(form.quest ? { type: 'updateQuest', id: form.quest.id, draft } : { type: 'addQuest', draft });
            setForm(null);
            toast(form.quest ? '퀘스트를 고쳤어요' : '새 퀘스트를 추가했어요!');
          }}
          onDelete={
            form.quest
              ? () => {
                  act({ type: 'deleteQuest', id: form.quest!.id });
                  setForm(null);
                  toast('퀘스트를 삭제했어요');
                }
              : undefined
          }
        />
      )}

      {timerFor && (
        <TimerSetup
          quest={timerFor}
          onClose={() => setTimerFor(null)}
          onStart={(m) => startTimer(timerFor, m)}
          onCompleteNow={() => {
            completeQuest(timerFor);
            setTimerFor(null);
          }}
        />
      )}

      {queue[0] && (
        <CelebrationOverlay
          key={queue[0].id}
          item={queue[0].item}
          onDone={() => setQueue((q) => q.filter((c) => c.id !== queue[0].id))}
        />
      )}
      {toastMsg && <div className="toast pop-in">{toastMsg}</div>}
      {showSplash && (
        <Splash
          onStart={() => {
            setShowSplash(false);
            // 시작 버튼을 누른 순간(사용자 동작)에 NFC 읽기를 켠다 → 이후 태그해도 새 창이 안 생김
            void startNfc(true);
          }}
        />
      )}
      {tabs.inactive && (
        <div className="tab-sleep">
          <div className="pixel-box tab-sleep-card">
            <p>😴 이 창은 쉬는 중이에요</p>
            <p className="muted">태그로 새로 열린 창에서 이어서 하고 있어요. 이 탭은 닫아도 돼요.</p>
            <button className="btn primary" onClick={tabs.takeOver}>
              여기서 계속하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
