"use client";

import { useEffect, useRef, useState } from "react";

export default function ScrollHero() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const root = section.current,
      host = stage.current;
    if (!root || !host) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let orbit:
      | Awaited<ReturnType<typeof import("./orbit-scene").createOrbit>>
      | undefined;
    let frame = 0;
    function update() {
      frame = 0;
      if (!root) return;
      if (root.getBoundingClientRect().bottom < 0) return;
      const progress = media.matches
        ? 0
        : Math.max(
            0,
            Math.min(
              1,
              -root.getBoundingClientRect().top /
                Math.max(1, root.offsetHeight - window.innerHeight),
            ),
          );
      orbit?.update(progress);
      root.style.setProperty("--orbit-progress", String(progress));
      root.style.setProperty("--logo-scale", String(1 + progress * 0.065));
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    import("./orbit-scene")
      .then(({ createOrbit }) => createOrbit(host))
      .then((result) => {
        if (disposed) {
          result.dispose();
          return;
        }
        orbit = result;
        setReady(true);
        update();
      })
      .catch(() => {
        /* The studio render remains visible when WebGL is unavailable. */
      });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    media.addEventListener("change", schedule);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      media.removeEventListener("change", schedule);
      orbit?.dispose();
    };
  }, []);
  return (
    <section
      className="rv-hero"
      id="top"
      ref={section}
      aria-labelledby="hero-heading"
    >
      <div className="rv-hero-sticky">
        <h1 id="hero-heading">
          Your next
          <br />
          <span>good thing.</span>
        </h1>
        <div className={`rv-orbit ${ready ? "is-ready" : ""}`}>
          <img
            className="rv-orbit-fallback"
            src="/rovera-logo-optimized.webp"
            alt="Rovera's spiral-and-tail logo"
            width="1024"
            height="1024"
            fetchPriority="high"
          />
          <div
            ref={stage}
            className="rv-orbit-canvas"
            role="img"
            aria-label="Rovera's three-dimensional logo, rotating as you scroll"
          />
        </div>
        <svg
          className="rv-scroll-wave"
          viewBox="0 0 1440 420"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            fill="#c8c9c5"
            d="M0 72 C150 28 260 118 420 91 C565 67 600 32 750 73 C910 118 1030 124 1165 79 C1277 42 1355 41 1440 82 V420 H0Z"
          />
          <path
            fill="#858783"
            d="M0 146 C155 98 264 188 421 164 C580 139 627 94 771 142 C923 193 1037 200 1172 153 C1285 114 1362 118 1440 159 V420 H0Z"
          />
          <path
            fill="#171717"
            d="M0 242 C142 206 278 284 432 265 C590 246 638 203 780 239 C932 278 1054 303 1186 259 C1291 224 1367 216 1440 251 V420 H0Z"
          />
        </svg>
      </div>
    </section>
  );
}
