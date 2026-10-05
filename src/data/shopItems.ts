import type { ShopItem } from '../core/types';

// 상점 아이템. id 는 캐릭터 스프라이트(src/game/sprites.ts)의 장식 그림과 연결된다.
export const SHOP_ITEMS: ShopItem[] = [
  { id: 'frog_hat', name: '개구리 모자', emoji: '🐸', price: 100, slot: 'hat', description: '개굴! 비 오는 날에도 든든해요' },
  { id: 'strawberry_hat', name: '딸기 모자', emoji: '🍓', price: 120, slot: 'hat', description: '새콤달콤 딸기 꼭지 모자' },
  { id: 'ribbon', name: '리본', emoji: '🎀', price: 80, slot: 'hair', description: '머리에 콕! 분홍 리본' },
  { id: 'cat_ears', name: '고양이 귀', emoji: '🐱', price: 150, slot: 'hair', description: '집사의 마음을 담은 귀' },
  { id: 'flower_pin', name: '꽃 핀', emoji: '🌼', price: 60, slot: 'hair', description: '작은 들꽃 머리핀' },
  { id: 'stripe_shirt', name: '줄무늬 티셔츠', emoji: '👕', price: 90, slot: 'outfit', description: '산뜻한 마린 스트라이프' },
  { id: 'apron', name: '살림 앞치마', emoji: '🧑‍🍳', price: 110, slot: 'outfit', description: '홈프로텍터의 정장' },
  { id: 'raincoat', name: '노란 우비', emoji: '🧥', price: 140, slot: 'outfit', description: '반짝반짝 노란 우비' },
  { id: 'baguette_bag', name: '바게트 가방', emoji: '🥖', price: 120, slot: 'bag', description: '빵 한 줄 꽂고 출동' },
  { id: 'duster', name: '먼지털이', emoji: '🪶', price: 70, slot: 'extra', description: '살랑살랑 먼지 퇴치' },
  { id: 'sparkle', name: '반짝이 오라', emoji: '✨', price: 200, slot: 'extra', description: '초특급의 기운이 흘러요' },
];

export function findItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((i) => i.id === id);
}
