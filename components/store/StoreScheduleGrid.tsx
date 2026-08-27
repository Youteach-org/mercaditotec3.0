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

function formatHour(hour: StoreHour) {
  const value = Number(hour.slice(0, 2));

  if (value === 12) return "12 p. m.";
  if (value > 12) return `${value - 12} p. m.`;
  return `${value} a. m.`;
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
    <div className="overflow-x-auto overscroll-x-contain pb-1">
      <div
        className={[
          "grid min-w-[720px] grid-cols-[74px_repeat(7,minmax(72px,1fr))]",
          compact ? "gap-1" : "gap-1.5",
        ].join(" ")}
      >
        <div />

        {STORE_WEEK_DAYS.map((day) => (
          <div
            key={day}
            className={[
              "flex items-center justify-center rounded-lg bg-slate-900 font-bold text-white",
              compact ? "h-8 text-[11px]" : "h-10 text-xs sm:text-sm",
            ].join(" ")}
          >
            {DAY_LABELS[day]}
          </div>
        ))}

        {STORE_HOURS.map((hour) => (
          <div key={hour} className="contents">
            <div
              className={[
                "flex items-center justify-end pr-2 font-semibold text-gray-500",
                compact ? "h-7 text-[10px]" : "h-10 text-xs",
              ].join(" ")}
            >
              {formatHour(hour)}
            </div>

            {STORE_WEEK_DAYS.map((day) => {
              const selected = schedule[day].slots.includes(hour);
              const label = `${DAY_LABELS[day]} ${formatHour(hour)} a ${formatHour(
                `${String(Number(hour.slice(0, 2)) + 1).padStart(2, "0")}:00` as StoreHour,
              )}`;

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
                    "border transition-colors touch-manipulation",
                    compact ? "h-7 rounded-md" : "h-10 rounded-lg",
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
                  <span className="sr-only">
                    {selected ? "Abierto" : "Cerrado"}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
