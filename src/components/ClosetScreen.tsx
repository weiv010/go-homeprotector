import type { GameData, ItemSlot } from '../core/types';
import { SHOP_ITEMS } from '../data/shopItems';
import { SLOT_LABELS } from '../data/options';
import { CharacterPreview } from './CharacterPreview';
import type { GameAction } from '../core/game';

interface Props {
  data: GameData;
  dispatch(a: GameAction): void;
}

const SLOTS: ItemSlot[] = ['hat', 'hair', 'outfit', 'bag', 'extra'];

/** 👗 MY CLOSET + 🛒 SHOP */
export function ClosetScreen({ data, dispatch }: Props) {
  const owned = SHOP_ITEMS.filter((i) => data.ownedItems.includes(i.id));
  const forSale = SHOP_ITEMS.filter((i) => !data.ownedItems.includes(i.id));

  return (
    <div className="screen">
      <section className="card pixel-box closet-hero">
        <h2>👗 MY CLOSET</h2>
        <CharacterPreview equipped={data.equipped} />
        <div className="slot-row">
          {SLOTS.map((s) => {
            const item = SHOP_ITEMS.find((i) => i.id === data.equipped[s]);
            return (
              <button
                key={s}
                className={`slot ${item ? 'filled' : ''}`}
                onClick={() => item && dispatch({ type: 'unequip', slot: s })}
                title={item ? '눌러서 벗기' : ''}
              >
                <span className="slot-emoji">{item?.emoji ?? '·'}</span>
                <span className="slot-label">{SLOT_LABELS[s]}</span>
              </button>
            );
          })}
        </div>
        {owned.length > 0 ? (
          <div className="item-grid">
            {owned.map((i) => {
              const on = data.equipped[i.slot] === i.id;
              return (
                <button
                  key={i.id}
                  className={`item-card ${on ? 'on' : ''}`}
                  onClick={() => dispatch(on ? { type: 'unequip', slot: i.slot } : { type: 'equip', itemId: i.id })}
                >
                  <span className="item-emoji">{i.emoji}</span>
                  <span className="item-name">{i.name}</span>
                  <span className="item-tag">{on ? '장착 중' : '입기'}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="muted center">아직 아이템이 없어요. 일기를 쓰고 P를 모아 보세요!</p>
        )}
      </section>

      <section className="card pixel-box">
        <div className="row between center-y">
          <h2>🛒 SHOP</h2>
          <span className="chip points">🪙 {data.points}P</span>
        </div>
        <div className="item-grid">
          {forSale.map((i) => {
            const affordable = data.points >= i.price;
            return (
              <button
                key={i.id}
                className={`item-card shop ${affordable ? '' : 'locked'}`}
                disabled={!affordable}
                onClick={() => dispatch({ type: 'buyItem', itemId: i.id })}
              >
                <span className="item-emoji">{i.emoji}</span>
                <span className="item-name">{i.name}</span>
                <span className="item-desc">{i.description}</span>
                <span className="item-tag price">{i.price}P</span>
              </button>
            );
          })}
          {forSale.length === 0 && <p className="muted center">상점의 모든 아이템을 모았어요! 🎉</p>}
        </div>
      </section>
    </div>
  );
}
