import { useState } from "react";
import clsx from "clsx";
import type { CheckHistory } from "@/types";

interface UptimeBarProps {
  history: CheckHistory[];
  maxBars?: number;
}

function formatCheckedAt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function UptimeBar({ history, maxBars = 30 }: UptimeBarProps) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  // History arrives from the API in ASC order (oldest first, newest last).
  // We display: LEFT = newest (most recent), RIGHT = oldest.
  // Grey pads go at the END (right side) for monitors with fewer than maxBars checks.
  const recent = [...history].reverse().slice(0, maxBars); // [newest, …, oldest] — at most maxBars
  const padded: (CheckHistory | null)[] = [
    ...recent,
    ...Array(Math.max(0, maxBars - recent.length)).fill(null),
  ];

  return (
    <div className="flex items-end gap-0.5">
      {padded.map((h, i) => {
        const isLeft  = i < 4;
        const isRight = i > maxBars - 5;

        return (
          <div
            key={i}
            className="relative flex-1"
            onMouseEnter={() => setActiveIdx(i)}
            onMouseLeave={() => setActiveIdx(null)}
            onTouchStart={() => setActiveIdx(i)}
            onTouchEnd={() => setTimeout(() => setActiveIdx(null), 1800)}
          >
            <div
              className={clsx(
                "h-5 rounded-[2px] transition-all duration-150 cursor-default",
                activeIdx === i ? "scale-y-125 origin-bottom" : "",
                !h                   && "bg-gray-200 dark:bg-foreground",
                h?.status === "up"   && "bg-emerald-500",
                h?.status === "down" && "bg-red-500",
              )}
            />

            {activeIdx === i && (
              <div
                className={clsx(
                  "absolute bottom-full mb-2 z-50 pointer-events-none",
                  "bg-gray-900 text-white text-[10px] leading-tight rounded-lg px-2.5 py-1.5 shadow-xl",
                  "min-w-[110px] whitespace-nowrap",
                  isLeft  ? "left-0"  : "",
                  isRight ? "right-0" : "",
                  !isLeft && !isRight ? "left-1/2 -translate-x-1/2" : "",
                )}
              >
                {h ? (
                  <div className="space-y-0.5">
                    <div className={clsx("font-semibold", h.status === "up" ? "text-emerald-400" : "text-red-400")}>
                      {h.status.toUpperCase()}
                    </div>
                    {h.response_time != null && (
                      <div className="text-gray-300">{h.response_time} ms</div>
                    )}
                    {h.error_msg && (
                      <div className="text-red-300 max-w-[160px] truncate">{h.error_msg}</div>
                    )}
                    <div className="text-gray-400">{formatCheckedAt(h.checked_at)}</div>
                  </div>
                ) : (
                  <div className="text-gray-400">No data yet</div>
                )}
                <div
                  className={clsx(
                    "absolute top-full border-4 border-transparent border-t-gray-900",
                    isLeft  ? "left-3"  : "",
                    isRight ? "right-3" : "",
                    !isLeft && !isRight ? "left-1/2 -translate-x-1/2" : "",
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
