# 🏠 GO! 홈프로텍터

![GO! 홈프로텍터](src/assets/title.webp)

> 🏆 초특급 홈프로텍터가 되자!

현실의 집과 게임 속 집을 1:1 로 연결한 **생활 관리 게임 웹앱**(모바일 우선 PWA)입니다.
현실에서 집안일을 하면 게임 속 집이 깨끗해지고, 캐릭터가 성장합니다.

“게임을 하는 것 같지만 사실 나는 내 집을 돌보고 있다.”

## 실행하기

```bash
npm install
npm run dev        # 개발 서버 (같은 와이파이의 휴대폰에서 http://<PC IP>:5173 로 접속 가능)
npm test           # 게임 규칙 / 맵 / 스프라이트 테스트
npm run build      # 배포용 빌드 → dist/
npm run preview    # 빌드 결과 미리보기
```

> Web NFC 와 PWA 설치는 **HTTPS** 에서만 동작합니다. 휴대폰에서 실제로 쓰려면 아래 배포를 이용하세요.

### GitHub Pages 배포
기본 브랜치(`claude/vigilant-planck-875dwf`) 또는 `main` 에 push 하면 `.github/workflows/deploy.yml` 이
자동으로 빌드·배포합니다. (Settings → Pages → Source = **GitHub Actions**)

**앱 주소: https://weiv010.github.io/go-homeprotector/**

## 게임 흐름

```
게임에서 공간(또는 퀘스트) 선택 → 캐릭터가 걸어감
→ "📱 주방의 NFC 태그를 찍어주세요"
→ 현실의 주방에서 NFC 태그 → 📱 NFC DETECTED! 🏃💨💨 (빠르게 달려감)
→ 🍽️ 오늘의 주방 퀘스트 → 완료! → QUEST COMPLETE! +10 XP ✨ HOME CLEAN!
→ XP 가 쌓이면 LEVEL UP! / 타이틀 상승
```

| 화면 | 내용 |
| --- | --- |
| 🏠 집 | 도트 집 맵(메인 화면) + **전체 할 일**에서 “오늘 하기”로 고른 **TODAY'S QUEST**(✕ 로 빼기, 다음 날 새로 시작), `+` 로 추가, ✏️ 로 수정·삭제 |
| 📖 기록 | 오늘의 기록(완료 퀘스트·XP·P), 일기 작성(하루 1번 +10P), 지난 기록 |
| 👗 옷장 | MY CLOSET(장착/해제) + SHOP(P 로 구매하면 바로 장착) |
| ⚙️ 설정 | NFC, 공간 이름·NFC ID, 태그 URL 복사, 테스트 도구, 백업/복원 |

### 집 상태
퀘스트마다 반복 주기가 있고, 주기가 지나면 그 공간이 점점 지저분해집니다. (예: 2일 주기)

| 마지막 완료 후 | 상태 | 맵 |
| --- | --- | --- |
| 0~1일 | ✨ 깨끗함 | 반짝반짝 |
| 2일 | 🧽 관리 필요 | 물건 2개 |
| 3일 | 💦 지저분함 | 물건 4개 + 날파리 |
| 4일 이상 | 🌀 매우 지저분함 | 물건 7개 + 쓰레기봉투 + 냄새 |

공간 상태 = 그 공간 퀘스트 중 가장 밀린 것 기준. 요가·작업처럼 집 상태와 무관한 퀘스트는
“집 상태에 반영하기”를 끄면 됩니다. 처음 만든 퀘스트는 만든 날부터 계산하므로 시작하자마자 더러워지지 않아요.

**XP 와 P 는 완전히 분리**되어 있습니다. 생활 퀘스트 → XP(레벨/타이틀), 일기 → P(옷장 아이템 구매 전용).

## NFC 설정

NFC 는 `src/nfc/nfc.ts` 에 추상화되어 있어, 어떤 방식으로 인식하든 게임에는 `NFC_LOCATION_ID` 만 전달됩니다.
NFC 가 안 되는 환경에서도 게임의 핵심 루프는 모두 동작합니다.

| 방식 | 기기 | 방법 |
| --- | --- | --- |
| **태그 URL** (추천) | 아이폰·안드로이드 모두 | 설정 → 🔗 태그 URL 복사 → NFC Tools 같은 앱으로 태그에 **URL 레코드**로 기록. 태그를 찍으면 앱이 `?tag=kitchen_nfc` 로 열리며 자동 인식. 같은 URL 로 QR 코드를 만들어도 됨 |
| **Web NFC** | 안드로이드 크롬 | “NFC 켜기”를 누르면 앱 안에서 바로 읽음. 태그에는 위 URL 또는 텍스트 `kitchen_nfc` 를 기록 |
| **테스트 버튼** | 모든 환경 | 공간에 도착하면 나오는 “✅ NFC 태그 완료” 버튼 (설정에서 숨길 수 있음 → 릴스 촬영용) |

### 실제로 붙이는 태그 6개 (태그에 아래 URL 을 기록)

| 위치 | NFC ID | 태그에 기록할 URL |
| --- | --- | --- |
| 🧺 세탁실 | `washing_machine_nfc` | https://weiv010.github.io/go-homeprotector/?tag=washing_machine_nfc |
| 💻 책상 (작업 Zone) | `desk_nfc` | https://weiv010.github.io/go-homeprotector/?tag=desk_nfc |
| 👚 옷방 | `closet_nfc` | https://weiv010.github.io/go-homeprotector/?tag=closet_nfc |
| 🍳 주방 | `kitchen_nfc` | https://weiv010.github.io/go-homeprotector/?tag=kitchen_nfc |
| 🐈 고양이 Zone | `cat_tower_nfc` | https://weiv010.github.io/go-homeprotector/?tag=cat_tower_nfc |
| 🛏️ 침대 | `bedroom_nfc` | https://weiv010.github.io/go-homeprotector/?tag=bedroom_nfc |

화장실·거실은 태그 없이, 캐릭터가 도착하면 바로 퀘스트 창이 열립니다.
앱의 설정 → “📋 모든 태그 URL 한 번에 복사”로도 받을 수 있어요.

> ⚠️ 아이폰: 홈 화면에 추가한 앱(PWA)과 사파리는 저장 공간이 따로입니다. 태그 URL 은 사파리로 열리므로,
> 아이폰에서 태그 URL 방식을 쓸 때는 **사파리에서 바로 사용**하는 것을 추천합니다.

## 내 집에 맞게 바꾸기

모든 게임 데이터는 코드에서 쉽게 고칠 수 있도록 `src/data/` 에 모여 있습니다.

| 파일 | 내용 |
| --- | --- |
| `src/data/houseMap.ts` | **집 맵** (손그림 평면도 기준 22×14 타일): 공간 영역, 같은 방으로 이어진 구역(`room`), 가구, 문, 캐릭터가 서는 위치, NFC ID |
| `src/data/defaultQuests.ts` | 처음 시작할 때의 퀘스트 |
| `src/data/titles.ts` | 레벨별 타이틀과 필요 XP |
| `src/data/shopItems.ts` | 상점 아이템과 가격 |
| `src/data/options.ts` | 시간대·반복 주기·아이콘·일기 포인트 |

> 맵(공간 영역·가구·문)은 항상 `houseMap.ts` 의 최신 내용을 쓰고, 앱에서 바꾼 공간 이름·NFC ID 만 저장됩니다.
> 그래서 맵을 고쳐도 기록·XP 는 그대로 유지돼요.

## 코드 구조

```
src/
├─ core/          게임 규칙 (React 와 무관한 순수 TS — 테스트 대상)
│  ├─ types.ts        모든 데이터 타입 (GameData = 저장 데이터)
│  ├─ game.ts         applyAction(): 퀘스트 완료·일기·구매 등 모든 규칙 + 연출 이벤트
│  ├─ quests.ts       퀘스트 상태, 반복 주기 → 집 상태 계산
│  ├─ progression.ts  XP → 레벨/타이틀
│  ├─ storage.ts      GameRepository 인터페이스 + localStorage 구현 (서버 DB 로 교체 가능)
│  └─ time.ts         달력 날짜 계산
├─ data/          집 맵·퀘스트·타이틀·아이템 데이터
├─ game/          캔버스 도트 엔진
│  ├─ engine.ts       맵 렌더링, 캐릭터 이동(걷기/대시), 고양이, 파티클
│  ├─ pathfinding.ts  타일 길찾기 (문으로만 공간 이동)
│  ├─ sprites.ts      캐릭터(16×24)·장식 아이템·고양이 도트
│  ├─ furniture.ts    가구 도트
│  └─ mess.ts         지저분함 오브젝트 도트
├─ nfc/nfc.ts     NFC 추상화 (Web NFC / URL / 테스트)
├─ components/    화면 UI (React)
└─ App.tsx        게임 진행 흐름 (공간 선택 → 이동 → NFC → 퀘스트)
```

- 도트 기준: 타일 16×16px, 캐릭터 16×24px(+똥머리), 맵 내부 해상도 364×252px 을 정수 배율로 확대(Nearest Neighbor)
- 세로 화면에서는 카메라가 캐릭터를 따라가고(옆으로 끌어서 둘러보기), 🏠 버튼으로 집 전체 보기
- 색감은 타이틀 로고에 맞춘 따뜻한 크림·원목 톤
- 폰트: [Galmuri](https://github.com/quiple/galmuri) (SIL OFL 1.1)

## 개발 단계 현황

- [x] STEP 1 도트 집 맵 + 캐릭터 이동 (걷기 애니메이션)
- [x] STEP 2 공간 선택 → 캐릭터 이동
- [x] STEP 3 퀘스트 데이터 구조 (위치·NFC 연결)
- [x] STEP 4 퀘스트 추가 / 수정 / 삭제 (삭제 확인)
- [x] STEP 5 퀘스트 완료 → XP
- [x] STEP 6 반복 주기에 따른 집 상태 변화 (맵 그래픽 변화)
- [x] STEP 7 레벨 / 타이틀
- [x] STEP 8 일기 → +10P
- [x] STEP 9 상점 + 옷장 (캐릭터에 아이템 표시)
- [x] STEP 10 NFC 연동 (Web NFC / 태그 URL / 테스트 버튼)
- [x] STEP 11 QUEST COMPLETE / LEVEL UP / NEW ITEM / NFC DETECTED 연출
- [x] STEP 12 숏폼 촬영용 연출 (큰 도트 텍스트, 컨페티, 테스트 버튼 숨기기, 시간 여행으로 상태 변화 촬영)

### 다음에 해볼 것
- 앱 안에서 공간 추가·맵 편집
- 오늘의 생활 기록을 숏폼용 요약 카드/영상으로 내보내기 (현실 타임랩스 + 퀘스트 + XP + 집 상태)
- 서버 DB 동기화 (`GameRepository` 구현 추가)
