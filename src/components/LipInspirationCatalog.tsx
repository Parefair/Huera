import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import type { LipstickProduct } from "../types/color";
import LIPSTICK_DATABASE from "../utils/lipsstickDb";

interface LipInspirationCatalogProps {
  onSelectProduct: (product: LipstickProduct) => void;
}

export default function LipInspirationCatalog({
  onSelectProduct,
}: LipInspirationCatalogProps) {
  const [position, setPosition] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const dragStartX = useRef<number | null>(null);
  const didDrag = useRef(false);
  const products = [
    LIPSTICK_DATABASE[LIPSTICK_DATABASE.length - 1],
    ...LIPSTICK_DATABASE,
    LIPSTICK_DATABASE[0],
  ];

  const move = (direction: -1 | 1) => {
    setIsTransitioning(true);
    setPosition((currentPosition) => currentPosition + direction);
  };

  useEffect(() => {
    const timer = window.setInterval(() => move(1), 4000);
    return () => window.clearInterval(timer);
  }, []);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragStartX.current = event.clientX;
    didDrag.current = false;
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null) return;

    const distance = event.clientX - dragStartX.current;
    if (Math.abs(distance) > 40) {
      didDrag.current = true;
      move(distance > 0 ? -1 : 1);
    }
    dragStartX.current = null;
  };

  const handleTransitionEnd = () => {
    if (position === products.length - 1) {
      setIsTransitioning(false);
      setPosition(1);
    } else if (position === 0) {
      setIsTransitioning(false);
      setPosition(products.length - 2);
    }
  };

  return (
    <section className="mt-6 w-full">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-[#473636]">
            Lips inspiration!
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Try different lip colors from our catalog.
          </p>
        </div>
      </div>

      <div
        className="relative touch-pan-y select-none overflow-hidden px-7 py-2"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          dragStartX.current = null;
        }}
      >
        <button
          type="button"
          aria-label="Previous lip colors"
          onClick={() => move(-1)}
          className="absolute left-0 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#d9aaa5] bg-white text-[#b04f4f] shadow-sm transition hover:bg-rose-50"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            ‹
          </span>
        </button>
        <button
          type="button"
          aria-label="Next lip colors"
          onClick={() => move(1)}
          className="absolute right-0 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#d9aaa5] bg-white text-[#b04f4f] shadow-sm transition hover:bg-rose-50"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            ›
          </span>
        </button>
        <div
          className={`flex ${isTransitioning ? "transition-transform duration-500 ease-out" : ""}`}
          style={{ transform: `translateX(-${(position - 1) * (100 / 3)}%)` }}
          onTransitionEnd={handleTransitionEnd}
        >
          {products.map((product, index) => {
            const isActive = index === position;
            return (
              <button
                key={`${product.SKU}-${index}`}
                type="button"
                onClick={() => {
                  if (!didDrag.current) onSelectProduct(product);
                  didDrag.current = false;
                }}
                className={`group min-w-0 flex-[0_0_33.333%] px-1.5 text-left transition duration-700 ${
                  isActive ? "relative z-10 scale-110" : "scale-80 opacity-55"
                }`}
              >
                <span className="block overflow-hidden rounded-xl transition duration-200 hover:-translate-y-0.5">
                  <span className="relative block aspect-square">
                    <img
                      src={product.imageUrl}
                      alt={`${product.brand} ${product.colorName}`}
                      className="h-full w-full object-contain"
                    />
                    <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-[#473636]/90 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm transition group-hover:bg-[#b04f4f]">
                      Try →
                    </span>
                  </span>
                  <span className="block px-2 py-2 text-center sm:px-3">
                    <span className="block truncate text-[9px] font-bold uppercase tracking-wide text-gray-400 sm:text-[10px]">
                      {product.brand}
                    </span>
                    <span className="mt-0.5 block min-h-8 text-[10px] font-bold leading-4 text-gray-700 sm:text-xs">
                      {product.colorName}
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
