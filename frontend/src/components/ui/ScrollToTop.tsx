import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronUp } from "lucide-react";

const RADIUS = 18;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ScrollToTop() {
  const { pathname } = useLocation();
  const [pct, setPct] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const p = total > 0 ? (scrolled / total) * 100 : 0;
      setPct(p);
      setVisible(p >= 75);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const offset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE;

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Scroll to top"
      className="fixed bottom-6 right-5 z-50 w-12 h-12 rounded-full bg-background border border-line shadow-lg center hover:scale-105 transition-transform"
    >
      <svg width="48" height="48" className="absolute inset-0 -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={RADIUS} fill="none" stroke="currentColor" strokeWidth="2" className="text-line" />
        <circle
          cx="24" cy="24" r={RADIUS}
          fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-emerald-500 transition-[stroke-dashoffset]"
        />
      </svg>
      <ChevronUp size={16} className="relative z-10 text-emerald-600" />
    </button>
  );
}
