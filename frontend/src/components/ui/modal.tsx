import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export default function Modal({ isOpen, onClose, children, title }: ModalProps) {
  useEffect(() => {
    const val = isOpen ? "hidden" : "";
    document.documentElement.style.overflow = val;
    document.body.style.overflow = val;
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          {/* Backdrop */}
          <motion.div
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 z-40 backdrop-blur-sm"
          />
          {/* Modal panel */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.97 }}
            transition={{ type: "tween", duration: 0.18, ease: "easeOut" }}
            className="relative z-50 w-full max-w-[480px] bg-background rounded-2xl shadow-xl flex flex-col"
            style={{ maxHeight: "min(90dvh, 92vh)" }}
          >
            {/* Fixed title bar */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line shrink-0">
              <h2 className="text-base font-bold font-outfit leading-tight pr-2 truncate">{title}</h2>
              <button onClick={onClose} className="bg-foreground btn h-8 w-8 rounded-full shrink-0">
                <X size={16} />
              </button>
            </div>
            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
