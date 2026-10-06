import { useCallback, useEffect, useRef, useState } from 'react';
import { BottomNav, type Tab } from './components/BottomNav';
import { CelebrationOverlay, type Celebration } from './components/Celebration';
import { ClosetScreen } from './components/ClosetScreen';
import { GameView, type GameViewHandle } from './components/GameView';
import { QuestForm } from './components/QuestForm';
import { QuestPanel } from './components/QuestPanel';
import { RecordScreen } from './components/RecordScreen';
import { RoomSheet } from './components/RoomSheet';
import { SettingsScreen } from './components/SettingsScreen';
import { Splash } from './components/Splash';
import { TimerSetup } from './components/TimerSetup';
import { isFinished } from './core/timers';
import { useNow } from './useNow';
import { TopBar } from './components/TopBar';
import type { GameAction } from './core/game';
import type { GameEvent, Quest } from './core/types';
import { consumeTagFromUrl, isWebNfcSupported, WebNfcReader, type NfcTagEvent } from './nfc/nfc';
import { useGame } from './useGame';

/**
 * 게임 진행 단계
 *  idle      : 집 구경 중
 *  walking   : 선택한 공간으로 걸어가는 중
 *  awaitTag  : 도착! 현실의 NFC 태그를 기다리는 중
 *  dashing   : NFC 인식 → 빠르게 달려가는 중
 *  room      : 공간 퀘스트 창이 열린 상태
 */
type Phase = 'idle' | 'walking' | 'awaitTag' | 'dashing' | 'room';

const PREFS_KEY = 'go-homeprotector/prefs';

function loadPrefs(): { showTestButtons: boolean } {
  try {
    return { showTestButtons: true, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') };
  } catch {
    return { showTestButtons: true };
  }
}

export default function App() {
  const { data, now, dispatch, replaceData, cleanLevels } = useGame();
  const dataRef = useRef(data);
  dataRef.current = data;

  const gameRef = useRef<GameViewHandle>(null);
  const [tab, setTab] = useState<Tab>('home');
  const [phase, setPhase] = useState<Phase>('idle');
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState<{ quest: Quest | null; location?: string } | null>(null);
  const [timerFor, setTimerFor] = useState<Quest | null>(null);
  const [queue, setQueue] = useState<{ id: number; item: Celebration }[]>([]);
  const nextId = useRef(1);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [prefs, setPrefs] = useState(loadPrefs);

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

  const setShowTestButtons = (v: boolean) => {
    const next = { ...prefs, showTestButtons: v };
    setPrefs(next);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
      /* noop */
    }
  };

  // ── 1) 게임에서 공간 선택 → 캐릭터 이동 → NFC 안내 ──
  const goToRoom = useCallback(async (locationId: string) => {
    setTab('home');
    setSelected(locationId);
    setPhase('walking');
    const arrived = await gameRef.current?.walkTo(locationId, 'walk');
    if (!arrived) return;
    // NFC 태그가 없는 공간(화장실·거실)이나 타이머가 돌고 있는 공간은 도착하자마자 퀘스트 창을 연다
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
      setTab('home');
      setSelected(loc.id);
      setPhase('dashing');
      setQueue((q) => [wrap({ type: 'nfc', locationName: loc.name, source: e.source }), ...q]);
      const arrived = await gameRef.current?.walkTo(loc.id, 'dash');
      if (arrived) setPhase('room');
    },
    [toast],
  );

  const simulateTag = (nfcId: string) => void handleTag({ nfcId, source: 'test' });

  const startNfc = async () => {
    try {
      await nfcReader.current.start(
        (e) => void handleTag(e),
        (serial) => toast(`ID 가 없는 태그예요 (${serial}). 설정에서 태그 URL 을 기록해 주세요`),
      );
      setNfcScanning(true);
      toast('📡 NFC 스캔을 켰어요');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'NFC 를 켤 수 없어요');
    }
  };

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

  const selectedLoc = data.locations.find((l) => l.id === selected) ?? null;

  const bubble =
    phase === 'awaitTag' && selectedLoc ? (
      <>📱 {selectedLoc.name}의 NFC 태그를 찍어주세요</>
    ) : phase === 'walking' && selectedLoc ? (
      <>🚶 {selectedLoc.name}(으)로 가는 중…</>
    ) : null;

  return (
    <div className={`app tab-${tab}`}>
      <TopBar xp={data.xp} points={data.points} nfcOn={nfcScanning} dayOffset={data.debugDayOffset} />

      <main className="main">
        <div className="home" hidden={tab !== 'home'}>
          <GameView ref={gameRef} data={data} cleanLevels={cleanLevels} selected={selected} onRoomTap={handleRoomTap} bubble={bubble}>
            {phase === 'awaitTag' && selectedLoc && (
              <div className="map-actions pop-in">
                {nfcSupported && !nfcScanning && (
                  <button className="btn primary" onClick={startNfc}>
                    📡 NFC 켜기
                  </button>
                )}
                {prefs.showTestButtons && (
                  <button className="btn" onClick={() => simulateTag(selectedLoc.nfcId)}>
                    ✅ NFC 태그 완료
                  </button>
                )}
                <button className="btn ghost" onClick={closeRoom}>
                  취소
                </button>
              </div>
            )}
          </GameView>

          {phase === 'room' && selectedLoc ? (
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
          ) : (
            <QuestPanel
              data={data}
              now={now}
              onGo={(q) => void goToRoom(q.location)}
              onEdit={(q) => setForm({ quest: q })}
              onAdd={() => setForm({ quest: null })}
              onDiary={() => setTab('record')}
              onPlan={(q) => {
                act({ type: 'planToday', id: q.id });
                toast(`${q.icon} ${q.title} 오늘 추가!`);
              }}
              onUnplan={(q) => act({ type: 'unplanToday', id: q.id })}
            />
          )}
        </div>

        {tab === 'record' && <RecordScreen data={data} now={now} onSaveDiary={(text) => act({ type: 'saveDiary', text })} />}
        {tab === 'closet' && <ClosetScreen data={data} dispatch={act} />}
        {tab === 'settings' && (
          <SettingsScreen
            data={data}
            dispatch={act}
            replaceData={replaceData}
            nfcSupported={nfcSupported}
            nfcScanning={nfcScanning}
            onStartNfc={startNfc}
            showTestButtons={prefs.showTestButtons}
            setShowTestButtons={setShowTestButtons}
            onSimulateTag={simulateTag}
            toast={toast}
          />
        )}
      </main>

      <BottomNav tab={tab} onChange={setTab} />

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
      {showSplash && <Splash onStart={() => setShowSplash(false)} />}
    </div>
  );
}
