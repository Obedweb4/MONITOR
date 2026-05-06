import { Link } from "react-router-dom";
import { ExternalLink, Clock, Activity, ArrowRight } from "lucide-react";
import type { Monitor } from "@/types";
import StatusBadge from "./StatusBadge";
import UptimeBar from "./UptimeBar";
import { timeAgo } from "@/helpers/formatDate";

interface MonitorCardProps {
  monitor: Monitor;
  selected?: boolean;
}

export default function MonitorCard({ monitor, selected }: MonitorCardProps) {
  const fullUrl = monitor.url + (monitor.path || "");
  const displayUrl = fullUrl.replace(/^https?:\/\//, "").slice(0, 45);

  return (
    <div
      className={`bg-background border rounded-xl p-4 transition-all ${selected ? "border-emerald-500 ring-1 ring-emerald-500/30" : "border-line hover:border-main/30 hover:shadow-sm"}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h3 className="font-semibold text-sm truncate">{monitor.name}</h3>
            {monitor.method && (
              <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {monitor.method}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs text-muted truncate">{displayUrl}</span>
            <button
              type="button"
              onClick={() => window.open(fullUrl, "_blank", "noopener,noreferrer")}
              className="text-muted hover:text-emerald-500 shrink-0 cursor-pointer p-1.5 -m-1.5 rounded-lg hover:bg-foreground transition-colors"
              title="Open URL in new tab"
            >
              <ExternalLink size={12} />
            </button>
          </div>
        </div>
        <StatusBadge status={monitor.last_status} />
      </div>

      {monitor.history && monitor.history.length > 0 && (
        <div className="mb-3">
          <UptimeBar history={monitor.history} maxBars={30} />
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted">
        <div className="flex items-center gap-1">
          <Activity size={12} />
          <span>{monitor.uptime_pct != null ? parseFloat(String(monitor.uptime_pct)).toFixed(1) : "100.0"}% uptime</span>
        </div>
        <div className="flex items-center gap-3">
          {monitor.last_response_time && (
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {monitor.last_response_time}ms
            </span>
          )}
          {monitor.last_checked && (
            <span>{timeAgo(monitor.last_checked)}</span>
          )}
          <Link
            to={`/monitors/${monitor.id}`}
            className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
            title="View details"
            onClick={e => e.stopPropagation()}
          >
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {!monitor.is_active && (
        <div className="mt-2 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded px-2 py-0.5 inline-block">
          PAUSED
        </div>
      )}
    </div>
  );
}
