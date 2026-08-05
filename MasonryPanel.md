## MasonryPanel.tsx

```
import { Children, useCallback, useLayoutEffect, useRef, type ReactNode } from "react";
import styles from "./MasonryPanel.module.css";

type Props = {
  children: ReactNode;
  viewMode?: boolean;
  className?: string;
};

export default function MasonryPanel({ children, viewMode = false, className }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const tilesRef = useRef<HTMLDivElement[]>([]);
  const rafRef = useRef<number | null>(null);

  const items = Children.toArray(children);
  tilesRef.current.length = items.length; // drop stale refs when tiles are removed

  const compute = useCallback(() => {
    const panel = panelRef.current;
    const tiles = tilesRef.current.filter(Boolean);
    if (!panel || tiles.length === 0) return;

    // column of each tile, from its left edge only (rounded for subpixel)
    const leftOf = (t: HTMLElement) => Math.round(t.offsetLeft);
    const cols = [...new Set(tiles.map(leftOf))].sort((a, b) => a - b);
    const colIndex = new Map(cols.map((x, i) => [x, i]));
    const C = cols.length;

    // (row, col) per tile + height only
    const seen = new Array(C).fill(0);
    const info = tiles.map((t) => {
      const c = colIndex.get(leftOf(t))!;
      return { t, c, r: seen[c]++, h: t.offsetHeight };
    });
    const R = Math.max(...info.map((i) => i.r)) + 1;

    // tallest tile per row
    const rowH = new Array(R).fill(0);
    for (const i of info) rowH[i.r] = Math.max(rowH[i.r], i.h);

    // row-major walk: offset = previous rows' cumulative undershoot per column
    const colCum = new Array(C).fill(0);
    const order = [...info].sort((a, b) => a.r - b.r || a.c - b.c);
    for (const i of order) {
      i.t.style.setProperty("--masonry-vertical-offset", `${-colCum[i.c]}px`);
      colCum[i.c] += rowH[i.r] - i.h;
    }

    // panel trim = smallest total pull among columns (won't clip content)
    panel.style.setProperty("--masonry-vertical-adjustment", `${-Math.min(...colCum)}px`);
  }, []);

  const schedule = useCallback(() => {
    if (rafRef.current != null) return; // coalesce bursts into one frame
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      compute();
    });
  }, [compute]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const ro = new ResizeObserver(schedule);
    ro.observe(panel);                              // width / column-count flips
    tilesRef.current.filter(Boolean).forEach((t) => ro.observe(t)); // tile heights

    schedule(); // initial pass

    let cancelled = false;
    document.fonts?.ready.then(() => { if (!cancelled) schedule(); }); // web-font reflow

    return () => {
      cancelled = true;
      ro.disconnect();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [items.length, schedule]);

  return (
    <div
      ref={panelRef}
      className={[styles.panel, viewMode ? styles.view : "", className].filter(Boolean).join(" ")}
    >
      {items.map((child, i) => (
        <div
          key={i}
          className={styles.tile}
          ref={(el) => { if (el) tilesRef.current[i] = el; }}
        >
          {child}
        </div>
      ))}
    </div>

  );
}
```

## MasonryPanel.module.css

```
.panel {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  align-items: start;              /* rows don't stretch to match tallest tile */
  transition: margin-bottom 300ms ease;
}

@media (max-width: 900px) { .panel { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .panel { grid-template-columns: 1fr; } }

.tile {
  min-width: 0;                    /* let grid tracks shrink; avoids overflow */
  margin-top: 0;                   /* edit mode: plain grid */
  transition: margin-top 300ms ease;
}

/* view mode consumes the JS-computed vars -> animates into masonry offsets */
.view .tile { margin-top: var(--masonry-vertical-offset, 0); }
.view       { margin-bottom: var(--masonry-vertical-adjustment, 0); }

@media (prefers-reduced-motion: reduce) {
  .panel, .tile { transition: none; }
}
```


## Usage

```
<MasonryPanel viewMode={mode === "view"}>
  {posts.map((p) => <Card key={p.id} {...p} />)}
</MasonryPanel>
```
