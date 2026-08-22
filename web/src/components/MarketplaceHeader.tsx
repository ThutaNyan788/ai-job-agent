import { useState } from "react";
import { BriefcaseBusiness, CirclePlus, LayoutDashboard, LogOut, Menu, MessageSquareText, Video, X } from "lucide-react";
import { authClient } from "@/auth-client";
import { handleInternalLink, navigate } from "@/navigation";

export function MarketplaceHeader({ email, role = "user" }: { email: string; role?: "user" | "company" }) {
  const [open, setOpen] = useState(false);

  async function signOut() {
    await authClient.signOut();
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8" aria-label="Primary navigation">
        <a href="/jobs" onClick={handleInternalLink} className="flex items-center gap-2.5 font-extrabold text-slate-950">
          <span className="grid size-9 place-items-center rounded-xl bg-pink-50 text-pink-600">
            <BriefcaseBusiness className="size-5" />
          </span>
          <span>Talent<span className="text-pink-600">AI</span></span>
        </a>

        <div className="hidden items-center gap-7 md:flex">
          <a href="/jobs" onClick={handleInternalLink} className="text-sm font-semibold text-slate-700 hover:text-pink-600">Explore jobs</a>
          {role === "company" ? (
            <>
              <a href="/company/jobs" onClick={handleInternalLink} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-pink-600"><LayoutDashboard className="size-4" /> My job posts</a>
              <a href="/company/jobs/new" onClick={handleInternalLink} className="inline-flex items-center gap-2 rounded-xl bg-pink-600 px-3 py-2 text-sm font-bold text-white hover:bg-pink-700"><CirclePlus className="size-4" /> Create job</a>
            </>
          ) : (
            <>
              <a href="/ai-assistant" onClick={handleInternalLink} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-pink-600">
                <MessageSquareText className="size-4" /> AI assistant
              </a>
              <a href="/interviews" onClick={handleInternalLink} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-pink-600">
                <Video className="size-4" /> Interviews
              </a>
            </>
          )}
          <span className="max-w-44 truncate text-xs text-slate-400" title={email}>{email}</span>
          <button type="button" onClick={() => void signOut()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            <LogOut className="size-4" /> Sign out
          </button>
        </div>

        <button type="button" className="grid size-10 place-items-center rounded-xl text-slate-700 hover:bg-slate-100 md:hidden" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"}>
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-slate-100 bg-white px-4 py-4 md:hidden">
          <div className="mx-auto grid max-w-7xl gap-2">
            <a href="/jobs" onClick={handleInternalLink} className="rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-pink-50">Explore jobs</a>
            {role === "company" ? (
              <>
                <a href="/company/jobs" onClick={handleInternalLink} className="rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-pink-50">My job posts</a>
                <a href="/company/jobs/new" onClick={handleInternalLink} className="rounded-xl bg-pink-600 px-3 py-2.5 text-center text-sm font-semibold text-white">Create job</a>
              </>
            ) : (
              <>
                <a href="/ai-assistant" onClick={handleInternalLink} className="rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-pink-50">AI assistant</a>
                <a href="/interviews" onClick={handleInternalLink} className="rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-pink-50">Interviews</a>
              </>
            )}
            <button type="button" onClick={() => void signOut()} className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold">
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
