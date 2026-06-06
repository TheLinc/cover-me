"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeftIcon,
  CheckIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@phosphor-icons/react";
import { Spinner } from "@/components/ui/spinner";

type View = "signin" | "signup" | "forgot" | "reset" | "confirmed";

export default function AuthPage() {
  return (
    <Suspense>
      <AuthContent />
    </Suspense>
  );
}

function AuthContent() {
  const params = useSearchParams();
  const plan = params.get("plan");

  const [view, setView] = useState<View>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [error, setError] = useState("");

  const supabase = createClient();

  useEffect(() => {
    const hash = window.location.hash;

    if (hash) {
      const h = new URLSearchParams(hash.slice(1));

      if (h.get("error")) {
        const code = h.get("error_code");
        if (code === "otp_expired") {
          setError("That confirmation link has expired. Sign in or sign up again to get a new one.");
        } else if (code === "access_denied") {
          setError("This link is invalid or has already been used. Sign in or request a new link.");
        } else {
          const desc = h.get("error_description");
          setError(desc ? decodeURIComponent(desc.replace(/\+/g, " ")) : "Something went wrong. Please try again.");
        }
      } else if (h.get("access_token")) {
        const type = h.get("type");
        if (type === "signup") setView("confirmed");
        if (type === "recovery") setView("reset");
      }

      window.history.replaceState(null, "", window.location.pathname);
    }

    // Fallback: catch events fired before React mounted (e.g. slow hydration).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setView("reset");
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function switchView(next: View) {
    setView(next);
    setError("");
    setStatus("idle");
    setShowPassword(false);
    setShowNewPassword(false);
    setShowConfirm(false);
  }

  // ── Sign in / sign up ────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      if (view === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        window.location.href = "/dashboard";
      } else {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/auth` },
          });
        if (error) throw error;
        if (plan === "pro") {
          window.location.href = "/dashboard?upgrade=1";
        } else {
          setStatus("success");
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("idle");
    }
  }

  // ── Forgot password ──────────────────────────────────────────────────────
  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      setStatus("success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("idle");
    }
  }

  // ── Password reset (token already active in session) ────────────────────
  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setStatus("loading");
    setError("");
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      setStatus("success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("idle");
    }
  }

  // ── Derived labels ───────────────────────────────────────────────────────
  const heading =
    view === "reset"
      ? "Set a new password."
      : view === "forgot"
        ? "Forgot your password?"
        : view === "signin"
          ? "Welcome back."
          : plan === "pro"
            ? "Start your Pro trial."
            : "Create your account.";

  const subtext =
    view === "reset"
      ? "Choose something strong — at least 6 characters."
      : view === "forgot"
        ? "Enter your email and we'll send you a reset link."
        : view === "signin"
          ? "Sign in to your Cover Me account."
          : plan === "pro"
            ? "Unlock unlimited cover letters."
            : "10 free letters per day. No credit card required.";

  return (
    <div className="grid min-h-screen grid-cols-[55fr_45fr] max-md:grid-cols-1">
      {/* ── Left panel ──────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden bg-surface border-r border-border max-md:hidden"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(42,52,82,0.85) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
        }}
      >
        <div className="absolute -bottom-[120px] -left-[120px] w-[560px] h-[560px] rounded-full bg-[radial-gradient(ellipse,rgba(99,102,241,0.11)_0%,transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(13,17,23,0.18)_0%,transparent_45%)] pointer-events-none" />

        <div className="relative z-[1] h-full min-h-screen flex flex-col pt-[38px] px-[52px] pb-11">
          <a
            href="/"
            className="flex items-center gap-[9px]"
            style={{ animation: "fadeUp 0.5s ease 0.05s both" }}
          >
            <Image src="/logo.png" width={26} height={26} alt="Cover Me" />
            <span className="text-[15px] font-bold text-foreground tracking-[-0.3px]">
              Cover Me
            </span>
          </a>

          <div className="flex-1 min-h-12" />

          <div className="flex flex-col mb-11">
            <span
              className="text-[10px] font-bold tracking-[0.13em] uppercase text-brand mb-5"
              style={{ animation: "fadeUp 0.5s ease 0.12s both" }}
            >
              AI Cover Letters
            </span>
            <h1
              className="text-[clamp(36px,4.2vw,62px)] font-extrabold tracking-[-2.5px] leading-[1.1] text-foreground mb-[22px]"
              style={{ animation: "fadeUp 0.55s ease 0.2s both" }}
            >
              The cover letter
              <br />
              that gets you
              <br />
              <span className="inline bg-gradient-to-br from-brand-light via-brand to-[#4338ca] bg-clip-text [-webkit-background-clip:text] text-transparent mt-4">
                hired.
              </span>
            </h1>
            <p
              className="text-[15px] text-muted-foreground leading-[1.65] max-w-[340px]"
              style={{ animation: "fadeUp 0.55s ease 0.3s both" }}
            >
              One click on any job posting. A tailored, human-sounding letter
              built from your resume — in under five seconds.
            </p>
          </div>

          <div
            className="flex items-center gap-2.5 flex-wrap"
            style={{ animation: "fadeUp 0.5s ease 0.42s both" }}
          >
            {[
              "Open source · MIT",
              "Bring your own key",
              "10 free letters/day",
            ].map((item, i, arr) => (
              <span key={item} className="flex items-center gap-2.5">
                <span className="text-xs font-medium text-dim tracking-[0.01em]">
                  {item}
                </span>
                {i < arr.length - 1 && (
                  <span className="inline-block w-[3px] h-[3px] rounded-full bg-border shrink-0" />
                )}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel ─────────────────────────────────────────────────── */}
      <div className="relative bg-background flex flex-col items-center justify-center px-10 py-12 min-h-screen max-md:px-6 max-md:pt-14 max-md:pb-10">
        <div className="absolute -top-[160px] left-1/2 -translate-x-1/2 w-[480px] h-[400px] bg-[radial-gradient(ellipse,rgba(99,102,241,0.055)_0%,transparent_65%)] pointer-events-none" />

        {/* Back link — hidden in reset view (user arrived via email link) */}
        {view !== "reset" && (
          <a
            href="/"
            className="absolute top-7 left-8 flex items-center gap-1.5 text-[12.5px] font-semibold text-dim hover:text-muted-foreground transition-colors z-10 max-md:left-5 max-md:top-5"
          >
            <ArrowLeftIcon size={12} />
            Home
          </a>
        )}

        <div
          className="relative z-[1] w-full max-w-[340px] max-md:max-w-full"
          style={{ animation: "fadeUp 0.5s ease 0.15s both" }}
        >
          {/* Mobile logo */}
          <a
            href="/"
            className="hidden max-md:flex items-center gap-[9px] mb-8"
          >
            <Image src="/logo.png" width={24} height={24} alt="Cover Me" />
            <span className="text-[15px] font-bold text-foreground tracking-[-0.3px]">
              Cover Me
            </span>
          </a>

          {/* ── Email confirmed ── */}
          {view === "confirmed" ? (
            <>
              <div className="w-12 h-12 rounded-full bg-[rgba(52,211,153,0.1)] border border-[rgba(52,211,153,0.25)] flex items-center justify-center mb-6">
                <CheckIcon size={22} color="var(--success)" />
              </div>
              <h2 className="text-2xl font-extrabold tracking-[-0.55px] text-foreground leading-[1.2] mb-[5px]">
                Email confirmed.
              </h2>
              <p className="text-[13.5px] text-muted-foreground leading-[1.6] mb-7">
                Your account is active. Let&apos;s get to work.
              </p>
              <Button onClick={() => { window.location.href = "/dashboard"; }} size="lg" className="w-full">
                Go to dashboard
              </Button>
            </>
          ) : /* ── Success state ── */
          status === "success" ? (
            <>
              <div className="flex items-center gap-5 mb-7">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-[-0.55px] text-foreground leading-[1.2] mb-[5px]">
                    {view === "reset"
                      ? "Password updated."
                      : "Check your inbox."}
                  </h2>
                  <p className="text-[13.5px] text-muted-foreground leading-[1.55]">
                    {view === "reset" ? (
                      "Your password has been changed. You're now signed in."
                    ) : view === "forgot" ? (
                      <>
                        We sent a password reset link to{" "}
                        <strong className="text-foreground">{email}</strong>.
                      </>
                    ) : (
                      <>
                        We sent a confirmation link to{" "}
                        <strong className="text-foreground">{email}</strong>.
                        Click it to activate your account.
                      </>
                    )}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-[rgba(52,211,153,0.1)] border border-[rgba(52,211,153,0.25)] flex items-center justify-center shrink-0">
                  <CheckIcon size={20} color="var(--success)" />
                </div>
              </div>

              <div className="flex flex-col items-start gap-5">
                <p className="text-[14px] text-muted-foreground leading-[1.65]">
                  {view === "reset"
                    ? "Head to your dashboard to continue."
                    : view === "forgot"
                      ? "If your email is registered, the link will arrive within a minute. Check your spam folder if you don't see it."
                      : "Once confirmed, sign in below to access your dashboard."}
                </p>
                {view === "reset" ? (
                  <Button
                    onClick={() => {
                      window.location.href = "/dashboard";
                    }}
                  >
                    Go to dashboard
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => switchView("signin")}
                  >
                    Back to sign in
                  </Button>
                )}
              </div>
            </>
          ) : view === "reset" ? (
            /* ── Password reset form ── */
            <>
              <div className="mb-7">
                <h2 className="text-2xl font-extrabold tracking-[-0.55px] text-foreground leading-[1.2] mb-[5px]">
                  {heading}
                </h2>
                <p className="text-[13.5px] text-muted-foreground leading-[1.55]">
                  {subtext}
                </p>
              </div>

              <form onSubmit={handlePasswordReset}>
                <div className="flex flex-col gap-3.5 mb-[18px]">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="new-password">New password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNewPassword ? "text" : "password"}
                        placeholder="At least 6 characters"
                        value={newPassword}
                        autoComplete="new-password"
                        required
                        className="pr-10"
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={
                          showNewPassword ? "Hide password" : "Show password"
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-muted-foreground transition-colors"
                        onClick={() => setShowNewPassword((s) => !s)}
                      >
                        {showNewPassword ? (
                          <EyeSlashIcon size={15} />
                        ) : (
                          <EyeIcon size={15} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="confirm-password">Confirm password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirm ? "text" : "password"}
                        placeholder="Same as above"
                        value={confirmPassword}
                        autoComplete="new-password"
                        required
                        className="pr-10"
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={
                          showConfirm ? "Hide password" : "Show password"
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-muted-foreground transition-colors"
                        onClick={() => setShowConfirm((s) => !s)}
                      >
                        {showConfirm ? (
                          <EyeSlashIcon size={15} />
                        ) : (
                          <EyeIcon size={15} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {error && (
                  <p className="text-[13px] text-destructive bg-destructive/10 border border-destructive/20 rounded-[var(--r)] px-[13px] py-2.5 mb-3.5 leading-[1.5]">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={status === "loading"}
                >
                  {status === "loading" ? (
                    <>
                      <Spinner />
                      Updating
                    </>
                  ) : (
                    "Update password"
                  )}
                </Button>
              </form>
            </>
          ) : view === "forgot" ? (
            /* ── Forgot password form ── */
            <>
              <div className="mb-7">
                <h2 className="text-2xl font-extrabold tracking-[-0.55px] text-foreground leading-[1.2] mb-[5px]">
                  {heading}
                </h2>
                <p className="text-[13.5px] text-muted-foreground leading-[1.55]">
                  {subtext}
                </p>
              </div>

              <form onSubmit={handleForgotPassword}>
                <div className="flex flex-col gap-2 mb-[18px]">
                  <Label htmlFor="email-forgot">Email</Label>
                  <Input
                    id="email-forgot"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    autoComplete="email"
                    required
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {error && (
                  <p className="text-[13px] text-destructive bg-destructive/10 border border-destructive/20 rounded-[var(--r)] px-[13px] py-2.5 mb-3.5 leading-[1.5]">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={status === "loading"}
                >
                  {status === "loading" ? (
                    <>
                      <Spinner />
                      Sending
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </Button>
              </form>

              <p className="text-center text-[13px] text-dim mt-4">
                Remember it?{" "}
                <button
                  type="button"
                  className="bg-transparent border-none text-brand-light font-semibold text-[13px] cursor-pointer p-0 hover:text-foreground transition-colors"
                  onClick={() => switchView("signin")}
                >
                  Sign in →
                </button>
              </p>
            </>
          ) : (
            /* ── Sign in / sign up form ── */
            <>
              <div className="mb-7">
                <h2 className="text-2xl font-extrabold tracking-[-0.55px] text-foreground leading-[1.2] mb-[5px]">
                  {heading}
                </h2>
                <p className="text-[13.5px] text-muted-foreground leading-[1.55]">
                  {subtext}
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-3.5 mb-[18px]">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      autoComplete="email"
                      required
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      {view === "signin" && (
                        <button
                          type="button"
                          className="text-[11.5px] text-dim hover:text-muted-foreground transition-colors"
                          onClick={() => switchView("forgot")}
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder={
                          view === "signup"
                            ? "At least 6 characters"
                            : "••••••••"
                        }
                        value={password}
                        autoComplete={
                          view === "signin"
                            ? "current-password"
                            : "new-password"
                        }
                        required
                        className="pr-10"
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-muted-foreground transition-colors"
                        onClick={() => setShowPassword((s) => !s)}
                      >
                        {showPassword ? (
                          <EyeSlashIcon size={15} />
                        ) : (
                          <EyeIcon size={15} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {error && (
                  <p className="text-[13px] text-destructive bg-destructive/10 border border-destructive/20 rounded-[var(--r)] px-[13px] py-2.5 mb-3.5 leading-[1.5]">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={status === "loading"}
                >
                  {status === "loading" ? (
                    <>
                      <Spinner />
                      {view === "signin" ? "Signing in" : "Creating account"}
                    </>
                  ) : view === "signin" ? (
                    "Sign in"
                  ) : (
                    "Create free account"
                  )}
                </Button>
              </form>

              <p className="text-center text-[13px] text-dim mt-4">
                {view === "signin" ? (
                  <>
                    No account?{" "}
                    <button
                      type="button"
                      className="bg-transparent border-none text-brand-light font-semibold text-[13px] cursor-pointer p-0 hover:text-foreground transition-colors"
                      onClick={() => switchView("signup")}
                    >
                      Create one free →
                    </button>
                  </>
                ) : (
                  <>
                    Have an account?{" "}
                    <button
                      type="button"
                      className="bg-transparent border-none text-brand-light font-semibold text-[13px] cursor-pointer p-0 hover:text-foreground transition-colors"
                      onClick={() => switchView("signin")}
                    >
                      Sign in →
                    </button>
                  </>
                )}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
