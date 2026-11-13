import React, { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

interface Props {
  whatsappNumber?: string;
}

// Fórmulas de física extraídas de sunset.com.py / xbri.com.py
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOutCubic = (v: number) => 1 - (1 - v) ** 3;
const easeOutBack = (v: number) => 1 + 2.70158 * (v - 1) ** 3 + 1.70158 * (v - 1) ** 2;

const SMOKE_IMPACT = [
  { start: 0.6, dx: -34, dy: -26, size: 20, life: 0.85, alpha: 0.55 },
  { start: 0.63, dx: -16, dy: -40, size: 16, life: 0.95, alpha: 0.42 },
  { start: 0.61, dx: 30, dy: -22, size: 18, life: 0.8, alpha: 0.5 },
  { start: 0.66, dx: 12, dy: -34, size: 14, life: 0.9, alpha: 0.38 },
  { start: 0.7, dx: -44, dy: -10, size: 13, life: 1.0, alpha: 0.3 },
];

const SMOKE_TRAIL = [
  { start: 2.34, dx: -30, dy: -30, size: 20, life: 0.8, alpha: 0.5 },
  { start: 2.46, dx: -8, dy: -38, size: 17, life: 0.85, alpha: 0.45 },
  { start: 2.58, dx: 22, dy: -34, size: 16, life: 0.85, alpha: 0.4 },
  { start: 2.7, dx: 56, dy: -28, size: 15, life: 0.85, alpha: 0.34 },
  { start: 2.82, dx: 92, dy: -22, size: 14, life: 0.8, alpha: 0.28 },
];

function updatePuff(
  el: HTMLSpanElement | null,
  cfg: { start: number; dx: number; dy: number; size: number; life: number; alpha: number },
  localTime: number
) {
  if (!el) return;
  const elapsed = localTime - cfg.start;
  if (elapsed < 0) {
    el.style.opacity = "0";
    return;
  }
  const prog = clamp01(elapsed / cfg.life);
  const s = cfg.dx * easeOutCubic(prog);
  const c = cfg.dy * easeOutCubic(prog);
  const scale = 0.45 + 1.5 * prog;
  const alpha = cfg.alpha * Math.min(1, prog * 6) * (1 - prog) ** 1.6;
  el.style.opacity = alpha.toFixed(3);
  el.style.transform = `translate(${s.toFixed(2)}px, ${c.toFixed(2)}px) scale(${scale.toFixed(3)})`;
}

export function DocLeRadialFloatingWidget({ whatsappNumber = "5491123951455" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const puffsImpactRef = useRef<(HTMLSpanElement | null)[]>([]);
  const puffsTrailRef = useRef<(HTMLSpanElement | null)[]>([]);

  const { data: settings } = useQuery<any>({ queryKey: ["settings"] });
  const effectiveNumber = settings?.whatsapp || whatsappNumber || "5491123951455";
  const cleanNumber = effectiveNumber.replace(/\D/g, "");
  const waText = encodeURIComponent(
    "¡Hola Le Radial! Estaba viendo la web y quería consultar precio y stock de neumáticos."
  );
  const waHref = `https://wa.me/${cleanNumber}?text=${waText}`;

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    // Inicializar tamaños de humo
    puffsImpactRef.current.forEach((el, idx) => {
      if (el) {
        const sz = SMOKE_IMPACT[idx].size;
        el.style.width = `${sz}px`;
        el.style.height = `${sz}px`;
        el.style.marginLeft = `${-sz / 2}px`;
        el.style.marginBottom = `${-sz / 2}px`;
      }
    });

    puffsTrailRef.current.forEach((el, idx) => {
      if (el) {
        const sz = SMOKE_TRAIL[idx].size;
        el.style.width = `${sz}px`;
        el.style.height = `${sz}px`;
        el.style.marginLeft = `${-sz / 2}px`;
        el.style.marginBottom = `${-sz / 2}px`;
      }
    });

    const setProp = (k: string, v: string) => root.style.setProperty(k, v);

    // Parámetros de animación (Sunset S.A. / XBRI)
    // Primera animación a los 1.5s para que el usuario la vea caer enseguida; luego cada 14s
    let intervalSec = 1.8;
    const permanence = 2.6;
    const speed = 1.0;
    const A = Math.max(0, permanence - 1.68);
    const cycleTotal = intervalSec + (3.4 + A) * speed;

    let timeAcc = 0;
    let lastStamp = 0;
    let rafId: number;

    const fallStart = 0.12;
    const impactTime = 0.62;
    const rollStart = 2.3;
    const returnTime = 2.85;

    const renderFrame = () => {
      if (timeAcc < intervalSec) {
        // Estado reposo: respiración sutil
        const breathe = 1 + 0.035 * Math.sin(timeAcc * 1.9);
        setProp("--logo-sx", breathe.toFixed(4));
        setProp("--logo-sy", breathe.toFixed(4));
        setProp("--logo-op", "1");
        setProp("--tire-op", "0");
        setProp("--pill-op", "0");
        puffsImpactRef.current.forEach((p) => p && (p.style.opacity = "0"));
        puffsTrailRef.current.forEach((p) => p && (p.style.opacity = "0"));
        return;
      }

      const l = (timeAcc - intervalSec) / speed;
      const d = l - A;

      puffsImpactRef.current.forEach((el, i) => updatePuff(el, SMOKE_IMPACT[i], l));
      puffsTrailRef.current.forEach((el, i) => updatePuff(el, SMOKE_TRAIL[i], d));

      if (l < impactTime) {
        // Fase 1: Desvanecer logo y caída libre de la cubierta desde -220px
        const tFade = clamp01(l / 0.26);
        setProp("--logo-sx", ((1 + 0.24 * tFade) * (1 - tFade)).toFixed(4));
        setProp("--logo-sy", ((1 - 0.32 * tFade) * (1 - tFade)).toFixed(4));
        setProp("--logo-op", Math.max(0, 1 - tFade * 1.5).toFixed(4));

        if (l >= fallStart) {
          const tDrop = clamp01((l - fallStart) / 0.5);
          setProp("--tire-x", "0px");
          // Gravedad: aceleración cuadrática (1 - tDrop * tDrop)
          setProp("--tire-y", `${(-220 * (1 - tDrop * tDrop)).toFixed(2)}px`);
          setProp("--tire-sx", "1");
          setProp("--tire-sy", "1");
          setProp("--tire-rot", `${(-230 * tDrop).toFixed(2)}deg`);
          setProp("--tire-op", Math.min(1, tDrop * 8).toFixed(2));
        } else {
          setProp("--tire-op", "0");
        }
        setProp("--pill-op", "0");
      } else {
        // Fase 2: Impacto, rebote físico y cartucho de texto
        const eTime = l - impactTime;
        const bounceS = 6 * Math.sin(eTime * 4) * Math.exp(-1.6 * eTime);
        const bounceY = -Math.abs(Math.sin(eTime * 6.4)) * 27 * Math.exp(-2.7 * eTime);
        const squashY = 1 - 0.22 * Math.exp(-13 * eTime);
        const squashX = 1 + 0.2 * Math.exp(-13 * eTime);
        const rot = -230 - 24 * eTime + bounceS;

        const isResting = d < rollStart;
        const isRolling = d >= rollStart && d < 3.02;

        if (isResting) {
          setProp("--tire-x", "0px");
          setProp("--tire-y", `${bounceY.toFixed(2)}px`);
          setProp("--tire-sx", squashX.toFixed(4));
          setProp("--tire-sy", squashY.toFixed(4));
          setProp("--tire-rot", `${rot.toFixed(2)}deg`);
          setProp("--tire-op", "1");

          // Despliegue del globo / pill estilo Sunset
          const tPill = clamp01((eTime - 0.15) / 0.15);
          const rPill = clamp01((rollStart - d) / 0.15);
          setProp("--pill-op", Math.min(tPill, rPill).toFixed(3));
          setProp("--pill-x", `${(8 * (1 - tPill)).toFixed(2)}px`);
        } else if (isRolling) {
          // Fase 3: La cubierta sale rodando hacia la derecha a toda velocidad
          const eRoll = clamp01((d - rollStart) / 0.72);
          const baseRot = -230 - 24 * (1.68 + A);
          const rX = 320 * easeOutCubic(eRoll);
          const rY = -Math.abs(Math.sin(eRoll * Math.PI * 5)) * 10 * (1 - eRoll);
          setProp("--tire-x", `${rX.toFixed(2)}px`);
          setProp("--tire-y", `${rY.toFixed(2)}px`);
          setProp("--tire-sx", (1 - 0.06 * eRoll).toFixed(4));
          setProp("--tire-sy", (1 - 0.02 * eRoll).toFixed(4));
          setProp("--tire-rot", `${(baseRot + 860 * eRoll).toFixed(2)}deg`);
          setProp("--tire-op", (1 - clamp01((eRoll - 0.72) / 0.28)).toFixed(3));
          setProp("--pill-op", "0");
        } else {
          setProp("--tire-op", "0");
          setProp("--pill-op", "0");
        }

        // Fase 4: Reaparición con rebote elástico (easeOutBack) del logo
        if (d >= returnTime) {
          const ePop = clamp01((d - returnTime) / 0.5);
          const scalePop = Math.max(0, easeOutBack(ePop));
          setProp("--logo-sx", scalePop.toFixed(4));
          setProp("--logo-sy", scalePop.toFixed(4));
          setProp("--logo-op", Math.min(1, ePop * 3).toFixed(3));
        } else {
          setProp("--logo-sx", "0");
          setProp("--logo-sy", "0");
          setProp("--logo-op", "0");
        }
      }
    };

    const loop = (stamp: number) => {
      const delta = lastStamp ? (stamp - lastStamp) / 1000 : 0;
      lastStamp = stamp;

      timeAcc += delta;
      if (timeAcc >= cycleTotal) {
        timeAcc = 0;
        // Intervalos subsiguientes más espaciados (cada 12s)
        intervalSec = 12.0;
      }

      renderFrame();
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <>
      <style>{`
        .leradial-wa-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 50;
          width: 64px;
          height: 64px;
          pointer-events: none;
          user-select: none;
        }
        @media (max-width: 640px) {
          .leradial-wa-container {
            bottom: 16px;
            right: 16px;
            width: 58px;
            height: 58px;
          }
        }
        .leradial-wa-btn {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          text-decoration: none;
          pointer-events: auto;
          cursor: pointer;
          touch-action: none;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .leradial-wa-btn:hover {
          transform: scale(1.08);
        }
        .leradial-wa-btn-bg {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: #25d366;
          box-shadow: 0 8px 24px rgba(37, 211, 102, 0.45), 0 4px 12px rgba(0, 0, 0, 0.15);
          transform-origin: 50% 50%;
          transform: scale(var(--logo-sx, 1), var(--logo-sy, 1));
          opacity: var(--logo-op, 1);
        }
        .leradial-wa-logo {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: var(--logo-op, 1);
          transform-origin: 50% 50%;
          transform: scale(var(--logo-sx, 1), var(--logo-sy, 1));
        }
        .leradial-wa-tire {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          transform-origin: 50% 50%;
          transform: translate(var(--tire-x, 0px), var(--tire-y, 0px)) scale(var(--tire-sx, 1), var(--tire-sy, 1));
          opacity: var(--tire-op, 0);
          filter: drop-shadow(0 12px 18px rgba(15, 26, 58, 0.42));
        }
        .leradial-wa-tire-svg {
          width: 100%;
          height: 100%;
          transform: rotate(var(--tire-rot, 0deg));
        }
        .leradial-wa-smoke {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: visible;
        }
        .leradial-wa-puff {
          position: absolute;
          bottom: 8%;
          left: 50%;
          border-radius: 50%;
          background: radial-gradient(circle at 40% 40%, rgba(160, 168, 180, 0.85), rgba(160, 168, 180, 0) 70%);
          opacity: 0;
          will-change: transform, opacity;
          pointer-events: none;
        }
        .leradial-wa-pill {
          position: absolute;
          top: 50%;
          right: calc(100% + 14px);
          white-space: nowrap;
          color: #1c2233;
          background: #ffffff;
          border: 1px solid #eef1f6;
          border-radius: 999px;
          padding: 8px 18px;
          font-size: 13px;
          font-weight: 700;
          box-shadow: 0 10px 25px rgba(15, 26, 58, 0.18);
          pointer-events: auto;
          cursor: pointer;
          opacity: var(--pill-op, 0);
          transform: translateY(-50%) translateX(var(--pill-x, 8px));
          transition: background-color 0.15s ease;
        }
        .leradial-wa-pill:hover {
          background-color: #f8fafc;
        }
      `}</style>

      <div ref={containerRef} className="leradial-wa-container">
        {/* Globo / Pill con mensaje directo */}
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="leradial-wa-pill"
          aria-label="Hablá con nosotros por WhatsApp"
        >
          ¿Dudas con tu medida? Hablá con el Doc 👋
        </a>

        {/* Botón base de WhatsApp con Doc Le Radial */}
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Escribinos por WhatsApp"
          className="leradial-wa-btn"
        >
          <span className="leradial-wa-btn-bg" />
          <span className="leradial-wa-logo">
            <svg viewBox="0 0 16 16" width="60%" height="60%" fill="#fff" aria-hidden="true">
              <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93a7.9 7.9 0 0 0-2.327-5.607zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.588-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.246c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.339-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232" />
            </svg>
          </span>
        </a>

        {/* Cubierta XBRI Brutus cayendo desde arriba con rotación y física de resorte */}
        <span className="leradial-wa-tire" aria-hidden="true">
          <svg viewBox="0 0 100 100" className="leradial-wa-tire-svg" aria-hidden="true">
            <use href="/icons/wa-tire.svg#wa-tire" />
          </svg>
        </span>

        {/* Humo de impacto y rodadura */}
        <span className="leradial-wa-smoke" aria-hidden="true">
          {SMOKE_IMPACT.map((_, i) => (
            <span
              key={`imp-${i}`}
              ref={(el) => (puffsImpactRef.current[i] = el)}
              className="leradial-wa-puff"
            />
          ))}
          {SMOKE_TRAIL.map((_, i) => (
            <span
              key={`trail-${i}`}
              ref={(el) => (puffsTrailRef.current[i] = el)}
              className="leradial-wa-puff"
            />
          ))}
        </span>
      </div>
    </>
  );
}
