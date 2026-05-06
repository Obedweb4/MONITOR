import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import clsx from "clsx";

interface InputCheckProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked: boolean;
  size?: number;
  checkSize?: number;
  radius?: number;
  accent?: string;
}

export default function InputCheck({ checked, size = 20, checkSize = 14, radius = 6, accent = "bg-emerald-500", ...props }: InputCheckProps) {
  return (
    <div className="shrink-0">
      <label htmlFor={props.id} className="relative flex items-center justify-center cursor-pointer">
        <input
          type="checkbox"
          {...props}
          checked={checked}
          className="sr-only"
        />
        <span
          className={clsx(
            "flex items-center justify-center border-2 transition-colors duration-200",
            checked
              ? clsx(accent, "border-transparent")
              : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-500"
          )}
          style={{ width: size, height: size, borderRadius: radius }}
          aria-hidden="true"
        >
          <AnimatePresence mode="wait">
            {checked && (
              <motion.span
                key="check"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-white flex items-center justify-center"
              >
                <Check size={checkSize} strokeWidth={3} />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </label>
    </div>
  );
}
