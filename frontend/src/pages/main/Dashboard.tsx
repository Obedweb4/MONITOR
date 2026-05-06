import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Activity, TrendingUp, AlertTriangle, Clock, RefreshCw } from "lucide-react";
import { AppLayout } from "@/layouts";
import { MonitorCard } from "@/components/main";
import { Breadcrumb } from "@/components/ui";
import { useAuthStore } from "@/store";
import type { Monitor } from "@/types";
import api from "@/config/api";

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-background border border-line rounded-xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl center ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold font-outfit">{value}</p>
        <p className="text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data: monitors, isLoading, isFetching } = useQuery<Monitor[]>({
    queryKey: ["monitors"],
    queryFn: () => api.get("/monitors").then(r => r.data),
    refetchInterval: 5000,
  });

  const up    = monitors?.filter(m => m.last_status === "up").length ?? 0;
  const down  = monitors?.filter(m => m.last_status === "down").length ?? 0;
  const avgUptime = monitors?.length
    ? (monitors.reduce((s, m) => s + parseFloat(String(m.uptime_pct ?? 100)), 0) / monitors.length).toFixed(1)
    : "100.0";

  const recentMonitors = monitors ? [...monitors].sort((a, b) =>
    new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  ).slice(0, 3) : [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <Breadcrumb crumbs={[{ label: "Dashboard" }]} />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold font-outfit">Dashboard</h1>
            <p className="text-sm text-muted">Welcome back, {user?.name?.split(" ")[0]}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => qc.invalidateQueries({ queryKey: ["monitors"] })}
              disabled={isFetching}
              className="btn h-9 w-9 rounded-xl bg-foreground text-muted hover:text-main transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={15} className={isFetching ? "animate-spin" : ""} />
            </button>
            <Link to="/monitors/new" className="btn btn-primary h-9 px-4 rounded-xl text-sm gap-2">
              <Plus size={16} /> New monitor
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total monitors" value={monitors?.length ?? 0} icon={Activity} color="bg-blue-50 dark:bg-blue-950/30 text-blue-500" />
          <StatCard label="Online" value={up} icon={TrendingUp} color="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500" />
          <StatCard label="Down" value={down} icon={AlertTriangle} color="bg-red-50 dark:bg-red-950/30 text-red-500" />
          <StatCard label="Avg uptime" value={`${avgUptime}%`} icon={Clock} color="bg-purple-50 dark:bg-purple-950/30 text-purple-500" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">Recently added monitors</h2>
            {monitors && monitors.length > 0 && (
              <Link to="/monitors" className="btn btn-primary h-8 px-3 rounded-lg text-xs gap-1">View all monitors →</Link>
            )}
          </div>

          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {[1,2,3].map(i => <div key={i} className="h-32 bg-foreground rounded-xl animate-pulse" />)}
            </div>
          )}

          {!isLoading && monitors?.length === 0 && (
            <div className="text-center py-16 border border-dashed border-line rounded-xl">
              <Activity size={32} className="text-muted mx-auto mb-3" />
              <p className="font-medium text-sm">No monitors yet</p>
              <p className="text-xs text-muted mt-1 mb-4">Start monitoring your websites and APIs</p>
              <Link to="/monitors/new" className="btn btn-primary h-9 px-5 rounded-xl text-sm inline-flex">
                <Plus size={15} /> Add monitor
              </Link>
            </div>
          )}

          {!isLoading && recentMonitors.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {recentMonitors.map(m => <MonitorCard key={m.id} monitor={m} />)}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
