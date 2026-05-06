import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { User, AtSign, Mail, Lock, UserPlus } from "lucide-react";
import { AuthLayout } from "@/layouts";
import { InputWithIcon, ButtonWithLoader } from "@/components/ui";
import { signupSchema, type SignupForm } from "@/schemas";
import api from "@/config/api";

export default function Signup() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupForm) => {
    try {
      const res = await api.post("/auth/signup", data);
      toast.success(res.data.message);
      navigate("/verify", { state: { email: data.email, type: "signup" } });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || "Signup failed");
    }
  };

  return (
    <AuthLayout title="Create account" subtitle="Monitor your services with instant email alerts" icon={<UserPlus size={24} />}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <InputWithIcon
            id="username"
            icon={<AtSign size={18} />}
            label="Username"
            type="text"
            placeholder="johndoe"
            autoComplete="username"
            error={errors.username?.message}
            {...register("username")}
          />
          <InputWithIcon
            id="name"
            icon={<User size={18} />}
            label="Full name"
            type="text"
            placeholder="John Doe"
            autoComplete="name"
            error={errors.name?.message}
            {...register("name")}
          />
        </div>

        <InputWithIcon
          id="email"
          icon={<Mail size={18} />}
          label="Email address"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />

        <div>
          <InputWithIcon
            id="password"
            icon={<Lock size={18} />}
            label="Password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register("password")}
          />
          <p className="text-xs text-muted mt-1.5">
            Min 8 chars · uppercase · lowercase · number · special character
          </p>
        </div>

        <InputWithIcon
          id="confirmPassword"
          icon={<Lock size={18} />}
          label="Confirm password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <ButtonWithLoader
          type="submit"
          loading={isSubmitting}
          initialText="Create account"
          loadingText="Creating account..."
          className="w-full h-11 rounded-xl btn-primary text-sm"
        />
      </form>

      <p className="text-center text-sm text-muted mt-6">
        Already have an account?{" "}
        <Link to="/login" className="text-main font-medium hover:underline">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
