import type { ItemSlot } from '../core/types';
import { C } from './palette';
import { sprite, type Ctx, type Palette } from './pixel';

// ─────────────────────────────────────────────────────────────
// 캐릭터 도트 (16 × 24 px)
//  k 외곽선  h/H 머리  s/S 피부  e 눈  w 하이라이트  c 볼터치  m 입
//  t/T 상의(흰 티)  o/O 멜빵바지(단추)  p 바지  f 신발  — 타이틀 캐릭터처럼 똥머리 + 멜빵
// ─────────────────────────────────────────────────────────────

export const CHAR_W = 16;
export const CHAR_H = 24;

export type Facing = 'down' | 'up' | 'left' | 'right';

const HEAD_TOP = [
  '....kkkkkkkk....',
  '..kkhhhhhhhhkk..',
  '.khhhHHhhhhhhhk.',
  '.khhHhhhhhhhhhk.',
  'khhhhhhhhhhhhhhk',
];

const DOWN_HEAD = [
  ...HEAD_TOP,
  'khhhshhhhhhshhhk',
  'khhsssssssssshhk',
  'khssewsssswesshk',
  'khsseessssseeshk',
  'khsccssssssccshk',
  '.ksssssmmsssssk.',
  '..kSSSSSSSSSSk..',
];

const UP_HEAD = [
  ...HEAD_TOP,
  'khhhhhhhhhhhhhhk',
  'khhhhhhhhhhhhhhk',
  'khhhhHhhhhhhhhhk',
  'khhhhhhhhhhhhhhk',
  'khhhhhhhhhhhhhhk',
  '.khhhhhhhhhhhhk.',
  '..khhhhhhhhhhk..',
];

const SIDE_HEAD = [
  ...HEAD_TOP,
  'khhhhhhhsssshhhk',
  'khhhhhhsssssssk.',
  'khhhhhsssssewsk.',
  'khhhhhssssseesk.',
  'khhhhsssssccssk.',
  '.khhhsssssssmsk.',
  '..khhSSSSSSSSk..',
];

const FRONT_BODY = [
  '..kttttSSttttk..',
  '.kttottttttottk.',
  'kttkooooooookttk',
  'kttkoOooooOokttk',
  'kTTkooooooookTTk',
  'ksskooooooookssk',
  '.kk.kppppppk.kk.',
  '....kppppppk....',
];

const BACK_BODY = [
  '..kttttttttttk..',
  '.kttottttttottk.',
  'kttkttoootttkttk',
  'kttkooooooookttk',
  ...FRONT_BODY.slice(4),
];

const SIDE_BODY = [
  '...kttttttttk...',
  '..kttttotttttk..',
  '...kttooooook...',
  '...kttooOoook...',
  '...kTTssooook...',
  '...kttssooook...',
  '...kpppppppk....',
  '...kpppppppk....',
];

/** 정수리 똥머리 (스프라이트 위로 3px 튀어나온다) */
const BUN = ['.kkkk.', 'khhHhk', 'khhhhk', '.khhk.'];

const FRONT_LEGS = [
  ['....kppkkppk....', '....kppkkppk....', '....kffkkffk....', '.....kk..kk.....'],
  ['....kppkkppk....', '....kffkkppk....', '.....kk.kffk....', '.........kk.....'],
  ['....kppkkppk....', '....kppkkffk....', '....kffk.kk.....', '.....kk.........'],
];

const SIDE_LEGS = [
  ['....kppkppk.....', '....kppkppk.....', '....kffkffk.....', '.....kk.kk......'],
  ['...kppk.kppk....', '..kppk...kppk...', '..kffk...kffk...', '...kk.....kk....'],
  ['....kppkppk.....', '....kppkppk.....', '....kffkffk.....', '.....kk.kk......'],
];

function build(head: string[], body: string[], legs: string[][]): string[][] {
  return legs.map((l) => [...head, ...body, ...l]);
}

export const CHARACTER_FRAMES: Record<'down' | 'up' | 'side', string[][]> = {
  down: build(DOWN_HEAD, FRONT_BODY, FRONT_LEGS),
  up: build(UP_HEAD, BACK_BODY, FRONT_LEGS),
  side: build(SIDE_HEAD, SIDE_BODY, SIDE_LEGS),
};

const BASE_PALETTE: Palette = {
  k: C.outline,
  h: '#7a4a35',
  H: '#a2674b',
  s: '#ffdcc0',
  S: '#f0b995',
  e: '#2b1d24',
  w: '#ffffff',
  c: '#ff9aa8',
  m: '#c0546a',
  t: '#fffaf0',
  T: '#e8dcc8',
  o: '#4f78c2',
  O: '#ffd866',
  p: '#3f62a6',
  f: '#5a3a30',
};

/** 옷 아이템은 팔레트를 바꿔서 표현한다 */
const OUTFIT_PALETTES: Record<string, Partial<Palette>> = {
  stripe_shirt: { t: '#ffffff', T: '#4b5a8f', o: '#c9534f', p: '#a8403d' },
  apron: { o: '#fff3e0', O: '#ff9a5c', T: '#e8d6c0' },
  raincoat: { t: '#ffd34d', T: '#e6a92e', o: '#ffd34d', O: '#e6a92e', p: '#e6a92e' },
};

// ─────────────────────────────────────────────────────────────
// 장식 아이템 도트 (캐릭터 왼쪽 위 기준 오프셋)
// ─────────────────────────────────────────────────────────────

interface Overlay {
  dx: number;
  dy: number;
  rows: string[];
  pal: Palette;
  /** 뒷모습일 때 그리지 않음 (얼굴 앞쪽 장식) */
  hideBack?: boolean;
  /** 가방처럼 캐릭터 뒤에 그려야 하는 방향 */
  behindWhen?: Facing[];
}

const OVERLAYS: Record<string, Overlay> = {
  frog_hat: {
    dx: 1,
    dy: -4,
    pal: { k: C.outline, g: '#8fd36b', G: '#6bb04c', w: '#ffffff', e: '#2b1d24', c: '#ff9aa8' },
    rows: [
      '..kkk....kkk..',
      '.kwek....kwek.',
      '.kggkkkkkkggk.',
      'kggggggggggggk',
      'kgcggggggggcgk',
      'kGGGGGGGGGGGGk',
      '.kkkkkkkkkkkk.',
    ],
  },
  strawberry_hat: {
    dx: 1,
    dy: -4,
    pal: { k: C.outline, g: '#6fc46a', r: '#f2606b', y: '#ffe28a' },
    rows: [
      '....kgggggk...',
      '..kkrgggggrkk.',
      '.krrrryrrrrrk.',
      'krryrrrrryrrrk',
      'krrrrryrrrrrrk',
      '.kkkkkkkkkkkk.',
    ],
  },
  ribbon: {
    dx: 9,
    dy: -1,
    pal: { k: C.outline, P: '#ff7fa8', p: '#ffc2d6' },
    rows: ['kk...kk', 'kPk.kPk', 'kpPkPpk', 'kPk.kPk', 'kk...kk'],
  },
  cat_ears: {
    dx: 0,
    dy: -3,
    pal: { k: C.outline, h: '#7a4a35', P: '#ffb3c7' },
    rows: ['.k............k.', '.kk..........kk.', '.khk........khk.', '.kPhk......khPk.'],
  },
  flower_pin: {
    dx: 11,
    dy: 1,
    pal: { Y: '#fff27a', O: '#ff9f43', k: C.outline },
    rows: ['.Y.', 'YOY', '.Y.'],
  },
  baguette_bag: {
    dx: 11,
    dy: 8,
    behindWhen: ['left'],
    pal: { k: C.outline, b: '#f0c27a', B: '#c98f45', L: '#a8674a', l: '#ffd866' },
    rows: [
      '..kk.',
      '.kbbk',
      '.kBbk',
      '.kbbk',
      '.kbBk',
      '.kbbk',
      'kkkkk',
      'kLLLk',
      'kLlLk',
      'kLLLk',
      'kkkkk',
    ],
  },
  duster: {
    dx: -3,
    dy: 9,
    pal: { P: '#ff9fd0', Q: '#b79be8', k: C.outline },
    rows: ['.PQ.', 'QPPQ', 'PQPP', '.QP.', '..k.', '..k.', '..k.', '..k.'],
  },
};

export function characterPalette(equipped: Partial<Record<ItemSlot, string>>): Palette {
  const outfit = equipped.outfit ? OUTFIT_PALETTES[equipped.outfit] : undefined;
  return { ...BASE_PALETTE, ...(outfit ?? {}) } as Palette;
}

/**
 * 캐릭터 + 장착 아이템을 그린다. (x, y) 는 스프라이트 왼쪽 위.
 */
export function drawCharacter(
  ctx: Ctx,
  x: number,
  y: number,
  facing: Facing,
  frame: number,
  equipped: Partial<Record<ItemSlot, string>>,
): void {
  const dir = facing === 'left' || facing === 'right' ? 'side' : facing;
  const flip = facing === 'left';
  const rows = CHARACTER_FRAMES[dir][frame % 3];
  const pal = characterPalette(equipped);

  const overlays = (['bag', 'extra', 'hair', 'hat'] as ItemSlot[])
    .map((slot) => equipped[slot])
    .filter((id): id is string => !!id && !!OVERLAYS[id])
    .map((id) => ({ id, o: OVERLAYS[id] }));

  const drawOverlay = (o: Overlay) => {
    const dx = flip ? CHAR_W - o.dx - o.rows[0].length : o.dx;
    sprite(ctx, o.rows, o.pal, x + dx, y + o.dy, flip);
  };

  for (const { o } of overlays) if (o.behindWhen?.includes(facing)) drawOverlay(o);
  sprite(ctx, BUN, pal, x + (flip ? CHAR_W - 5 - BUN[0].length : 5), y - 3, flip);
  sprite(ctx, rows, pal, x, y, flip);
  for (const { o } of overlays) {
    if (o.behindWhen?.includes(facing)) continue;
    if (o.hideBack && dir === 'up') continue;
    drawOverlay(o);
  }
}

// ─────────────────────────────────────────────────────────────
// 고양이 (12 × 10 px)
// ─────────────────────────────────────────────────────────────

export const CAT_FRAMES = {
  walk: [
    ['k.k.........', 'kskk........', 'kosok...kk..', 'kowok..k....', 'kpooskk.....', '.kosososok..', '.koollllok..', '..kook.kok..', '..k.k...k.k.', '............'],
    ['k.k.........', 'kskk........', 'kosok...kk..', 'kowok..k....', 'kpooskk.....', '.kosososok..', '.koollllok..', '..kok..kook.', '...k.k.k.k..', '............'],
  ],
  sit: [
    '..........kk',
    'k.k......k..',
    'kskk.....k..',
    'kosok...ksk.',
    'kowok..kook.',
    'kpososokook.',
    '.kosososok..',
    '.koollllook.',
    '.kkkkkkkkkk.',
    '............',
  ],
};

/** 고등어 무늬 고양이 두 마리 (o 바탕 · s 줄무늬 · l 배) */
export const CAT_PALETTES: Record<'brown' | 'gray', Palette> = {
  brown: { k: C.outline, o: '#b98a5e', s: '#6b4a2f', l: '#ead6b5', w: '#2b1d24', p: '#ff9aa8' },
  gray: { k: C.outline, o: '#a9a8ad', s: '#5c5b63', l: '#e6e4e1', w: '#2b1d24', p: '#ff9aa8' },
};
