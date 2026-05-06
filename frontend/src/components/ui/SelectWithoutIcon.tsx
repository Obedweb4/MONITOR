import { ChevronDown } from "lucide-react";

const SelectWithoutIcon = ({ label, error, options, defaultValue, ...props }: SelectWithoutIconProps) => {
  return (
    <div className="space-y-2">
      <label htmlFor={props.id} className="text-sm text-muted font-medium">{label}</label>
      <div className="relative mt-1">
        <select {...props} className={`px-4 h-11 w-full rounded-lg text-sm border border-line focus:border-main appearance-none ${props.className ?? ""}`}>
          <option value="">{defaultValue || `Select ${label}`}</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={18} className="text-muted absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
      {error && <p className="text-red-500 text-xs font-medium">{error}</p>}
    </div>
  );
};
export default SelectWithoutIcon;
