import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { ApiError } from "../services/api";

const schema = z.object({
  name: z.string().min(1, "Enter your name."),
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters."),
});
type FormValues = z.infer<typeof schema>;

export default function Register() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await registerUser(values.name, values.email, values.password);
      navigate("/");
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-espresso text-ivory">
            <Sparkles size={22} />
          </div>
          <h1 className="font-heading text-xl font-bold text-coffee">Create your workspace</h1>
          <p className="mt-1.5 text-sm text-grey">The first account you create becomes an Administrator.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="nexus-card p-6 space-y-4">
          {serverError && (
            <p className="rounded-lg bg-[#F4E3DD] px-3 py-2 text-sm text-[#9C4A3A]">{serverError}</p>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-coffee">Full name</label>
            <input className="input-field" placeholder="Jane Smith" {...register("name")} />
            {errors.name && <p className="mt-1 text-xs text-[#9C4A3A]">{errors.name.message}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-coffee">Email</label>
            <input type="email" className="input-field" placeholder="you@company.com" {...register("email")} />
            {errors.email && <p className="mt-1 text-xs text-[#9C4A3A]">{errors.email.message}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-coffee">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="input-field pr-10"
                placeholder="At least 8 characters"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-grey hover:text-espresso"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-[#9C4A3A]">{errors.password.message}</p>}
          </div>
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-grey">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-espresso hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
