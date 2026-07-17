import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { authClient } from "@/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type View = "signIn" | "signUp";

export function AuthScreen() {
  const [view, setView] = useState<View>("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    if (view === "signIn") {
      const { error } = await authClient.signIn.email({ email, password });
      setMessage(error?.message ?? "Signed in successfully.");
    }
    if (view === "signUp") {
      const { error } = await authClient.signUp.email({
        name,
        email,
        password,
        callbackURL: location.origin,
      });
      if (error) setMessage(error.message ?? "Could not create the account.");
      else setMessage("Account created. You are now signed in.");
    }
    setBusy(false);
  }

  async function signInWithGoogle() {
    setBusy(true);
    setMessage(null);
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL: location.origin });
    if (error) {
      setMessage(error.message ?? "Google sign-in could not be started.");
      setBusy(false);
    }
  }

  const isSignUp = view === "signUp";
  const title = isSignUp ? "Create account" : "Sign in";

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <section className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-muted-foreground mt-1 text-sm">Job Match Harness</p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          {isSignUp && (
            <label className="grid gap-1.5 text-sm">
              Name
              <Input value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
          )}
          <label className="grid gap-1.5 text-sm">
            Email
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="grid gap-1.5 text-sm">
            Password
            <Input type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          {message && <p className="text-muted-foreground text-sm" role="status">{message}</p>}
          <Button className="w-full" disabled={busy} type="submit">
            {busy && <Loader2 className="size-4 animate-spin" />}
            {isSignUp ? "Create account" : "Sign in"}
          </Button>
        </form>

        <Button className="mt-3 w-full" variant="outline" disabled={busy} onClick={signInWithGoogle}>
          Continue with Google
        </Button>

        <div className="mt-5 flex flex-wrap gap-x-3 gap-y-2 text-sm">
          <button className="text-primary" type="button" onClick={() => setView(isSignUp ? "signIn" : "signUp")}>
            {isSignUp ? "Already have an account?" : "Create an account"}
          </button>
        </div>
      </section>
    </main>
  );
}
