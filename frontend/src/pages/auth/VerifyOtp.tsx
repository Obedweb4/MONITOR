import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ShieldCheck, RefreshCw, Mail, Loader2, CheckCircle, XCircle } from "lucide-react";
import { AuthLayout } from "@/layouts";
import { ButtonWithLoader } from "@/components/ui";
import { useAuthStore } from "@/store";
import api from "@/config/api";

export default function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { setAuth, setUser } = useAuthStore();

  const bundleToken = searchParams.get("t") || "";

  const urlEmail = searchParams.get("email") || "";
  const urlToken = searchParams.get("token") || "";
  const urlType  = searchParams.get("type")  || "";
  const urlUid   = searchParams.get("uid")   || "";

  const state = location.state as { email?: string; type?: string } | null;
  const stateEmail = state?.email || "";
  const stateType  = state?.type  || "signup";

  const hasBundle     = !!bundleToken;
  const hasLinkParams = !!(urlEmail && urlToken && urlType);
  const isLinkFlow    = hasBundle || hasLinkParams;

  const email = urlEmail || stateEmail;
  const type  = urlType  || stateType;

  const [status, setStatus]   = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [resendEmail, setResendEmail] = useState(email);
  const [resendType,  setResendType]  = useState(type);
  const [resending, setResending]     = useState(false);

  const verifyBundle = async () => {
    setStatus("loading");
    try {
      const res = await api.post("/auth/verify-bundle", { bundle: bundleToken });
      setStatus("success");
      const data = res.data;
      if (data.token && data.user) {
        setAuth(data.token, data.user);
        if (data.user) {
          if (data.message?.toLowerCase().includes("email")) {
            toast.success(data.message || "Email updated successfully!");
            setTimeout(() => navigate("/profile", { replace: true }), 1200);
          } else {
            toast.success(data.message || "Account verified! Welcome aboard.");
            setTimeout(() => navigate("/dashboard", { replace: true }), 1200);
          }
        }
      } else if (data.resetToken) {
        toast.success(data.message || "Verified! Set your new password.");
        setTimeout(() => navigate("/reset-password", { state: { resetToken: data.resetToken }, replace: true }), 1200);
      } else {
        toast.success(data.message || "Verified!");
        setTimeout(() => navigate("/dashboard", { replace: true }), 1200);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setStatus("error");
      setErrorMsg(error.response?.data?.error || "Verification failed. The link may have expired.");
    }
  };

  const verifyLink = async () => {
    if (!urlEmail || !urlToken || !urlType) return;
    setStatus("loading");
    try {
      if (urlType === "email_change") {
        const res = await api.post("/auth/confirm-email-change", {
          email: urlEmail, token: urlToken, uid: urlUid,
        });
        setStatus("success");
        setAuth(res.data.token, res.data.user);
        toast.success(res.data.message || "Email updated successfully!");
        setTimeout(() => navigate("/profile", { replace: true }), 1200);
      } else {
        const res = await api.post("/auth/verify-otp", { email: urlEmail, code: urlToken, type: urlType });
        setStatus("success");
        if (urlType === "signup") {
          setAuth(res.data.token, res.data.user);
          toast.success(res.data.message || "Account verified! Welcome aboard.");
          setTimeout(() => navigate("/dashboard", { replace: true }), 1200);
        } else {
          toast.success(res.data.message || "Verified! Set your new password.");
          setTimeout(() => navigate("/reset-password", { state: { resetToken: res.data.resetToken }, replace: true }), 1200);
        }
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setStatus("error");
      setErrorMsg(error.response?.data?.error || "Verification failed. The link may have expired.");
    }
  };

  useEffect(() => {
    if (hasBundle) verifyBundle();
    else if (hasLinkParams) verifyLink();
  }, []);

  const handleResend = async () => {
    const resEmail = resendEmail || email;
    const resType  = resendType  || type;
    if (!resEmail || !resType) { toast.error("Unable to resend — missing info."); return; }
    if (resType === "email_change") { toast.info("Please request a new email change from your profile."); navigate("/profile", { replace: true }); return; }
    setResending(true);
    try {
      const res = await api.post("/auth/resend-otp", { email: resEmail, type: resType });
      toast.success(res.data.message);
      setStatus("idle");
      setErrorMsg("");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || "Failed to resend. Try again.");
    } finally {
      setResending(false);
    }
  };

  const displayType = hasBundle ? stateType : type;
  const typeLabel = displayType === "reset" ? "reset" : displayType === "email_change" ? "email change confirmation" : "verification";
  const successMsg = displayType === "reset" ? "Verified! Redirecting to reset password…" : displayType === "email_change" ? "Email updated! Redirecting…" : "Account verified! Redirecting…";

  if (isLinkFlow) {
    return (
      <AuthLayout
        title={displayType === "email_change" ? "Confirming email change" : displayType === "reset" ? "Verifying reset link" : "Verifying your account"}
        subtitle="Please wait a moment…"
        icon={status === "success" ? <CheckCircle size={24} /> : status === "error" ? <XCircle size={24} /> : <Loader2 size={24} className="animate-spin" />}
        iconBg={status === "success" ? "bg-emerald-500" : status === "error" ? "bg-red-500" : "bg-blue-500"}
      >
        <div className="space-y-5">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Loader2 size={32} className="text-emerald-500 animate-spin" />
              <p className="text-sm text-muted">Verifying your link, please wait…</p>
            </div>
          )}
          {status === "success" && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle size={32} className="text-emerald-500" />
              <p className="text-sm font-medium">{successMsg}</p>
            </div>
          )}
          {status === "error" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl text-sm text-red-600 dark:text-red-400">
                <XCircle size={18} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <p className="text-xs text-muted text-center">The link may have expired or already been used.</p>
              {displayType !== "email_change" && (
                <ButtonWithLoader
                  onClick={handleResend}
                  loading={resending}
                  initialText={`Resend ${typeLabel} link`}
                  loadingText="Sending…"
                  className="w-full h-11 rounded-xl btn-primary text-sm"
                />
              )}
              {displayType === "email_change" && (
                <button onClick={() => navigate("/profile")} className="w-full h-11 rounded-xl btn btn-primary text-sm">
                  Back to Profile
                </button>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 p-3 bg-secondary rounded-xl text-xs text-muted">
            <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
            <span>Links expire in 30 minutes. Check your spam folder too.</span>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Check your email"
      subtitle={`We sent a ${typeLabel} link to${email ? ` ${email}` : " your email"}`}
      icon={<Mail size={24} />}
      iconBg="bg-blue-500"
    >
      <div className="space-y-5">
        <div className="p-4 bg-secondary border border-line rounded-xl text-sm text-center text-muted">
          Click the link in your email to {displayType === "reset" ? "reset your password" : "verify your account"}.
        </div>
        <div className="text-center">
          <p className="text-sm text-muted mb-3">Didn't receive the link?</p>
          <button
            onClick={handleResend}
            disabled={resending || !email}
            className="text-sm text-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-2 mx-auto font-medium disabled:opacity-50"
          >
            <RefreshCw size={14} className={resending ? "animate-spin" : ""} />
            {resending ? "Sending…" : `Resend ${typeLabel} link`}
          </button>
        </div>
        <div className="flex items-center gap-2 p-3 bg-secondary rounded-xl text-xs text-muted">
          <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
          <span>Links expire in 30 minutes. Check your inbox and spam folder.</span>
        </div>
      </div>
    </AuthLayout>
  );
}
