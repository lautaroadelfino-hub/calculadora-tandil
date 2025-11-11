"use client";
import { useLayoutEffect, useRef, useState } from "react";

/**
 * Ajusta el font-size para que el contenido entre en 1 línea
 * dentro del ancho del contenedor padre.
 * - Sin pasar `min`/`max`: calcula un rango automáticamente según el font-size base.
 * - Pasando `min`/`max`: usa búsqueda binaria dentro de ese rango (clamp manual).
 */
export default function AutoFitText({ children, min, max, className = "" }) {
  const ref = useRef(null);
  const [fs, setFs] = useState(undefined);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;

    let raf = 0;
    let destroyed = false;
    const PAD = 2; // margen de seguridad

    const autoRange = () => {
      const parentStyle = getComputedStyle(parent);
      const base = parseFloat(parentStyle.fontSize) || 16;
      const hardMin = Math.max(8, Math.floor(base * 0.6));
      const hardMax = Math.max(hardMin + 1, Math.floor(base * 2));
      return [hardMin, hardMax];
    };

    const measureAuto = () => {
      const parentWidth = parent.clientWidth - PAD;
      if (parentWidth <= 0) return;

      const prev = el.style.fontSize;
      el.style.fontSize = "100px";
      const w = el.scrollWidth || 1;
      let size = Math.floor(100 * (parentWidth / w));
      el.style.fontSize = prev;

      const [hardMin, hardMax] = autoRange();
      size = Math.max(hardMin, Math.min(hardMax, size));

      const trySize = (px) => {
        el.style.fontSize = px + "px";
        return el.scrollWidth <= parentWidth;
      };

      let best = size;
      while (best < hardMax && trySize(best + 1)) best++;
      while (best > hardMin && !trySize(best)) best--;

      setFs(best);
      el.style.fontSize = best + "px";
    };

    const measureClamp = () => {
      const parentWidth = parent.clientWidth - PAD;
      if (parentWidth <= 0) return;
      let lo = min, hi = max, best = min;

      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        el.style.fontSize = mid + "px";
        if (el.scrollWidth <= parentWidth) {
          best = mid; lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      setFs(best);
      el.style.fontSize = best + "px";
    };

    const measure = () => {
      if (destroyed) return;
      (typeof min === "number" && typeof max === "number") ? measureClamp() : measureAuto();
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };

    const ro = new ResizeObserver(schedule);
    ro.observe(parent);
    ro.observe(el);

    const mo = new MutationObserver(schedule);
    mo.observe(el, { childList: true, characterData: true, subtree: true });

    schedule();

    return () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
    };
  }, [min, max]);

  return (
    <span ref={ref} style={fs ? { fontSize: fs } : undefined} className={className}>
      {children}
    </span>
  );
}
