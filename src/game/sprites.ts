import type { ItemSlot } from '../core/types';
import { C } from './palette';
import { sprite, type Ctx, type Palette } from './pixel';

// ─────────────────────────────────────────────────────────────
// 캐릭터 도트 (16 × 24 px)
//  k 외곽선  h/H 머리  s/S 피부  e 눈  w 하이라이트  c 볼터치  m 입
//  t/T 상의  p 바지  f 신발
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
  '.kttttttttttttk.',
  'kttkttttttttkttk',
  'kttkttttttttkttk',
  'kTTkTTTTTTTTkTTk',
  'ksskttttttttkssk',
  '.kk.kppppppk.kk.',
  '....kppppppk....',
];

const BACK_BODY = [
  '..kttttttttttk..',
  ...FRONT_BODY.slice(1),
];

const SIDE_BODY = [
  '...kttttttttk...',
  '..kttttttttttk..',
  '...kttTTtttk....',
  '...kttTTtttk....',
  '...kTTssTTTk....',
  '...kttsstttk....',
  '...kpppppppk....',
  '...kpppppppk....',
];

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
  t: '#ffb3c7',
  T: '#ef8fab',
  p: '#6d74b5',
  f: '#5a3a30',
};

/** 옷 아이템은 팔레트를 바꿔서 표현한다 */
const OUTFIT_PALETTES: Record<string, Partial<Palette>> = {
  stripe_shirt: { t: '#ffffff', T: '#4b5a8f' },
  apron: { t: '#fff3e0', T: '#ffb37a', p: '#7c86c9' },
  raincoat: { t: '#ffd34d', T: '#e6a92e', p: '#ffd34d' },
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
  sprite(ctx, rows, pal, x, y, flip);
  if (equipped.outfit === 'apron' && dir === 'down') {
    // 앞치마 주머니
    ctx.fillStyle = '#ff9a5c';
    ctx.fillRect(x + 6, y + 15, 4, 1);
  }
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
    ['k.k.........', 'kokk........', 'koook...kk..', 'kowok..k....', 'kpooookk....', '.koooooook..', '.koooooook..', '..kook.kok..', '..k.k...k.k.', '............'],
    ['k.k.........', 'kokk........', 'koook...kk..', 'kowok..k....', 'kpooookk....', '.koooooook..', '.koooooook..', '..kok..kook.', '...k.k.k.k..', '............'],
  ],
  sit: [
    '..........kk',
    'k.k......k..',
    'kokk.....k..',
    'koook...kok.',
    'kowok..kook.',
    'kpoooookook.',
    '.koooooook..',
    '.kooooooook.',
    '.kkkkkkkkkk.',
    '............',
  ],
};

export const CAT_PALETTE: Palette = { k: C.outline, o: '#f5b971', w: '#2b1d24', p: '#ff9aa8' };
