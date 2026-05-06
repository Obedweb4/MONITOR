import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function GobackButton({ label }: { label?: string }) {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted hover:text-main transition-colors text-sm">
      <ArrowLeft size={18} />
      {label && <span>{label}</span>}
    </button>
  );
}
