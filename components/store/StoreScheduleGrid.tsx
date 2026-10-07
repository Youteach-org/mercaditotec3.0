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
  mini?: boolean;
  publicView?: boolean;
  onToggle?: (day: StoreWeekDay, hour: StoreHour) => void;
}

export default function StoreScheduleGrid({
  schedule,
  editable = false,
  compact = false,
  mini = false,
  publicView = false,
  onToggle,
}: Props) {
  const labelColumn = mini ? "22px" : publicView ? "54px" : compact ? "30px" : "30px";

  return (
    <div className="w-full max-w-full overflow-hidden">
      <div
        className={[
          "grid w-full min-w-0",
          mini ? "gap-[2px]" : publicView ? "gap-[3px] sm:gap-1" : "gap-1 sm:gap-0.5",
        ].join(" ")}
        style={{ gridTemplateColumns: `${labelColumn} repeat(7, minmax(0, 1fr))` }}
      >
        <div />

        {STORE_WEEK_DAYS.map((day) => (
          <div
            key={day}
            className={[
              "flex min-w-0 items-center justify-center bg-slate-900 font-bold text-white",
              mini
                ? "h-4 rounded-[3px] text-[7px]"
                : publicView
                  ? "h-8 rounded-md text-[10px] sm:text-xs"
                : compact
                  ? "h-7 rounded-md text-[10px] sm:h-6 md:h-5 md:text-[9px]"
                  : "h-9 rounded-md text-xs sm:h-7 sm:text-[10px] md:h-6",
            ].join(" ")}
          >
            {mini ? (
              MOBILE_DAY_LABELS[day]
            ) : publicView ? (
              DAY_LABELS[day]
            ) : (
              <>
                <span className="sm:hidden">{MOBILE_DAY_LABELS[day]}</span>
                <span className="hidden sm:inline">{DAY_LABELS[day]}</span>
              </>
            )}
          </div>
        ))}

        {STORE_HOURS.map((hour) => (
          <div key={hour} className="contents">
            <div
              className={[
                "flex min-w-0 items-center justify-end font-semibold text-gray-500",
                mini
                  ? "h-[9px] pr-[2px] text-[6px] leading-none"
                  : publicView
                    ? "h-8 pr-1 text-[10px] sm:text-xs"
                  : compact
                    ? "h-9 pr-1 text-[10px] sm:h-7 sm:text-[9px] md:h-6"
                    : "h-11 pr-1 text-[10px] sm:h-8 sm:text-[10px] md:h-7",
              ].join(" ")}
            >
              {mini ? (
                Number(hour.slice(0, 2)) % 3 === 1 ? formatCompactHour(hour) : ""
              ) : publicView ? (
                hour
              ) : (
                <>
                  <span className="sm:hidden">{formatCompactHour(hour)}</span>
                  <span className="hidden sm:inline">{formatHour(hour)}</span>
                </>
              )}
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
                  title={mini ? undefined : `${label} · ${selected ? "Abierto" : "Cerrado"}`}
                  disabled={!editable}
                  tabIndex={mini ? -1 : undefined}
                  onClick={() => editable && onToggle?.(day, hour)}
                  className={[
                    "min-w-0 touch-manipulation select-none border transition-none",
                    mini
                      ? "h-[9px] rounded-[2px]"
                      : publicView
                        ? "h-8 rounded-md"
                      : compact
                        ? "h-9 rounded-md sm:h-7 sm:rounded-[5px] md:h-6"
                        : "h-11 rounded-md sm:h-8 md:h-7",
                    selected
                      ? "border-blue-700 bg-blue-600 shadow-sm"
                      : mini
                        ? "border-slate-200 bg-slate-100"
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
