"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase";
import { afterOAuth, hashReturn, hashTokens, oauthCancelled, oauthErrorDescription, oauthRedirectUrl, safeNext, sessionSwitch } from "@/lib/auth-redirect";
import { saveProductUpdates } from "@/lib/email-preferences";
import { hasSessionCookie } from "@/lib/session-cookie";
import { PLAN_LIMITS } from "@/lib/limits";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/ui/google-icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@phosphor-icons/react";
import { Spinner } from "@/components/ui/spinner";
import { Card } from "@/components/ui/card";
import { ProgressStep } from "@/components/landing/ExtensionPopup";

type View = "signin" | "signup" | "forgot" | "reset" | "confirmed";

// A flag because merging deploys the site, and Google sign-in fails until Supabase has the provider (#16).
const GOOGLE_SIGNIN = process.env.NEXT_PUBLIC_GOOGLE_SIGNIN === "1";

const SIGNUP_UPDATES_KEY = "cover-me:signup-updates";

// window.location.origin differs between www and non-www, and an origin missing
// from Supabase's Redirect URL allowlist silently lands on the homepage. https://github.com/TheLinc/cover-me/commit/3af70b9
function authRedirectUrl(next: string | null = null) {
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/auth`;
  return next ? `${url}?next=${encodeURIComponent(next)}` : url;
}

export default function AuthContent() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  );
}

function AuthForm() {
  const params = useSearchParams();
  const plan = params.get("plan");
  const next = safeNext(params.get("next"));

  // An email link with the token in the hash starts on its own view, not the form.
  // `next dev` also renders /auth on the server, hence the window check (#43).
  const [fromHash] = useState(() => hashReturn(typeof window === "undefined" ? "" : window.location.hash));
  const [view, setView] = useState<View>(fromHash.view ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // Product emails need consent, so the box starts unticked (#114).
  const [productUpdates, setProductUpdates] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  // After Google, a hash error is a cancel or a failed sign-in, not a bad email
  // link. The getSession branch below words it (#42).
  const [error, setError] = useState(params.has("oauth") ? "" : fromHash.error);
  // Set on the first render because the effect strips oauth and code from the URL.
  // The built /auth renders on the client only, so this can't mismatch the server
  // HTML (#39). "session" covers a visit while already signed in (#313).
  const [waiting, setWaiting] = useState<"google" | "opening" | "email" | "session" | null>(() =>
    params.has("error") || fromHash.error ? null : params.has("oauth") ? "google" : params.has("code") ? "email"
      : typeof window !== "undefined" && hashTokens(window.location.hash) ? "email"
      : typeof window !== "undefined" && !window.location.hash && hasSessionCookie(document.cookie) ? "session" : null,
  );
  // A live region that mounts already filled isn't announced, so it stays
  // empty until after the first render (#42).
  const [announce, setAnnounce] = useState(false);
  const [accountEmail, setAccountEmail] = useState("");
  const [switchTo, setSwitchTo] = useState<{ tokens: { access_token: string; refresh_token: string }; email: string; current: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    setAnnounce(true);
    const searchParams = new URLSearchParams(window.location.search);
    // Google returns with ?oauth=1&code=…. A code without oauth is an email
    // confirmation, which createBrowserClient exchanges by itself (#16).
    const isOAuth = searchParams.has("oauth");
    // Read before replaceState below strips the query and the hash (#16).
    const cancelledOAuth = isOAuth && oauthCancelled(window.location.search, window.location.hash);
    const oauthReason = isOAuth ? oauthErrorDescription(window.location.search, window.location.hash) : "";
    // handleGoogle keeps the box in sessionStorage, never the URL, so a crafted
    // link can't opt anyone in (#114).
    const oauthUpdates = isOAuth && sessionStorage.getItem(SIGNUP_UPDATES_KEY) === "1";
    sessionStorage.removeItem(SIGNUP_UPDATES_KEY);
    const isConfirmation = searchParams.has("code") && !isOAuth;
    if (isConfirmation || isOAuth) {
      // Keeps plan and next, since a cancelled Google sign-in leaves the user here to retry (#16).
      const keep = new URLSearchParams();
      for (const key of ["plan", "next"]) {
        const value = searchParams.get(key);
        if (value) keep.set(key, value);
      }
      const rest = keep.toString();
      window.history.replaceState(null, "", window.location.pathname + (rest ? `?${rest}` : ""));
    }

    // Extension signups use the implicit flow and come back with #access_token=….
    // fromHash already read the view and any error (#43).
    const hash = window.location.hash;
    const tokens = hashTokens(hash);
    if (tokens) {
      // The PKCE client ignores implicit-flow tokens and the dashboard checks
      // cookies. Without setSession the user lands on "confirmed" signed out,
      // and a password reset has no session. https://github.com/TheLinc/cover-me/commit/3af70b9
      Promise.all([supabase.auth.getUser(tokens.access_token), supabase.auth.getUser()]).then(([incoming, current]) => {
        if (sessionSwitch(incoming.data.user?.id, current.data.user?.id) === "ask") {
          setSwitchTo({ tokens, email: incoming.data.user?.email ?? "", current: current.data.user?.email ?? "" });
          setWaiting(null);
        } else {
          adoptLinkSession(tokens);
        }
      }).catch(() => setWaiting(null));
    }
    if (hash) window.history.replaceState(null, "", window.location.pathname);

    async function openDashboard() {
      setWaiting("opening");
      // A failed save leaves the user opted out. The dashboard toggle fixes that (#114).
      if (oauthUpdates) await saveProductUpdates(true, "signup").catch(() => {});
      window.location.href = afterOAuth(searchParams.get("plan"), searchParams.get("next"));
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setAccountEmail(session?.user.email ?? "");
      if (event === "PASSWORD_RECOVERY") setView("reset");
      if (event === "SIGNED_IN" && isConfirmation) setView("confirmed");
      if (event === "SIGNED_IN" && isOAuth) openDashboard();
    });

    // getSession waits for the code exchange, so no session means it failed,
    // say an expired or reused link (#16).
    if (isOAuth) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) openDashboard();
        else {
          setWaiting(null);
          // A cancel (?error= or #error=access_denied) shows no error (#16).
          if (!cancelledOAuth) setError(oauthReason || "Google sign-in didn't finish. Please try again.");
        }
      });
    }

    // The exchange can finish before the listener attaches, which fires
    // INITIAL_SESSION, not SIGNED_IN. https://github.com/TheLinc/cover-me/commit/7278c73
    if (isConfirmation) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        // A recovery link also comes back with ?code= and has already set "reset" (#40).
        if (session) setView((v) => (v === "signin" ? "confirmed" : v));
        setWaiting(null);
      });
    }

    // location.replace so Back skips /auth. getUser, not getSession, because a cookie
    // for a session the server dropped would bounce between here and the dashboard (#112).
    if (!isOAuth && !isConfirmation && !hash) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) window.location.replace(afterOAuth(searchParams.get("plan"), searchParams.get("next")));
        else setWaiting(null);
      });
    }

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount: https://github.com/TheLinc/cover-me/commit/7278c73
  }, []);

  function adoptLinkSession(tokens: { access_token: string; refresh_token: string }) {
    setSwitchTo(null);
    setWaiting("email");
    supabase.auth.setSession(tokens).finally(() => setWaiting(null));
  }

  function switchView(to: View) {
    setView(to);
    setError("");
    setStatus("idle");
    setShowPassword(false);
    setShowNewPassword(false);
    setShowConfirm(false);
  }

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
        window.location.href = next ?? "/dashboard";
      } else {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            // The signup trigger (migration 022) saves the box wherever the
            // confirmation link is opened (#114).
            options: { emailRedirectTo: authRedirectUrl(next), ...(productUpdates ? { data: { product_updates: true } } : {}) },
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

  async function handleGoogle() {
    setError("");
    if (view === "signup" && productUpdates) sessionStorage.setItem(SIGNUP_UPDATES_KEY, "1");
    else sessionStorage.removeItem(SIGNUP_UPDATES_KEY);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: oauthRedirectUrl(process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin, plan, params.get("next")),
        // Without it Google signs straight back in to the last account (#16).
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) setError(error.message);
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: authRedirectUrl(),
      });
      if (error) throw error;
      setStatus("success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("idle");
    }
  }

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

  const heading =
    view === "reset"
      ? "Set a new password."
      : view === "forgot"
        ? "Forgot your password?"
        : view === "signin"
          ? "Welcome back."
          : plan === "pro"
            ? "Go Pro."
            : "Create your account.";

  const subtext =
    view === "reset"
      ? "Choose something strong, at least 6 characters."
      : view === "forgot"
        ? "Enter your email and we'll send you a reset link."
        : view === "signin"
          ? "Sign in to your Cover Me account."
          : plan === "pro"
            ? `Up to ${PLAN_LIMITS.pro_daily} letters or resumes and ${PLAN_LIMITS.answer_pro_daily} answers to application questions a day. Your letters and resumes saved to your account, on any device.`
            : `${PLAN_LIMITS.free_starter} free generations to start. No credit card required.`;

  return (
    <div className="grid min-h-screen grid-cols-[55fr_45fr] max-md:grid-cols-1">
      <div
        className="relative overflow-hidden bg-surface border-r border-border max-md:hidden"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(226,223,219,0.85) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
        }}
      >

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
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2 mb-5"
              style={{ animation: "fadeUp 0.5s ease 0.12s both" }}
            >
              Resumes &amp; Cover Letters
            </span>
            <h1
              className="text-[clamp(40px,4.6vw,68px)] leading-[1.02] text-foreground mb-[22px]"
              style={{ animation: "fadeUp 0.55s ease 0.2s both" }}
            >
              The application
              <br />
              that gets you
              <br />
              hired.
            </h1>
            <p
              className="text-[15px] text-muted-foreground leading-[1.65] max-w-[340px]"
              style={{ animation: "fadeUp 0.55s ease 0.3s both" }}
            >
              One click on any job posting. A resume tailored to it and a cover
              letter that sounds like you.
            </p>
          </div>

          <div
            className="flex items-center gap-2.5 flex-wrap"
            style={{ animation: "fadeUp 0.5s ease 0.42s both" }}
          >
            {[
              "Open source · MIT",
              "Bring your own key",
              `${PLAN_LIMITS.free_starter} free to start`,
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

      <div className="relative bg-background flex flex-col items-center px-10 py-12 min-h-screen max-md:px-6 max-md:pt-14 max-md:pb-10">

        {view !== "reset" && (
          <a
            href="/"
            className="absolute top-7 left-8 flex items-center gap-1.5 text-[12.5px] font-semibold text-dim hover:text-muted-foreground transition-colors z-10 max-md:left-5 max-md:top-5"
          >
            <ArrowLeftIcon size={12} />
            Home
          </a>
        )}

        {/* Top-aligned so the heading stays put when the view changes height.
            The offsets match where the centred form had it: a 429px column on
            desktop, measured, plus the logo on phones (#42). */}
        <div
          className="relative z-[1] w-full max-w-[340px] mt-[max(0px,calc(50vh-262px))] max-md:max-w-full max-md:mt-[max(0px,calc(50vh-291px))]"
          style={{ animation: "fadeUp 0.5s ease 0.15s both" }}
        >
          <p role="status" className="sr-only">
            {announce && (switchTo ? "Switch accounts?" : waiting === "email" ? "Checking your link" : waiting === "opening" || waiting === "session" ? "Opening your dashboard" : waiting ? "Signing you in" : "")}
          </p>

          <a
            href="/"
            className="hidden max-md:flex items-center gap-[9px] mb-8"
          >
            <Image src="/logo.png" width={24} height={24} alt="Cover Me" />
            <span className="text-[15px] font-bold text-foreground tracking-[-0.3px]">
              Cover Me
            </span>
          </a>

          {switchTo ? (
            <>
              <div className="mb-7">
                <h2 className="text-2xl text-foreground leading-[1.2] mb-[5px]">
                  Switch accounts?
                </h2>
                <p className="text-[13.5px] text-muted-foreground leading-[1.55]">
                  You&apos;re signed in as <strong className="text-foreground">{switchTo.current}</strong>.
                  This link is for {switchTo.email ? <strong className="text-foreground">{switchTo.email}</strong> : "a different account"}.
                </p>
              </div>
              <div className="flex flex-col gap-2.5">
                <Button size="lg" className="w-full" onClick={() => adoptLinkSession(switchTo.tokens)}>
                  Switch to {switchTo.email || "that account"}
                </Button>
                <Button size="lg" variant="outline" className="w-full" onClick={() => { window.location.replace(next ?? "/dashboard"); }}>
                  Stay as {switchTo.current}
                </Button>
              </div>
            </>
          ) : waiting ? (
            <div>
              <div className="mb-7">
                <h2 className="text-2xl text-foreground leading-[1.2] mb-[5px]">
                  {waiting === "email" ? "Checking your link." : waiting === "session" ? "You're signed in." : "Signing you in."}
                </h2>
                <p className="text-[13.5px] text-muted-foreground leading-[1.55]">
                  {waiting === "email" ? "One moment." : "Opening your dashboard in a moment."}
                </p>
              </div>
              {waiting !== "session" && <Card className="rounded-[16px] p-4 shadow-[0_1px_2px_rgba(30,27,75,0.05),0_12px_28px_-16px_rgba(30,27,75,0.18)]">
                <ul className="flex flex-col gap-3">
                  {waiting === "email" ? (
                    <>
                      <ProgressStep tone="light" state="done">Back from your email</ProgressStep>
                      <ProgressStep tone="light" state="active">Checking your link</ProgressStep>
                    </>
                  ) : (
                    <>
                      <ProgressStep tone="light" state="done">Back from Google</ProgressStep>
                      <ProgressStep tone="light" state={waiting === "opening" ? "done" : "active"}>
                        Starting your session
                      </ProgressStep>
                      <ProgressStep tone="light" state={waiting === "opening" ? "active" : "todo"}>
                        Opening your dashboard
                      </ProgressStep>
                    </>
                  )}
                </ul>
              </Card>}
            </div>
          ) :
          view === "confirmed" ? (
            <>
              <div className="w-12 h-12 rounded-full bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.25)] flex items-center justify-center mb-6">
                <CheckIcon size={22} color="var(--success)" />
              </div>
              <h2 className="text-2xl text-foreground leading-[1.2] mb-[5px]">
                Email confirmed.
              </h2>
              <p className="text-[13.5px] text-muted-foreground leading-[1.6] mb-7">
                Your account is active.{accountEmail && <> You&apos;re signed in as <strong className="text-foreground">{accountEmail}</strong>.</>}
              </p>
              <Button onClick={() => { window.location.href = next ?? "/dashboard"; }} size="lg" className="w-full">
                {next ? "Continue" : "Go to dashboard"}
              </Button>
            </>
          ) :
          status === "success" ? (
            <>
              <div className="flex items-center gap-5 mb-7">
                <div>
                  <h2 className="text-2xl text-foreground leading-[1.2] mb-[5px]">
                    {view === "reset"
                      ? "Password updated."
                      : "Check your inbox."}
                  </h2>
                  <p className="text-[13.5px] text-muted-foreground leading-[1.55]">
                    {view === "reset" ? (
                      <>
                        Your password has been changed. You&apos;re now signed in{accountEmail ? <> as <strong className="text-foreground">{accountEmail}</strong></> : null}.
                      </>
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
                <div className="w-12 h-12 rounded-full bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.25)] flex items-center justify-center shrink-0">
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
            <>
              <div className="mb-7">
                <h2 className="text-2xl text-foreground leading-[1.2] mb-[5px]">
                  {heading}
                </h2>
                <p className="text-[13.5px] text-muted-foreground leading-[1.55]">
                  {subtext}
                  {accountEmail && <> For <strong className="text-foreground">{accountEmail}</strong>.</>}
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
            <>
              <div className="mb-7">
                <h2 className="text-2xl text-foreground leading-[1.2] mb-[5px]">
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
                  className="inline-flex items-center gap-1 align-baseline bg-transparent border-none text-brand-light font-semibold text-[13px] cursor-pointer p-0 hover:text-foreground transition-colors"
                  onClick={() => switchView("signin")}
                >
                  Sign in <ArrowRightIcon size={12} className="-translate-y-px" aria-hidden="true" />
                </button>
              </p>
            </>
          ) : (
            <>
              <div className="mb-7">
                <h2 className="text-2xl text-foreground leading-[1.2] mb-[5px]">
                  {heading}
                </h2>
                <p className="text-[13.5px] text-muted-foreground leading-[1.55]">
                  {subtext}
                </p>
              </div>

              {/* Above both buttons so it reads as applying to Google too (#114). */}
              {view === "signup" && (
                <div className="flex items-center gap-2 mb-[18px]">
                  <Checkbox
                    id="product-updates"
                    checked={productUpdates}
                    onCheckedChange={(v) => setProductUpdates(v === true)}
                    className="rounded-[4px]"
                  />
                  <label htmlFor="product-updates" className="text-[13px] text-muted-foreground cursor-pointer select-none">
                    Email me about new features (a few times a year)
                  </label>
                </div>
              )}

              {GOOGLE_SIGNIN && (
                <div className="flex flex-col gap-3.5 mb-[18px]">
                  <Button type="button" variant="outline" size="lg" className="w-full" onClick={handleGoogle}>
                    <GoogleIcon />
                    Continue with Google
                  </Button>
                  <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
                    <span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" />
                  </div>
                </div>
              )}

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
                      className="inline-flex items-center gap-1 align-baseline bg-transparent border-none text-brand-light font-semibold text-[13px] cursor-pointer p-0 hover:text-foreground transition-colors"
                      onClick={() => switchView("signup")}
                    >
                      Create one free <ArrowRightIcon size={12} className="-translate-y-px" aria-hidden="true" />
                    </button>
                  </>
                ) : (
                  <>
                    Have an account?{" "}
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 align-baseline bg-transparent border-none text-brand-light font-semibold text-[13px] cursor-pointer p-0 hover:text-foreground transition-colors"
                      onClick={() => switchView("signin")}
                    >
                      Sign in <ArrowRightIcon size={12} className="-translate-y-px" aria-hidden="true" />
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
