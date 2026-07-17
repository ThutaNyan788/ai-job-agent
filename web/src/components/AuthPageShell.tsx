import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import heroImage from "@/assets/hero.png";
import { handleInternalLink } from "@/navigation";

export function AuthPageShell({
  title,
  subtitle,
  artworkTitle,
  artworkText,
  children,
}: {
  title: string;
  subtitle: string;
  artworkTitle: string;
  artworkText: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-100 p-3 sm:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-5xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl sm:min-h-[calc(100vh-3rem)] md:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-pink-100 p-8 md:flex md:flex-col">
          <a href="/" onClick={handleInternalLink} className="relative z-10 inline-flex w-fit items-center gap-2 text-sm font-semibold text-pink-900">
            <ArrowLeft className="size-4" /> Back to home
          </a>
          <div className="relative flex min-h-0 flex-1 items-center justify-center">
            <div className="absolute size-72 rounded-full bg-white/60" aria-hidden="true" />
            <img className="relative z-10 max-h-[390px] w-auto max-w-full object-contain drop-shadow-xl" src={heroImage} alt="TalentAI job assistant" />
          </div>
          <div className="relative z-10 text-center text-pink-950">
            <h2 className="text-2xl font-bold">{artworkTitle}</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-pink-900/70">{artworkText}</p>
          </div>
        </section>
        <section className="flex items-center justify-center px-5 py-10 sm:px-10 md:px-12">
          <div className="w-full max-w-sm">
            <a href="/" onClick={handleInternalLink} className="mb-9 flex items-center gap-2.5 md:pointer-events-none">
              <span className="grid size-10 place-items-center rounded-md bg-pink-600 text-lg font-extrabold text-white">T</span>
              <span className="text-xl font-extrabold text-slate-950">Talent<span className="text-pink-600">AI</span></span>
            </a>
            <h1 className="text-3xl font-bold text-slate-950">{title}</h1>
            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}

export function GoogleButton({ busy, onClick, label }: { busy: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" disabled={busy} onClick={onClick} className="flex h-11 w-full items-center justify-center gap-3 rounded-md border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
      <span className="grid size-5 place-items-center rounded-full border border-slate-200 font-bold text-blue-600">G</span>
      {label}
    </button>
  );
}

export function Divider({ text }: { text: string }) {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
      <span className="h-px flex-1 bg-slate-200" />
      {text}
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}
