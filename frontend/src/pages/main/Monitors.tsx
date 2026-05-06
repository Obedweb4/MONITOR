import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Search, Pause, Play, Trash2, RefreshCw, Filter, Activity, SearchX } from "lucide-react";
import { AppLayout } from "@/layouts";
import { MonitorCard } from "@/components/main";
import { Modal, ButtonWithLoader, InputWithoutIcon, Breadcrumb } from "@/components/ui";
import type { Monitor } from "@/types";
import api from "@/config/api";

type StatusFilter = "all" | "up" | "down" | "paused";

const PAGE_SIZE = 10;

export default function Monitors() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<"pause" | "activate" | "delete" | null>(null);
  const [password, setPassword] = useState("");

  const { data: monitors, isLoading, isFetching } = useQuery<Monitor[]>({
    queryKey: ["monitors"],
    queryFn: () => api.get("/monitors").then(r => r.data),
    refetchInterval: 5000,
  });

  const filtered = (monitors ?? []).filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.url.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === "up")     return m.last_status === "up" && m.is_active !== false;
    if (statusFilter === "down")   return m.last_status === "down";
    if (statusFilter === "paused") return m.is_active === false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const bulkMutation = useMutation({
    mutationFn: (payload: object) => api.post("/monitors/bulk", payload).then(r => r.data),
    onSuccess: (data) => {
      toast.success(`${data.success} monitor(s) updated`);
      qc.invalidateQueries({ queryKey: ["monitors"] });
      setSelected([]);
      setBulkAction(null);
      setPassword("");
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || "Action failed");
    },
  });

  const toggleSelect = (id: string) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const executeBulk = () => {
    if (!bulkAction) return;
    const payload: Record<string, unknown> = { action: bulkAction, ids: selected };
    if (bulkAction === "delete") payload.password = password;
    bulkMutation.mutate(payload);
  };

  const handleFilterChange = (f: StatusFilter) => { setStatusFilter(f); setPage(1); setSelected([]); };
  const handleSearchChange = (v: string) => { setSearch(v); setPage(1); setSelected([]); };

  const filterLabels: Record<StatusFilter, string> = { all: "All", up: "Online", down: "Down", paused: "Paused" };

  return (
    <AppLayout>
      <div className="space-y-5">
        <Breadcrumb crumbs={[{ label: "Monitors" }]} />
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold font-outfit">Monitors</h1>
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
              <Plus size={16} /> New
            </Link>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search monitors..."
              className="w-full pl-10 h-10 rounded-xl border border-line text-sm focus:border-main bg-background"
            />
          </div>
          <div className="flex gap-1.5 items-center">
            <Filter size={14} className="text-muted shrink-0 ml-1" />
            {(["all", "up", "down", "paused"] as StatusFilter[]).map(f => (
              <button
                key={f}
                onClick={() => handleFilterChange(f)}
                className={`h-9 px-3 rounded-xl text-xs font-medium transition-colors ${statusFilter === f ? "bg-emerald-500 text-white" : "bg-foreground text-muted hover:text-main"}`}
              >
                {filterLabels[f]}
              </button>
            ))}
          </div>
        </div>

        {selected.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-secondary border border-line rounded-xl text-sm">
            <span className="text-muted">{selected.length} selected</span>
            <div className="ml-auto flex gap-2">
              <button onClick={() => setBulkAction("pause")} className="btn h-8 px-3 rounded-lg bg-foreground text-xs gap-1">
                <Pause size={13} /> Pause
              </button>
              <button onClick={() => setBulkAction("activate")} className="btn h-8 px-3 rounded-lg bg-foreground text-xs gap-1">
                <Play size={13} /> Activate
              </button>
              <button onClick={() => setBulkAction("delete")} className="btn h-8 px-3 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-500 text-xs gap-1">
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-32 bg-foreground rounded-xl animate-pulse" />)}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16 border border-dashed border-line rounded-xl">
            {(search || statusFilter !== "all") ? (
              <>
                <SearchX size={36} className="text-muted mx-auto mb-3 opacity-60" />
                <p className="font-medium text-sm">No results found</p>
                <p className="text-xs text-muted mt-1">Try adjusting your search or filter</p>
              </>
            ) : (
              <>
                <Activity size={36} className="text-muted mx-auto mb-3 opacity-60" />
                <p className="font-medium text-sm">No monitors yet</p>
                <p className="text-xs text-muted mt-1 mb-4">Start monitoring your websites and APIs</p>
                <Link to="/monitors/new" className="btn btn-primary h-9 px-5 rounded-xl text-sm inline-flex">
                  <Plus size={15} /> Add monitor
                </Link>
              </>
            )}
          </div>
        )}

        {!isLoading && paginated.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {paginated.map(m => (
              <div key={m.id} className="relative group">
                <div
                  className={`absolute top-2 left-2 z-10 w-5 h-5 rounded-md border-2 center cursor-pointer transition-all ${selected.includes(m.id) ? "bg-emerald-500 border-emerald-500" : "border-gray-400 bg-background opacity-0 group-hover:opacity-100"}`}
                  onClick={() => toggleSelect(m.id)}
                >
                  {selected.includes(m.id) && <span className="text-white text-[10px] font-bold">✓</span>}
                </div>
                <MonitorCard monitor={m} selected={selected.includes(m.id)} />
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p-1)} className="btn h-8 px-3 rounded-lg bg-foreground text-sm disabled:opacity-40">Prev</button>
            <span className="text-sm text-muted">Page {page} of {totalPages} · {filtered.length} monitors</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p+1)} className="btn h-8 px-3 rounded-lg bg-foreground text-sm disabled:opacity-40">Next</button>
          </div>
        )}
      </div>

      <Modal
        isOpen={!!bulkAction}
        onClose={() => { setBulkAction(null); setPassword(""); }}
        title={`${bulkAction === "delete" ? "Delete" : bulkAction === "pause" ? "Pause" : "Activate"} ${selected.length} monitor(s)?`}
      >
        <div className="space-y-4">
          {bulkAction === "delete" && (
            <>
              <p className="text-sm text-muted">This action cannot be undone. Enter your password to confirm.</p>
              <InputWithoutIcon type="password" label="Your password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
            </>
          )}
          {bulkAction !== "delete" && (
            <p className="text-sm text-muted">
              {bulkAction === "pause" ? "These monitors will stop checking and sending alerts." : "These monitors will resume checking."}
            </p>
          )}
          <div className="flex gap-3">
            <button onClick={() => { setBulkAction(null); setPassword(""); }} className="flex-1 h-10 rounded-xl btn bg-foreground text-sm">Cancel</button>
            <ButtonWithLoader
              onClick={executeBulk}
              loading={bulkMutation.isPending}
              initialText="Confirm"
              loadingText="Processing..."
              className={`flex-1 h-10 rounded-xl btn text-sm ${bulkAction === "delete" ? "bg-red-500 text-white" : "btn-primary"}`}
            />
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
