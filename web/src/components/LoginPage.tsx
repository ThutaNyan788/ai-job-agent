import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { authClient } from "@/auth-client";
import { handleInternalLink, navigate } from "@/navigation";
import { AuthPageShell, Divider, GoogleButton } from "./AuthPageShell";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await authClient.signIn.email({ email, password, rememberMe });
    setBusy(false);
    if (result.error) {
      setError(result.error.message ?? "Could not sign in. Check your email and password.");
      return;
    }
    navigate("/");
  }

  async function signInWithGoogle() {
    setBusy(true);
    setError(null);
    const result = await authClient.signIn.social({ provider: "google", callbackURL: location.origin });
    if (result.error) {
      setError(result.error.message ?? "Google sign-in could not be started.");
      setBusy(false);
    }
  }

  return (
    <AuthPageShell title="Welcome back" subtitle="Sign in to continue your job search." artworkTitle="Pick up where you left off." artworkText="Your candidate profile, matches, and mock applications stay connected to your account.">
      <form className="space-y-4" onSubmit={submit}>
        <Field label="Email">
          <input className={inputClass} id="login-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </Field>
        <Field label="Password">
          <div className="relative">
            <input className={`${inputClass} pr-11`} id="login-password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            <PasswordToggle shown={showPassword} onClick={() => setShowPassword((shown) => !shown)} />
          </div>
        </Field>
        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" className="size-4 accent-pink-600" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
          Remember me
        </label>
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
        <button className={primaryButtonClass} type="submit" disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" />} Sign in
        </button>
      </form>
      <Divider text="or" />
      <GoogleButton busy={busy} onClick={() => void signInWithGoogle()} label="Continue with Google" />
      <p className="mt-6 text-center text-sm text-slate-500">New to PhayShin?{" "}<a className="font-bold text-pink-700 hover:underline" href="/register" onClick={handleInternalLink}>Create an account</a></p>
    </AuthPageShell>
  );
}

export const inputClass = "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-pink-600 focus:ring-3 focus:ring-pink-100";
export const primaryButtonClass = "flex h-11 w-full items-center justify-center gap-2 rounded-md bg-pink-600 text-sm font-semibold text-white shadow-sm hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-60";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-semibold text-slate-700">{label}{children}</label>;
}

export function PasswordToggle({ shown, onClick }: { shown: boolean; onClick: () => void }) {
  return (
    <button className="absolute right-0 top-0 grid size-11 place-items-center text-slate-400 hover:text-slate-700" type="button" onClick={onClick} aria-label={shown ? "Hide password" : "Show password"}>
      {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  );
}
