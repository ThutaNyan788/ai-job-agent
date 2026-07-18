import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { authClient } from "@/auth-client";
import { handleInternalLink, navigate } from "@/navigation";
import { AuthPageShell, Divider, GoogleButton } from "./AuthPageShell";
import { Field, PasswordToggle, inputClass, primaryButtonClass } from "./LoginPage";

type UserRole = "user" | "company";

export function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!agreed) {
      setError("Please accept the terms and conditions.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await authClient.signUp.email({
      name,
      email,
      password,
      role,
      callbackURL: location.origin,
    } as Parameters<typeof authClient.signUp.email>[0] & { role: UserRole });
    setBusy(false);
    if (result.error) {
      setError(result.error.message ?? "Could not create the account.");
      return;
    }
    navigate(role === "company" ? "/company/jobs" : "/jobs");
  }

  async function signUpWithGoogle() {
    setBusy(true);
    setError(null);
    const result = await authClient.signIn.social({ provider: "google", callbackURL: location.origin });
    if (result.error) {
      setError(result.error.message ?? "Google sign-up could not be started.");
      setBusy(false);
    }
  }

  return (
    <AuthPageShell title="Create your account" subtitle="Start building a job shortlist that fits." artworkTitle="Meet your next opportunity." artworkText="Create a profile once, then return anytime to refine your answers and compare your matches.">
      <form className="space-y-4" onSubmit={submit}>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-slate-700">I want to</legend>
          <div className="grid grid-cols-2 gap-2">
            <RoleOption checked={role === "user"} label="Find a job" description="Candidate account" onChange={() => setRole("user")} />
            <RoleOption checked={role === "company"} label="Hire talent" description="Company account" onChange={() => setRole("company")} />
          </div>
        </fieldset>
        <Field label="Full name">
          <input className={inputClass} id="register-name" type="text" autoComplete="name" placeholder="Alex Morgan" value={name} onChange={(event) => setName(event.target.value)} required />
        </Field>
        <Field label="Email">
          <input className={inputClass} id="register-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </Field>
        <Field label="Password">
          <div className="relative">
            <input className={`${inputClass} pr-11`} id="register-password" type={showPassword ? "text" : "password"} minLength={8} autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={(event) => setPassword(event.target.value)} required />
            <PasswordToggle shown={showPassword} onClick={() => setShowPassword((shown) => !shown)} />
          </div>
        </Field>
        <label className="flex cursor-pointer items-start gap-2 text-sm leading-5 text-slate-600">
          <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-pink-600" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} required />
          <span>I agree to the Terms and Conditions for this local workshop app.</span>
        </label>
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
        <button className={primaryButtonClass} type="submit" disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" />} Create account
        </button>
      </form>
      {role === "user" && (
        <>
          <Divider text="or register with" />
          <GoogleButton busy={busy} onClick={() => void signUpWithGoogle()} label="Continue with Google" />
        </>
      )}
      <p className="mt-6 text-center text-sm text-slate-500">Already have an account?{" "}<a className="font-bold text-pink-700 hover:underline" href="/login" onClick={handleInternalLink}>Sign in</a></p>
    </AuthPageShell>
  );
}

function RoleOption({ checked, label, description, onChange }: { checked: boolean; label: string; description: string; onChange: () => void }) {
  return (
    <label className={`cursor-pointer rounded-xl border p-3 transition ${checked ? "border-pink-400 bg-pink-50 ring-2 ring-pink-100" : "border-slate-200 hover:border-pink-200"}`}>
      <input type="radio" name="role" className="sr-only" checked={checked} onChange={onChange} />
      <span className="block text-sm font-bold text-slate-900">{label}</span>
      <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
    </label>
  );
}
