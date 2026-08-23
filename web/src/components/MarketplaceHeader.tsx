import { useState } from "react";
import {
  BriefcaseBusiness,
  CirclePlus,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  User,
  Video,
  X,
} from "lucide-react";
import { authClient } from "@/auth-client";
import { handleInternalLink, navigate } from "@/navigation";
import Logo from "@/assets/logo.png";

export function MarketplaceHeader({
  email,
  role = "user",
}: {
  email: string;
  role?: "user" | "company";
}) {
  const [open, setOpen] = useState(false);

  async function signOut() {
    await authClient.signOut();
    navigate("/");
  }

  const handleMobileNav = (e: React.MouseEvent<HTMLAnchorElement>) => {
    handleInternalLink(e);
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur-xl transition-all">
      <nav
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        aria-label="Primary navigation"
      >
        {/* Logo Link */}
        <a
          href="/jobs"
          onClick={handleInternalLink}
          className="inline-flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
          aria-label="PhayShin home"
        >
          <img
            className="h-9 sm:h-10 w-auto object-contain rounded-md"
            src={Logo}
            alt="PhayShin Logo"
          />
        </a>

        {/* Desktop Navigation Links */}
        <div className="hidden items-center gap-6 lg:gap-7 md:flex">
          <a
            href="/jobs"
            onClick={handleInternalLink}
            className="text-sm font-semibold text-slate-700 hover:text-pink-600 transition-colors"
          >
            Explore jobs
          </a>

          {role === "company" ? (
            <>
              <a
                href="/company/jobs"
                onClick={handleInternalLink}
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-pink-600 transition-colors"
              >
                <LayoutDashboard className="size-4 text-slate-500" />
                <span>My job posts</span>
              </a>
              <a
                href="/company/jobs/new"
                onClick={handleInternalLink}
                className="inline-flex items-center gap-2 rounded-xl bg-pink-600 px-3.5 py-2 text-sm font-bold text-white shadow-xs hover:bg-pink-700 active:scale-95 transition-all"
              >
                <CirclePlus className="size-4" />
                <span>Create job</span>
              </a>
            </>
          ) : (
            <>
              <a
                href="/ai-assistant"
                onClick={handleInternalLink}
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-pink-600 transition-colors"
              >
                <MessageSquareText className="size-4 text-pink-500" />
                <span>AI assistant</span>
              </a>
              <a
                href="/interviews"
                onClick={handleInternalLink}
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-pink-600 transition-colors"
              >
                <Video className="size-4 text-indigo-500" />
                <span>Interviews</span>
              </a>
            </>
          )}

          {/* User Email Pill */}
          <div
            className="flex items-center gap-2 rounded-full bg-slate-100/80 px-3 py-1.5 border border-slate-200/60 max-w-[180px]"
            title={email}
          >
            <div className="grid size-5 place-items-center rounded-full bg-pink-600 text-[10px] font-bold text-white shrink-0">
              {email.charAt(0).toUpperCase()}
            </div>
            <span className="truncate text-xs font-medium text-slate-600">
              {email}
            </span>
          </div>

          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-95 transition-all"
          >
            <LogOut className="size-4" />
            <span>Sign out</span>
          </button>
        </div>

        {/* Mobile Menu Toggle Button */}
        <button
          type="button"
          className="grid size-10 place-items-center rounded-xl text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="size-5 text-slate-900" /> : <Menu className="size-5 text-slate-900" />}
        </button>
      </nav>

      {/* Mobile Navigation Sheet Drawer */}
      {open && (
        <div className="border-t border-slate-100 bg-white/98 backdrop-blur-2xl px-4 py-4 md:hidden shadow-xl animate-in slide-in-from-top-2 duration-200">
          <div className="mx-auto grid max-w-7xl gap-2">
            {/* User Profile Info Card */}
            <div className="mb-2 flex items-center gap-3 rounded-2xl bg-slate-50 p-3 border border-slate-100">
              <div className="grid size-10 place-items-center rounded-xl bg-pink-600 font-extrabold text-white shadow-xs">
                {email.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate">{email}</p>
                <span className="inline-block rounded-md bg-pink-100 px-2 py-0.5 text-[10px] font-bold text-pink-700 capitalize mt-0.5">
                  {role} Account
                </span>
              </div>
            </div>

            {/* Navigation Links */}
            <a
              href="/jobs"
              onClick={handleMobileNav}
              className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-800 hover:bg-pink-50 hover:text-pink-600 active:bg-pink-100/60 transition-colors"
            >
              <BriefcaseBusiness className="size-4 text-pink-500" />
              <span>Explore jobs</span>
            </a>

            {role === "company" ? (
              <>
                <a
                  href="/company/jobs"
                  onClick={handleMobileNav}
                  className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-800 hover:bg-pink-50 hover:text-pink-600 active:bg-pink-100/60 transition-colors"
                >
                  <LayoutDashboard className="size-4 text-slate-500" />
                  <span>My job posts</span>
                </a>
                <a
                  href="/company/jobs/new"
                  onClick={handleMobileNav}
                  className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-pink-600 px-4 py-3 text-center text-sm font-bold text-white shadow-sm active:bg-pink-700 transition-colors"
                >
                  <CirclePlus className="size-4" />
                  <span>Create new job</span>
                </a>
              </>
            ) : (
              <>
                <a
                  href="/ai-assistant"
                  onClick={handleMobileNav}
                  className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-800 hover:bg-pink-50 hover:text-pink-600 active:bg-pink-100/60 transition-colors"
                >
                  <MessageSquareText className="size-4 text-pink-500" />
                  <span>AI assistant</span>
                </a>
                <a
                  href="/interviews"
                  onClick={handleMobileNav}
                  className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-800 hover:bg-pink-50 hover:text-pink-600 active:bg-pink-100/60 transition-colors"
                >
                  <Video className="size-4 text-indigo-500" />
                  <span>Interviews</span>
                </a>
              </>
            )}

            {/* Sign Out Action */}
            <div className="pt-2 mt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  void signOut();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors"
              >
                <LogOut className="size-4 text-slate-500" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}