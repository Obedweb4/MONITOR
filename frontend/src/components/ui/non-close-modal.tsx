import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

interface NonCloseModalProps {
  isOpen: boolean;
  children: React.ReactNode;
  title?: string;
}

export default function NonCloseModal({ isOpen, children, title }: NonCloseModalProps) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 z-40 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, y: 80 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 80 }} className="rounded-xl shadow-md bg-background w-[90%] max-w-[480px] mx-auto p-4 z-50 relative">
            {title && <h2 className="text-lg font-bold font-outfit mb-3">{title}</h2>}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
