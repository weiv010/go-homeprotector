import { useEffect, useRef } from 'react';
import type { ItemSlot } from '../core/types';
import { drawCharacter, type Facing } from '../game/sprites';

const W = 32;
const H = 36;
const FACINGS: Facing[] = ['down', 'right', 'up', 'left'];

/** 옷장에서 보여주는 큰 캐릭터 (빙글빙글 돌며 걷기) */
export function CharacterPreview({ equipped }: { equipped: Partial<Record<ItemSlot, string>> }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const equippedRef = useRef(equipped);
  equippedRef.current = equipped;

  useEffect(() => {
    const canvas = ref.current!;
    const scale = 8;
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    const loop = (t: number) => {
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(59,37,48,0.18)';
      ctx.fillRect(10, 32, 12, 2);
      const facing = FACINGS[Math.floor(t / 1600) % 4];
      const frame = 1 + (Math.floor(t / 180) % 2);
      drawCharacter(ctx, 8, 9 - (frame === 2 ? 1 : 0), facing, frame, equippedRef.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} className="char-preview" />;
}
