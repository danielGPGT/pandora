// components/MorphingBlobBg.tsx
"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

type Props = {
  top?: string;
  left?: string;
  size?: number;
  duration?: number;
};

export default function MorphingBlobBg({
  top = "200px",
  left = "100px",
  size = 1600,
  duration = 12,
}: Props) {
  const blobRef = useRef<HTMLDivElement | null>(null);
  const tlRef = useRef<GSAPTimeline | null>(null);

  const rand = (min: number, max: number) => +(Math.random() * (max - min) + min).toFixed(2);

  const randomBorderRadius = () => {
    const a = rand(40, 60);
    const b = rand(40, 60);
    const c = rand(40, 60);
    const d = rand(40, 60);
    const e = rand(40, 60);
    const f = rand(40, 60);
    const g = rand(40, 60);
    const h = rand(40, 60);
    return `${a}% ${b}% ${c}% ${d}% / ${e}% ${f}% ${g}% ${h}%`;
  };

  useEffect(() => {
    // respect reduced motion
    const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const el = blobRef.current;
    if (!el) return;

    // create timeline
    const tl = gsap.timeline({ repeat: -1, yoyo: true, defaults: { duration, ease: "power1.inOut" } });

    const makeStep = () => ({
      x: rand(-80, 80),
      y: rand(-60, 60),
      scale: rand(0.96, 1.06),
      borderRadius: randomBorderRadius(),
    });

    // three steps -> smooth loop
    tl.to(el, makeStep())
      .to(el, makeStep())
      .to(el, makeStep());

    tlRef.current = tl;

    return () => {
      if (tlRef.current) {
        tlRef.current.kill();
        tlRef.current = null;
      }
      // cleanup inline styles if desired
      if (el) {
        el.style.transform = "";
        el.style.borderRadius = "";
      }
    };
  }, [duration]);

  // sticky+fixed wrapper so the blob visually doesn't scroll but stays
  // contained to the parent element.
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="sticky top-0">
        <div
          ref={blobRef}
          style={{
            top,
            left,
            width: `${size}px`,
            height: `${size}px`,
          }}
          className={`
            fixed z-0 pointer-events-none rounded-full blur-3xl
            bg-[radial-gradient(closest-side,theme(colors.background),theme(colors.primary.800),theme(colors.background))]
          `}
        />
      </div>
    </div>
  );
}
