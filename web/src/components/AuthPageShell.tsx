import type { ReactNode } from "react";
import { ArrowLeft, Sparkles, ShieldCheck } from "lucide-react";
import { handleInternalLink } from "@/navigation";
import Logo from "@/assets/logo.png";

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
    <main className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-pink-50 via-white to-pink-100/60 flex items-center justify-center">
      {/* Background Subtle Ambient Glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-1/4 h-[500px] w-[500px] rounded-full bg-pink-200/50 blur-3xl animate-pulse" />
        <div className="absolute right-[-100px] bottom-[-100px] h-[600px] w-[600px] rounded-full bg-rose-200/40 blur-3xl" />
      </div>

      {/* Main Full-Screen Layout Wrapper (Edge-to-Edge) */}
      <div className="relative z-10 w-full min-h-screen grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-white/50 backdrop-blur-3xl">
        
        {/* Left Interactive Art & Brand Panel (Rich Two-Layer Search Aesthetics) */}
        <section className="relative hidden lg:flex lg:col-span-7 flex-col justify-between p-12 lg:p-16 overflow-hidden bg-gradient-to-br from-pink-100/80 via-pink-50/50 to-transparent border-r border-pink-200/50">
          {/* Top Back Link */}
          <a
            href="/"
            onClick={handleInternalLink}
            className="group relative z-10 inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-bold text-pink-950 shadow-sm border border-pink-200/60 transition-all hover:bg-white"
          >
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" /> Back to home
          </a>

          {/* Complex Two-Layer Dynamic Search & Glass Shapes */}
          <div className="relative flex flex-1 items-center justify-center my-8">
            <div className="relative w-96 h-96 flex items-center justify-center">
              
              {/* Layer 1 (Backdrop Depth Card): Translucent Frosted Panel */}
              <div 
                className="absolute w-80 h-64 rounded-3xl bg-white/40 border border-white/60 shadow-xl backdrop-blur-md transform -rotate-6 translate-y-4"
                style={{ animation: "floatReverse 8s ease-in-out infinite" }}
              >
                {/* Internal UI placeholder skeleton lines */}
                <div className="p-6 space-y-3">
                  <div className="w-24 h-3 bg-pink-300/40 rounded-full" />
                  <div className="w-48 h-3 bg-pink-200/30 rounded-full" />
                  <div className="w-36 h-3 bg-pink-200/20 rounded-full" />
                </div>
              </div>

              {/* Layer 2 (Foreground Focal Layer): Layered Magnifying Glass & Search Ring */}
              <div 
                className="absolute flex items-center justify-center transform rotate-6 translate-x-4 -translate-y-4"
                style={{ animation: "float 6s ease-in-out infinite" }}
              >
                {/* Main Glass Circle Ring */}
                <div className="w-48 h-48 rounded-full border-[12px] border-white/80 bg-gradient-to-tr from-pink-400/40 to-rose-400/30 backdrop-blur-xl shadow-2xl flex items-center justify-center relative overflow-hidden">
                  {/* Inner Refractive Highlight */}
                  <div className="absolute inset-2 rounded-full border border-white/50 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
                  <div className="w-20 h-20 rounded-full bg-pink-500/20 backdrop-blur-md animate-pulse flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-white/60 shadow-inner" />
                  </div>
                </div>

                {/* Sleek Gradient Handle */}
                <div className="absolute -bottom-10 -right-12 w-32 h-7 bg-gradient-to-r from-pink-500 via-rose-400 to-pink-400 rounded-full shadow-2xl transform rotate-45 border border-white/40" />
              </div>

              {/* Accent Floating Mini Glass Ball */}
              <div 
                className="absolute w-16 h-16 rounded-full bg-gradient-to-br from-white/80 to-pink-300/50 backdrop-blur-md shadow-lg top-10 left-12"
                style={{ animation: "float 5s ease-in-out infinite" }}
              />

            </div>
          </div>

          {/* Logo & Bottom Text */}
          <div className="relative z-10 space-y-4">
            <img className="h-10 w-auto object-contain" src={Logo} alt="Logo" />
            <div>
              <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">{artworkTitle}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 max-w-md">{artworkText}</p>
            </div>
          </div>
        </section>

        {/* Right Form Card Panel (Fully anchored edge-to-edge on right) */}
        <section className="flex flex-col justify-between col-span-1 lg:col-span-5 p-6 sm:p-12 lg:p-16 bg-white/90 backdrop-blur-3xl shadow-2xl">
          {/* Mobile Header Link */}
          <div className="flex items-center justify-between mb-8 lg:hidden">
            <a href="/" onClick={handleInternalLink} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <ArrowLeft className="size-3.5" /> Home
            </a>
            <img className="h-8 w-auto object-contain" src={Logo} alt="Logo" />
          </div>

          <div className="my-auto w-full max-w-md mx-auto py-6">
            <div className="space-y-1 mb-8">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">{title}</h1>
              <p className="text-sm text-slate-500">{subtitle}</p>
            </div>

            <div>{children}</div>
          </div>

          {/* Footer security tag */}
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 pt-6">
            <ShieldCheck className="size-4 text-pink-500" />
            <span>Secure Enterprise Authentication</span>
          </div>
        </section>
      </div>

      {/* Dynamic Keyframe Animations for Floating Layers */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); }
          50% { transform: translateY(-12px) rotate(3deg) scale(1.02); }
        }
        @keyframes floatReverse {
          0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); }
          50% { transform: translateY(12px) rotate(-3deg) scale(0.98); }
        }
      `}</style>
    </main>
  );
}

export function GoogleButton({ busy, onClick, label }: { busy: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="group flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-pink-200/60 bg-white text-sm font-bold text-slate-700 shadow-sm transition-all duration-200 hover:border-pink-300 hover:bg-pink-50/30 hover:shadow-md active:scale-[0.99] disabled:opacity-60"
    >
      <span className="grid size-6 place-items-center rounded-full bg-slate-100 text-xs font-bold text-blue-600 transition-transform group-hover:scale-110">G</span>
      {label}
    </button>
  );
}

export function Divider({ text }: { text: string }) {
  return (
    <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider font-semibold text-slate-400">
      <span className="h-px flex-1 bg-pink-100" />
      {text}
      <span className="h-px flex-1 bg-pink-100" />
    </div>
  );
}