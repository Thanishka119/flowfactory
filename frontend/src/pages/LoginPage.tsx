import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Layers,
  LogIn,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ShoppingCart,
  Package,
  Factory,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// LoginPage
// ---------------------------------------------------------------------------
export function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  // Redirect if already authenticated
  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (values: LoginFormValues) => {
    setAuthError(null);
    try {
      await login(values);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Login failed. Please verify your credentials.',
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F1F0DC]">
      {/* LEFT SIDE: Industrial Tech Flow Visual (58% on Desktop) */}
      <div className="lg:w-[58%] bg-[#2F344F] text-white p-8 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        {/* Subtle geometric pattern / ambient grid background */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pattern)" />
          </svg>
        </div>

        {/* Ambient glow accent */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#ACBAC4]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#E5DCC0]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[#E5DCC0] flex items-center justify-center text-[#2F344F] shadow-md font-bold">
              <Layers className="h-6 w-6 text-[#2F344F]" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">
                FLOW<span className="text-[#E5DCC0]">FACTORY</span>
              </span>
              <span className="block text-[10px] font-mono tracking-widest uppercase text-[#ACBAC4]">
                Enterprise Operations & Inventory
              </span>
            </div>
          </div>
        </div>

        {/* Center Hero & Industrial Flow Diagram */}
        <div className="my-12 lg:my-0 relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#252A40]/80 border border-[#ACBAC4]/20 text-[#E5DCC0] text-xs font-mono mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            REAL-TIME INTELLIGENT WORKSPACE
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
            Intelligent Inventory. <br />
            <span className="text-[#E5DCC0]">Seamless Operations.</span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-[#ACBAC4] leading-relaxed max-w-lg">
            Precision control across procurement, material consumption, assembly workflows, and finished goods fulfillment.
          </p>

          {/* Abstract Industrial Flow Visual: Purchase → Inventory → Production → Sales */}
          <div className="mt-10 p-5 rounded-xl bg-[#252A40]/70 border border-[#ACBAC4]/20 shadow-inner">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#ACBAC4] mb-3 flex items-center justify-between">
              <span>Operational Pipeline Sequence</span>
              <span className="text-[#E5DCC0]">v0.1 Active</span>
            </div>

            <div className="grid grid-cols-4 gap-2 sm:gap-3 relative">
              {/* Step 1 */}
              <div className="p-3 rounded-lg bg-[#2F344F] border border-[#ACBAC4]/30 flex flex-col items-center text-center">
                <div className="p-1.5 rounded bg-[#ACBAC4]/20 text-[#E5DCC0] mb-1.5">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-semibold text-white">Purchase</span>
                <span className="text-[9px] text-[#ACBAC4]">Procure & OCR</span>
              </div>

              {/* Step 2 */}
              <div className="p-3 rounded-lg bg-[#2F344F] border border-[#ACBAC4]/30 flex flex-col items-center text-center">
                <div className="p-1.5 rounded bg-[#ACBAC4]/20 text-[#E5DCC0] mb-1.5">
                  <Package className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-semibold text-white">Inventory</span>
                <span className="text-[9px] text-[#ACBAC4]">Ledger & Stock</span>
              </div>

              {/* Step 3 */}
              <div className="p-3 rounded-lg bg-[#2F344F] border border-[#E5DCC0]/40 flex flex-col items-center text-center ring-1 ring-[#E5DCC0]/30">
                <div className="p-1.5 rounded bg-[#E5DCC0]/20 text-[#E5DCC0] mb-1.5">
                  <Factory className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-semibold text-[#E5DCC0]">Production</span>
                <span className="text-[9px] text-[#ACBAC4]">BOM & Execute</span>
              </div>

              {/* Step 4 */}
              <div className="p-3 rounded-lg bg-[#2F344F] border border-[#ACBAC4]/30 flex flex-col items-center text-center">
                <div className="p-1.5 rounded bg-[#ACBAC4]/20 text-[#E5DCC0] mb-1.5">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-semibold text-white">Sales</span>
                <span className="text-[9px] text-[#ACBAC4]">Dispatch & Settle</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-[#ACBAC4] border-t border-[#ACBAC4]/15 pt-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#E5DCC0]" />
            <span>Role-Based Access & Audit Logging Enforced</span>
          </div>
          <span className="font-mono text-[11px]">FlowFactory Platform</span>
        </div>
      </div>

      {/* RIGHT SIDE: Authentication Form Card (42% on Desktop) */}
      <div className="lg:w-[42%] flex items-center justify-center p-6 sm:p-10 lg:p-12">
        <div className="w-full max-w-md">
          {/* Card Header */}
          <div className="bg-white rounded-xl border border-[#CBD5DC] p-8 shadow-[0_4px_20px_rgba(47,52,79,0.06)] space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold uppercase tracking-widest text-[#2F344F]/60">
                  Authentication
                </span>
                <span className="h-2 w-2 rounded-full bg-emerald-500" title="System Online" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-[#2F344F] mt-2">
                Sign in to your workspace
              </h2>
              <p className="text-xs text-[#2F344F]/70 mt-1">
                Enter your authorized credentials to access FlowFactory operations.
              </p>
            </div>

            {/* Auth error banner */}
            {authError && (
              <div className="flex items-start gap-2.5 rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-3 text-xs text-rose-800">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-rose-600" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-[#2F344F]">
                  Work Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@flowfactory.local"
                  disabled={isSubmitting}
                  className={cn(
                    'h-10 text-sm border-[#CBD5DC] focus-visible:ring-[#2F344F] focus-visible:border-[#2F344F]',
                    errors.email && 'border-rose-400 focus-visible:ring-rose-400',
                  )}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-rose-600">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold text-[#2F344F]">
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    disabled={isSubmitting}
                    className={cn(
                      'h-10 pr-10 text-sm border-[#CBD5DC] focus-visible:ring-[#2F344F] focus-visible:border-[#2F344F]',
                      errors.password && 'border-rose-400 focus-visible:ring-rose-400',
                    )}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#ACBAC4] hover:text-[#2F344F] transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-rose-600">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-10 gap-2 bg-[#2F344F] hover:bg-[#252A40] text-white font-medium shadow-sm transition-all"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin text-[#E5DCC0]"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Verifying authorization…
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Enter Workspace
                    <ArrowRight className="h-3.5 w-3.5 opacity-70 ml-auto" />
                  </>
                )}
              </Button>
            </form>
          </div>

          <div className="text-center mt-6">
            <p className="text-xs text-[#2F344F]/50 font-mono">
              FlowFactory Operations v0.1.0 • Enterprise Inventory Engine
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

