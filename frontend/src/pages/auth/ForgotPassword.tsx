import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Mail, KeyRound } from "lucide-react";
import { AuthLayout } from "@/layouts";
import { InputWithIcon, ButtonWithLoader } from "@/components/ui";
import { forgotPasswordSchema, type ForgotPasswordForm } from "@/schemas";
import api from "@/config/api";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      const res = await api.post("/auth/forgot-password", data);
      toast.success(res.data.message);
      navigate("/verify", { state: { email: data.email, type: "reset" } });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || "Failed to send reset link");
    }
  };

  return (
    <AuthLayout title="Forgot password" subtitle="Enter your email and we'll send a reset code to your inbox" icon={<KeyRound size={24} />} iconBg="bg-amber-500">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <InputWithIcon
          id="email"
          icon={<Mail size={18} />}
          label="Email address"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <ButtonWithLoader
          type="submit"
          loading={isSubmitting}
          initialText="Send Reset Link"
          loadingText="Sending..."
          className="w-full h-11 rounded-xl btn-primary text-sm"
        />
      </form>
      <p className="text-center text-sm text-muted mt-6">
        Remembered?{" "}
        <Link to="/login" className="text-main font-medium hover:underline">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
