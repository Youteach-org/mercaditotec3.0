"use client";

import {
  STORE_HOURS,
  STORE_WEEK_DAYS,
  type StoreHour,
  type StoreSchedule,
  type StoreWeekDay,
} from "@/lib/store/schedule";

const DAY_LABELS: Record<StoreWeekDay, string> = {
  monday: "Lun",
  tuesday: "Mar",
  wednesday: "Mié",
  thursday: "Jue",
  friday: "Vie",
  saturday: "Sáb",
  sunday: "Dom",
};

const MOBILE_DAY_LABELS: Record<StoreWeekDay, string> = {
  monday: "L",
  tuesday: "M",
  wednesday: "X",
  thursday: "J",
  friday: "V",
  saturday: "S",
  sunday: "D",
};

function formatHour(hour: StoreHour) {
  const value = Number(hour.slice(0, 2));
  if (value === 12) return "12 p. m.";
  if (value > 12) return `${value - 12} p. m.`;
  return `${value} a. m.`;
}

function formatCompactHour(hour: StoreHour) {
  const value = Number(hour.slice(0, 2));
  if (value === 12) return "12p";
  if (value > 12) return `${value - 12}p`;
  return `${value}a`;
}

interface Props {
  schedule: StoreSchedule;
  editable?: boolean;
  compact?: boolean;
  onToggle?: (day: StoreWeekDay, hour: StoreHour) => void;
}

export default function StoreScheduleGrid({
  schedule,
  editable = false,
  compact = false,
  onToggle,
}: Props) {
  return (
    <div className="w-full max-w-full overflow-hidden">
      <div className="grid w-full min-w-0 grid-cols-[30px_repeat(7,minmax(0,1fr))] gap-1 sm:grid-cols-[42px_repeat(7,minmax(0,1fr))] sm:gap-0.5 md:grid-cols-[48px_repeat(7,minmax(0,1fr))]">
        <div />

        {STORE_WEEK_DAYS.map((day) => (
          <div
            key={day}
            className={[
              "flex min-w-0 items-center justify-center rounded-md bg-slate-900 font-bold text-white",
              compact
                ? "h-7 text-[10px] sm:h-6 md:h-5 md:text-[9px]"
                : "h-9 text-xs sm:h-7 sm:text-[10px] md:h-6",
            ].join(" ")}
          >
            <span className="sm:hidden">{MOBILE_DAY_LABELS[day]}</span>
            <span className="hidden sm:inline">{DAY_LABELS[day]}</span>
          </div>
        ))}

        {STORE_HOURS.map((hour) => (
          <div key={hour} className="contents">
            <div
              className={[
                "flex min-w-0 items-center justify-end pr-1 font-semibold text-gray-500",
                compact
                  ? "h-9 text-[10px] sm:h-7 sm:text-[9px] md:h-6"
                  : "h-11 text-[10px] sm:h-8 sm:text-[10px] md:h-7",
              ].join(" ")}
            >
              <span className="sm:hidden">{formatCompactHour(hour)}</span>
              <span className="hidden sm:inline">{formatHour(hour)}</span>
            </div>

            {STORE_WEEK_DAYS.map((day) => {
              const selected = schedule[day].slots.includes(hour);
              const nextHour = `${String(Number(hour.slice(0, 2)) + 1).padStart(2, "0")}:00` as StoreHour;
              const label = `${DAY_LABELS[day]} ${formatHour(hour)} a ${formatHour(nextHour)}`;

              return (
                <button
                  key={`${day}-${hour}`}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${label}: ${selected ? "abierto" : "cerrado"}`}
                  title={`${label} · ${selected ? "Abierto" : "Cerrado"}`}
                  disabled={!editable}
                  onClick={() => editable && onToggle?.(day, hour)}
                  className={[
                    "min-w-0 touch-manipulation select-none border transition-colors",
                    compact
                      ? "h-9 rounded-md sm:h-7 sm:rounded-[5px] md:h-6"
                      : "h-11 rounded-md sm:h-8 md:h-7",
                    selected
                      ? "border-blue-700 bg-blue-600 shadow-sm"
                      : "border-gray-200 bg-white",
                    editable
                      ? selected
                        ? "cursor-pointer hover:bg-blue-700 active:bg-blue-800"
                        : "cursor-pointer hover:border-blue-300 hover:bg-blue-50 active:bg-blue-100"
                      : "cursor-default",
                  ].join(" ")}
                >
                  <span className="sr-only">{selected ? "Abierto" : "Cerrado"}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
