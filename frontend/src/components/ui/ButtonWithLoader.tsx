import { Loader } from "lucide-react";

const ButtonWithLoader = ({ loading = false, initialText, loadingText, ...props }: ButtonWithLoaderProps) => {
  return (
    <button {...props} disabled={loading || props.disabled}>
      {loading && <Loader className="animate-spin" size={18} />}
      {loading ? loadingText : initialText}
    </button>
  );
};

export default ButtonWithLoader;
