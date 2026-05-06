import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

interface Crumb {
  label: string;
  to?: string;
}

interface BreadcrumbProps {
  crumbs: Crumb[];
}

export default function Breadcrumb({ crumbs }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 text-xs text-muted mb-5 flex-wrap" aria-label="Breadcrumb">
      <Link
        to="/dashboard"
        className="flex items-center gap-1 hover:text-emerald-500 transition-colors"
        title="Dashboard"
      >
        <Home size={12} />
      </Link>
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight size={12} className="text-muted/40 shrink-0" />
            {!isLast && crumb.to ? (
              <Link to={crumb.to} className="hover:text-emerald-500 transition-colors truncate max-w-[180px]">
                {crumb.label}
              </Link>
            ) : (
              <span className={isLast ? "text-emerald-500 font-semibold truncate max-w-[180px]" : "truncate max-w-[180px]"}>
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
