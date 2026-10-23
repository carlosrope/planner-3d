"use client";

import { useEffect, useId, useRef, useState } from "react";
import { addDays, today as todayMx } from "@/lib/dates";

/**
 * Campo de fecha con el calendario de Plantea (el del navegador no se puede estilizar). Manda el valor como
 * "AAAA-MM-DD" en un input oculto con `name`, igual que un <input type="date">. Semana de lunes a domingo.
 */
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
const shown = new Intl.DateTimeFormat("es-MX", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

/** Días que pinta la cuadrícula de un mes: desde el lunes de la primera semana, 6 semanas. */
export function monthGrid(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (first.getUTCDay() + 6) % 7; // lunes = 0
  const start = ymd(year, month, 1);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i - offset));
}

export function DateField({
  name,
  defaultValue = "",
  min,
  placeholder = "Elegir fecha",
  className = "",
}: {
  name: string;
  defaultValue?: string;
  /** "AAAA-MM-DD" o "today": no deja elegir días anteriores. */
  min?: string;
  placeholder?: string;
  className?: string;
}) {
  const today = todayMx();
  const minDay = min === "today" ? today : min;
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const base = value || today;
  const [view, setView] = useState({ y: Number(base.slice(0, 4)), m: Number(base.slice(5, 7)) - 1 });
  const box = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const move = (delta: number) =>
    setView((v) => {
      const m = v.m + delta;
      return { y: v.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 };
    });
  const pick = (day: string) => {
    setValue(day);
    setOpen(false);
  };
  const days = monthGrid(view.y, view.m);
  const inMonth = (d: string) => Number(d.slice(5, 7)) - 1 === view.m;
  const disabled = (d: string) => Boolean(minDay && d < minDay);

  return (
    <div ref={box} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          const b = value || today;
          setView({ y: Number(b.slice(0, 4)), m: Number(b.slice(5, 7)) - 1 });
          setOpen((o) => !o);
        }}
        className={`flex h-12 w-full items-center justify-between gap-2 rounded-xl border border-stone-300 bg-white px-3 text-left text-base outline-none focus:border-stone-800 ${className}`}
      >
        <span className={value ? "capitalize text-stone-900" : "text-stone-500"}>{value ? shown.format(new Date(`${value}T12:00:00Z`)) : placeholder}</span>
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-[#a4552d]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <rect x="3.5" y="5" width="17" height="15" rx="3" />
          <path d="M3.5 10h17M8 3v4M16 3v4" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          id={id}
          role="dialog"
          aria-label="Elegir fecha"
          className="absolute left-0 z-30 mt-2 w-full min-w-[17rem] max-w-[22rem] rounded-2xl border border-stone-200 bg-white p-3 shadow-xl shadow-stone-900/10"
        >
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => move(-1)} aria-label="Mes anterior" className="flex h-9 w-9 items-center justify-center rounded-full text-stone-700 hover:bg-[#f3ece2]">
              ‹
            </button>
            <p className="font-display text-base font-semibold capitalize text-stone-900">
              {MONTHS[view.m]} {view.y}
            </p>
            <button type="button" onClick={() => move(1)} aria-label="Mes siguiente" className="flex h-9 w-9 items-center justify-center rounded-full text-stone-700 hover:bg-[#f3ece2]">
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-xs font-medium text-stone-500">
            {WEEKDAYS.map((w, i) => (
              <span key={i} className="py-1">
                {w}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((d) => {
              const selected = d === value;
              const isToday = d === today;
              const off = disabled(d);
              return (
                <button
                  key={d}
                  type="button"
                  disabled={off}
                  onClick={() => pick(d)}
                  aria-pressed={selected}
                  aria-label={shown.format(new Date(`${d}T12:00:00Z`))}
                  className={`flex h-10 items-center justify-center rounded-full text-sm transition-colors ${
                    selected
                      ? "bg-[#a4552d] font-semibold text-white"
                      : off
                        ? "text-stone-300"
                        : isToday
                          ? "font-semibold text-[#a4552d] ring-1 ring-inset ring-[#b5653a] hover:bg-[#f3ece2]"
                          : inMonth(d)
                            ? "text-stone-800 hover:bg-[#f3ece2]"
                            : "text-stone-300 hover:bg-stone-50"
                  }`}
                >
                  {Number(d.slice(8, 10))}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-stone-100 pt-2 text-sm">
            <button type="button" onClick={() => pick("")} className="rounded-lg px-2 py-1 font-medium text-stone-500 hover:bg-stone-100">
              Borrar
            </button>
            {!disabled(today) && (
              <button type="button" onClick={() => pick(today)} className="rounded-lg px-2 py-1 font-semibold text-[#a4552d] hover:bg-[#f3ece2]">
                Hoy
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
