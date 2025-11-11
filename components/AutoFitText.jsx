"use client";
import { useLayoutEffect, useRef, useState } from "react";

/** Ajusta el font-size para que el contenido entre en el ancho del contenedor padre (una línea). */
export default function AutoFitText({ children, min = 12, max = 48, className = "" }) {
  const ref = useRef(null);
  const [fs, setFs] = useState(max);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;

    let raf = 0;
    let destroyed = false;

    const PAD = 2; // margen de seguridad px

    const measure = () => {
      if (destroyed) return;

      // Caso extremo: si ni el mínimo entra, clavar min y salir.
      el.style.fontSize = min + "px";
      const parentWidth = parent.clientWidth - PAD;
      if (el.scrollWidth > parentWidth) {
        setFs(min);
        return;
      }

      // Búsqueda binaria para el mayor size que entra
      let lo = min;
      let hi = max;
      let best = min;

      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        el.style.fontSize = mid + "px";
        const fits = el.scrollWidth <= parentWidth;
        if (fits) {
          best = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }

      setFs(best);
      el.style.fontSize = best + "px";
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };

    // Observadores
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    ro?.observe(parent);
    ro?.observe(el);

    const mo = typeof MutationObserver !== "undefined" ? new MutationObserver(schedule) : null;
    mo?.observe(el, { childList: true, characterData: true, subtree: true });

    // Primera medición
    schedule();

    return () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      mo?.disconnect();
    };
  }, [min, max]);

  return (
    <span ref={ref} style={{ fontSize: fs }} className={className}>
      {children}
    </span>
  );
}
