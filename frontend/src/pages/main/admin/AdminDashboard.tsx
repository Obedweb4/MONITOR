import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Users, Monitor, TrendingUp, AlertTriangle, MessageSquare, RefreshCw, Settings } from "lucide-react";
import { AppLayout } from "@/layouts";
import { Breadcrumb } from "@/components/ui";
import api from "@/config/api";

interface AdminStats {
  totalUsers: number;
  totalMonitors: number;
  monitorsUp: number;
  monitorsDown: number;
}

function StatCard({ label, value, icon: Icon, color, to }: { label: string; value: number | string; icon: React.ElementType; color: string; to?: string }) {
  const inner = (
    <div className={`bg-background border border-line rounded-xl p-5 flex items-center gap-4 transition-all ${to ? "hover:border-emerald-500/30 hover:shadow-sm cursor-pointer" : ""}`}>
      <div className={`w-12 h-12 rounded-xl center ${color} shrink-0`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-3xl font-bold font-outfit">{value}</p>
        <p className="text-xs text-muted mt-0.5">{label}</p>
      </div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export default function AdminDashboard() {
  const qc = useQueryClient();

  const { data: stats, isLoading, isFetching } = useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: () => api.get("/admin/stats").then(r => r.data),
  });

  const quickActions = [
    { to: "/admin/users",    label: "Manage Users",    icon: Users,        color: "bg-blue-50 dark:bg-blue-950/30 text-blue-500",        desc: "View and manage all accounts" },
    { to: "/admin/monitors", label: "All Monitors",    icon: Monitor,      color: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500", desc: "Browse and manage every monitor" },
    { to: "/admin/messages", label: "Contact Messages",icon: MessageSquare, color: "bg-purple-50 dark:bg-purple-950/30 text-purple-500", desc: "View submitted contact forms" },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <Breadcrumb crumbs={[{ label: "Admin Dashboard" }]} />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold font-outfit">Admin Dashboard</h1>
            <p className="text-sm text-muted">Overview of your OBEDTECH MONITOR instance</p>
          </div>
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ["admin-stats"] })}
            disabled={isFetching}
            className="btn h-9 w-9 rounded-xl bg-foreground text-muted hover:text-main transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={15} className={isFetching ? "animate-spin" : ""} />
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-foreground rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Total users"    value={stats?.totalUsers    ?? 0} icon={Users}         color="bg-blue-50 dark:bg-blue-950/30 text-blue-500"       to="/admin/users" />
            <StatCard label="Total monitors" value={stats?.totalMonitors ?? 0} icon={Monitor}        color="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500" to="/admin/monitors" />
            <StatCard label="Monitors up"    value={stats?.monitorsUp    ?? 0} icon={TrendingUp}     color="bg-green-50 dark:bg-green-950/30 text-green-500"    to="/admin/monitors" />
            <StatCard label="Monitors down"  value={stats?.monitorsDown  ?? 0} icon={AlertTriangle}  color="bg-red-50 dark:bg-red-950/30 text-red-500"          to="/admin/monitors" />
          </div>
        )}

        <div>
          <h2 className="font-semibold text-sm mb-3">Quick Actions</h2>
          <div className="grid md:grid-cols-3 gap-3">
            {quickActions.map(a => (
              <Link
                key={a.to}
                to={a.to}
                className="bg-background border border-line rounded-xl p-5 hover:border-emerald-500/30 hover:shadow-sm transition-all"
              >
                <div className={`w-10 h-10 rounded-xl center mb-3 ${a.color}`}>
                  <a.icon size={20} />
                </div>
                <h3 className="font-semibold text-sm mb-1">{a.label}</h3>
                <p className="text-xs text-muted">{a.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-background border border-line rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Settings size={16} className="text-muted" />
            <h2 className="font-semibold text-sm">System info</h2>
          </div>
          <div className="space-y-0 text-sm">
            {[
              { label: "Total users",    value: stats?.totalUsers    ?? "—" },
              { label: "Total monitors", value: stats?.totalMonitors ?? "—" },
              { label: "Currently up",   value: stats?.monitorsUp    ?? "—" },
              { label: "Currently down", value: stats?.monitorsDown  ?? "—" },
            ].map(row => (
              <div key={row.label} className="flex justify-between py-2.5 border-b border-line last:border-0">
                <span className="text-muted">{row.label}</span>
                <span className="font-semibold">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
