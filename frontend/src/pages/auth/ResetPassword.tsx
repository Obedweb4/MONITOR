import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { AuthLayout } from "@/layouts";
import { InputWithIcon, ButtonWithLoader } from "@/components/ui";
import { resetPasswordSchema, type ResetPasswordForm } from "@/schemas";
import { useAuthStore } from "@/store";
import api from "@/config/api";

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuthStore();
  const state = location.state as { resetToken?: string } | null;
  const resetToken = state?.resetToken;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!resetToken) {
      toast.error("Invalid reset session. Please start over.");
      navigate("/forgot-password");
      return;
    }
    try {
      const res = await api.post("/auth/reset-password", { resetToken, newPassword: data.newPassword });
      logout();
      toast.success(res.data.message || "Password reset successfully. Please log in.");
      navigate("/login", { replace: true });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || "Reset failed");
    }
  };

  return (
    <AuthLayout title="Set new password" subtitle="Choose a strong new password" icon={<Lock size={24} />}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <InputWithIcon
          id="newPassword"
          icon={<Lock size={18} />}
          label="New password"
          type="password"
          placeholder="••••••••"
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />
        <InputWithIcon
          id="confirmPassword"
          icon={<Lock size={18} />}
          label="Confirm password"
          type="password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        <ButtonWithLoader
          type="submit"
          loading={isSubmitting}
          initialText="Reset password"
          loadingText="Resetting..."
          className="w-full h-11 rounded-xl btn-primary text-sm"
        />
      </form>
    </AuthLayout>
  );
}
