"use client";
import { useLayoutEffect, useRef, useState } from "react";

/* Disminuye font-size hasta que el contenido entra en el ancho disponible */
export default function AutoFitText({ children, min = 12, max = 48, className = "" }) {
  const ref = useRef(null);
  const [fs, setFs] = useState(max);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const parent = el.parentElement;
    if (!parent) return;

    const ro = new ResizeObserver(() => {
      // probar de max hacia abajo hasta que entre
      let size = max;
      el.style.fontSize = size + "px";
      const pad = 2; // margen de seguridad
      while (size > min && el.scrollWidth > parent.clientWidth - pad) {
        size -= 1;
        el.style.fontSize = size + "px";
      }
      setFs(size);
    });

    ro.observe(parent);
    ro.observe(el);
    return () => ro.disconnect();
  }, [min, max]);

  return (
    <span ref={ref} style={{ fontSize: fs }} className={className}>
      {children}
    </span>
  );
}
