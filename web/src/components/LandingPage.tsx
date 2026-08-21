import { useEffect, useState, useRef, type ComponentType, type ReactNode } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  Menu,
  MessageSquareText,
  SearchCheck,
  Sparkles,
  X,
  CalendarClock,
  Zap,
  Building2,
  MapPin,
  Laptop,
  Video,
} from "lucide-react";
import heroImage from "@/assets/hero.png";
import Logo from "@/assets/logo.png";
import { handleInternalLink } from "@/navigation";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Job catalog", href: "#companies" },
];

const features = [
  {
    icon: MessageSquareText,
    title: "Guided candidate profile",
    description:
      "A focused conversation captures your role, skills, projects, experience, location, and work preference.",
  },
  {
    icon: SearchCheck,
    title: "Explainable job matching",
    description:
      "See ranked roles with match scores, matched skills, experience fit, and a clear reason for every result.",
  },
  {
    icon: ClipboardCheck,
    title: "Durable application review",
    description:
      "Review a fictional application, approve or cancel it, and keep its status across sessions.",
  },
];

const steps = [
  {
    icon: MessageSquareText,
    title: "Tell us what you are looking for",
    description:
      "Answer seven short questions so the assistant understands your goals and experience.",
  },
  {
    icon: SearchCheck,
    title: "Compare your best matches",
    description:
      "The harness searches a seeded catalog and ranks roles consistently against your profile.",
  },
  {
    icon: CheckCircle2,
    title: "Review a mock application",
    description:
      "Open a job, inspect every detail, and approve or cancel a durable practice application.",
  },
  {
    icon: CalendarClock,
    title: "Real Interview with HR",
    description:
      "Schedule a real interview with an HR representative to assess your skills and experience.",
  },
];

// Reusable Scroll Reveal Wrapper
function FadeIn({
  children,
  delay = 0,
  direction = "up",
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  direction?: "up" | "left" | "right" | "none";
  className?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1, rootMargin: "20px" }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const translateClass =
    direction === "up"
      ? "translate-y-10"
      : direction === "left"
      ? "-translate-x-10"
      : direction === "right"
      ? "translate-x-10"
      : "";

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out ${className} ${
        isVisible ? "opacity-100 translate-y-0 translate-x-0" : `opacity-0 ${translateClass}`
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased selection:bg-pink-200 overflow-x-hidden">
      {/* Global CSS Keyframe Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-16px) rotate(1.5deg); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-26px) rotate(-2deg); }
        }
        @keyframes orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes orbit-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; transform: scale(0.95); }
          50% { opacity: 0.7; transform: scale(1.08); }
        }
        @keyframes peek-up {
          0% { transform: translateY(100%); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .animate-float { animation: float 5s ease-in-out infinite; }
        .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
        .animate-orbit { animation: orbit 24s linear infinite; }
        .animate-orbit-reverse { animation: orbit-reverse 30s linear infinite; }
        .animate-pulse-glow { animation: pulse-glow 4s ease-in-out infinite; }
        .animate-peek { animation: peek-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      <Navbar />
      <main>
        <Hero />
        <FeatureSection />
        <HowItWorks />
        <CallToAction />
      </main>
      <Footer />
    </div>
  );
}

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 bg-white/90 backdrop-blur-xl transition-shadow ${
        scrolled ? "border-b border-slate-200 shadow-sm" : ""
      }`}
    >
      <nav
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8"
        aria-label="Primary navigation"
      >
        <Brand />
        <ul className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                className="text-sm font-medium text-slate-600 transition-colors hover:text-pink-600"
                href={link.href}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-3 md:flex">
          <a
            className="px-3 py-2 text-sm font-semibold text-slate-700 hover:text-pink-600"
            href="/login"
            onClick={handleInternalLink}
          >
            Sign in
          </a>
          <a
            className="rounded-md bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-pink-700"
            href="/register"
            onClick={handleInternalLink}
          >
            Create account
          </a>
        </div>
        <button
          type="button"
          className="grid size-10 place-items-center rounded-md text-slate-700 hover:bg-slate-100 md:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>
      {mobileOpen && (
        <div className="border-t border-slate-100 bg-white px-5 py-4 md:hidden">
          <div className="mx-auto grid max-w-7xl gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-pink-50"
                href={link.href}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a
                className="rounded-md border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold"
                href="/login"
                onClick={handleInternalLink}
              >
                Sign in
              </a>
              <a
                className="rounded-md bg-pink-600 px-4 py-2.5 text-center text-sm font-semibold text-white"
                href="/register"
                onClick={handleInternalLink}
              >
                Create account
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function FloatingParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
      <div className="absolute size-2 rounded-full bg-pink-400/40 top-1/4 left-10 animate-particle-float-1" />
      <div className="absolute size-3 rounded-full bg-rose-400/30 top-1/3 right-12 animate-particle-float-2" />
      <div className="absolute size-1.5 rounded-full bg-pink-400/50 top-2/3 left-1/3 animate-particle-float-3" />
      <div className="absolute size-2.5 rounded-full bg-rose-400/30 bottom-1/4 right-1/4 animate-particle-float-1" />
    </div>
  );
}

function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden border-b border-slate-100 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-pink-100/70 via-slate-50 to-rose-100/50"
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:2.5rem_2.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 animate-grid-slide pointer-events-none -z-10" />
      <div className="absolute top-12 left-10 size-96 rounded-full bg-pink-300/30 blur-3xl animate-blob-morph pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-10 size-96 rounded-full bg-rose-300/30 blur-3xl animate-blob-morph pointer-events-none -z-10" style={{ animationDelay: "-7s" }} />

      <FloatingParticles />

      <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-7xl items-center gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_1.3fr] lg:py-16">
        <div className="relative z-10 max-w-2xl">
          <FadeIn direction="left" delay={100}>
            <div className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-pink-50/80 backdrop-blur px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-pink-700 shadow-sm">
              <Sparkles className="size-3.5 animate-pulse text-pink-600" />
              AI career assistant platform
            </div>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.15] text-slate-950 sm:text-5xl lg:text-6xl">
              Find your dream job with an{" "}
              <span className="bg-gradient-to-r from-pink-600 via-rose-600 to-pink-600 bg-clip-text text-transparent">
                intelligent AI partner.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Build your candidate profile through chat, search structured roles, and let your AI assistant pinpoint your absolute best matches with complete transparency.
            </p>
          </FadeIn>

          <FadeIn direction="left" delay={250}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                className="inline-flex items-center justify-center gap-2 rounded-md bg-pink-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-pink-200 transition-all hover:-translate-y-0.5 hover:bg-pink-700 active:translate-y-0"
                href="/register"
                onClick={handleInternalLink}
              >
                Find your dream job <ArrowRight className="size-5" />
              </a>
              <a
                className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white/80 backdrop-blur px-6 py-3.5 font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
                href="/login"
                onClick={handleInternalLink}
              >
                Sign in
              </a>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-500">
              {["High Match Precision", "Explainable Fits", "Instant Direct Apply"].map(
                (item) => (
                  <span key={item} className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="size-4 text-pink-600" />
                    {item}
                  </span>
                )
              )}
            </div>
          </FadeIn>
        </div>

        <FadeIn delay={200} className="flex justify-center lg:justify-end">
          <Hero3DScene />
        </FadeIn>
      </div>
    </section>
  );
}

function Hero3DScene() {
  return (
    <div className="relative flex min-h-[500px] w-full items-center justify-center lg:min-h-[620px]">
      <div className="absolute inset-0 -z-20 flex items-center justify-center pointer-events-none">
        <div className="absolute size-[340px] sm:size-[520px] rounded-full bg-pink-400/20 blur-[100px] animate-pulse-glow" />
        <div
          className="absolute size-[280px] sm:size-[440px] rounded-full bg-rose-400/20 blur-[80px] animate-pulse-glow"
          style={{ animationDelay: "2s" }}
        />
      </div>

      <svg className="absolute inset-0 size-full pointer-events-none z-20" overflow="visible">
        <defs>
          <linearGradient id="heroLaserGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#db2777" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#e11d48" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        <path
          d="M 220 320 Q 280 260 340 180"
          fill="none"
          stroke="url(#heroLaserGrad)"
          strokeWidth="2"
          strokeDasharray="6 6"
          className="animate-[laser-pulse_3s_infinite_linear]"
        />
        <path
          d="M 280 340 Q 350 300 420 250"
          fill="none"
          stroke="url(#heroLaserGrad)"
          strokeWidth="2.5"
          strokeDasharray="8 4"
          className="animate-[laser-pulse_2.5s_infinite_linear]"
        />
      </svg>

      <div className="relative z-10 w-full max-w-lg flex items-center justify-center animate-float">
        <div className="relative z-10 flex flex-col items-center">
          <div className="rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-[0_25px_60px_rgba(219,39,119,0.12)] backdrop-blur-2xl relative w-[320px] sm:w-[360px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-rose-400 inline-block" />
                <span className="size-3 rounded-full bg-amber-400 inline-block" />
                <span className="size-3 rounded-full bg-emerald-400 inline-block" />
              </div>
              <span className="text-[11px] font-bold text-pink-600 bg-pink-50 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Laptop className="size-3" /> Job Search Workspace
              </span>
            </div>

            <div className="mt-5 flex flex-col items-center justify-center py-6 bg-slate-900 rounded-2xl text-white relative overflow-hidden shadow-inner">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-pink-900/40 via-slate-900 to-slate-950" />
              <div className="relative z-10 flex flex-col items-center">
                <div className="size-16 rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 p-1 shadow-lg flex items-center justify-center">
                  <div className="size-full rounded-full bg-slate-950 flex items-center justify-center text-lg font-extrabold text-pink-300">
                    Pro
                  </div>
                </div>
                <div className="mt-3 text-sm font-bold text-slate-100">Modern Professional</div>
                <div className="text-xs text-pink-300/80 flex items-center gap-1 mt-0.5">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" /> Exploring Opportunities
                </div>
              </div>
              <div className="mt-5 w-48 h-3 bg-slate-800 rounded-t-md border-t border-slate-700 flex items-center justify-center">
                <div className="w-10 h-1 bg-slate-600 rounded-full" />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">Active Search</span>
              <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">AI Connected</span>
            </div>
          </div>
        </div>

        <div className="absolute -left-6 sm:-left-12 bottom-6 z-30 animate-float-slow">
          <div className="rounded-2xl border border-pink-200 bg-white/95 p-4 shadow-[0_20px_40px_rgba(219,39,119,0.18)] backdrop-blur-xl flex flex-col items-center w-36 sm:w-44">
            <div className="relative size-14 flex items-center justify-center">
              <div className="absolute top-2 left-2 size-2.5 rounded-full bg-cyan-300 animate-ping" />
              <img src={heroImage} alt="Assistant Robot" className="size-12 object-contain" />
            </div>
            <div className="mt-3 text-center">
              <div className="text-xs font-bold text-slate-900">AI Assistant</div>
              <div className="text-[10px] text-pink-600 font-semibold mt-0.5">Always Online</div>
            </div>
          </div>
        </div>

        <div className="absolute -right-6 sm:-right-10 top-2 z-40 w-64 sm:w-72 animate-float">
          <div className="rounded-2xl border border-pink-300 bg-white/95 p-4 shadow-[0_20px_50px_rgba(219,39,119,0.22)] backdrop-blur-2xl relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500" />
            
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-pink-700 bg-pink-50 border border-pink-200 px-2 py-0.5 rounded-md">
                AI Recommended
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <Sparkles className="size-3" /> 96% Match
              </span>
            </div>

            <div className="mt-3">
              <h3 className="text-base font-bold text-slate-900">Frontend Developer</h3>
              <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Building2 className="size-3 text-slate-400" /> TechCorp</span>
                <span className="flex items-center gap-1"><MapPin className="size-3 text-slate-400" /> Remote</span>
              </div>
            </div>

            <button
              type="button"
              className="mt-3 w-full rounded-xl bg-pink-600 py-2 text-center text-xs font-bold text-white shadow-md shadow-pink-200 hover:bg-pink-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
            >
              Apply Now <ArrowRight className="size-3.5" />
            </button>
          </div>
        </div>

        {/* New Live HR Interview Scheduled Floating Card Animation */}
        <div className="absolute right-2 sm:right-6 bottom-[-36px] sm:bottom-[-48px] z-35 w-60 sm:w-68 animate-float-slow" style={{ animationDelay: "1s" }}>
          <div className="rounded-2xl border border-indigo-100 bg-white/95 p-3.5 shadow-xl backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
            <div className="flex items-center justify-between pl-2">
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Video className="size-3.5 animate-pulse" />
                </span>
                <div>
                  <div className="text-xs font-bold text-slate-900">HR Live Interview</div>
                  <div className="text-[10px] text-slate-500">Today at 2:30 PM</div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-indigo-500 animate-ping" /> Scheduled
              </span>
            </div>
          </div>
        </div>

        <div className="absolute left-16 sm:left-24 -top-12 z-20 w-48 animate-float" style={{ animationDelay: "3s" }}>
          <div className="rounded-xl border border-slate-200 bg-white/90 p-2.5 shadow-md backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">UI/UX Designer</span>
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">89% Match</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureSection() {
  return (
    <section id="features" className="relative py-20 lg:py-28 overflow-hidden bg-white">
      {/* Background Animated Watermark Robots */}
      <div className="absolute -left-32 top-12 opacity-[0.04] pointer-events-none animate-float-slow">
        <img src={heroImage} alt="" className="h-[500px] w-auto rotate-12" />
      </div>
      <div
        className="absolute -right-32 bottom-4 opacity-[0.03] pointer-events-none animate-float-slow"
        style={{ animationDelay: "3s" }}
      >
        <img src={heroImage} alt="" className="h-[460px] w-auto -rotate-12" />
      </div>

      <div className="relative z-10">
        <FadeIn>
          <SectionHeading
            eyebrow="Built for focused job search"
            title="From profile to job review in one workspace"
            description="Every tool call is visible, deterministic matching is explainable, and your progress is saved to your account."
          />
        </FadeIn>

        <div className="mx-auto mt-14 grid max-w-7xl gap-6 px-5 sm:px-8 md:grid-cols-3">
          {features.map((feature, index) => (
            <FadeIn key={feature.title} delay={index * 150}>
              <InfoCard {...feature} />
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="border-y border-slate-100 bg-slate-50 py-20 lg:py-28 overflow-hidden relative"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <FadeIn>
          <SectionHeading
            eyebrow="How it works"
            title="Four steps to your next opportunity"
          />
        </FadeIn>

        <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_auto] items-center">
          {/* Steps Column */}
          <ol className="grid gap-6 md:grid-cols-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.title}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-all hover:-translate-y-1 hover:shadow-md"
                >
                  <FadeIn delay={index * 120} direction="up">
                    <div className="flex items-center gap-4">
                      <span className="grid size-12 place-items-center rounded-xl bg-pink-100 text-pink-600">
                        <Icon className="size-6" />
                      </span>
                      <span className="text-xs font-extrabold text-pink-600 tracking-wider">
                        STEP 0{index + 1}
                      </span>
                    </div>
                    <h3 className="mt-5 text-xl font-bold text-slate-900">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {step.description}
                    </p>
                  </FadeIn>
                </li>
              );
            })}
          </ol>

          {/* Animated Guiding Robot Side Visual */}
          <FadeIn
            direction="right"
            delay={300}
            className="hidden lg:flex flex-col items-center justify-center relative"
          >
            <div className="absolute inset-0 bg-pink-200/50 rounded-full blur-[80px] animate-pulse-glow" />
            <div className="relative z-10 animate-float">
              <img
                src={heroImage}
                alt="Assistant Robot Guide"
                className="h-[380px] w-auto object-contain drop-shadow-xl"
              />
              <div className="mt-4 text-center rounded-full bg-white/90 backdrop-blur px-4 py-1.5 text-xs font-semibold text-slate-700 shadow border border-slate-200">
                🤖 Assisting your job search
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

function CallToAction() {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
  <section id="companies" className="px-5 py-24 sm:px-8 lg:py-32 relative overflow-hidden bg-white">
  <FadeIn>
    <div ref={ref} className="mx-auto max-w-6xl relative">
      
      {/* Main Bento Container with Light Pink Theme */}
      <div className="relative z-10 overflow-hidden rounded-3xl bg-pink-100 p-8 sm:p-12 lg:p-16 text-slate-950 shadow-2xl border border-pink-200">
        
        {/* Ambient Background Radial Mesh Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-pink-300/60 via-pink-100 to-pink-50 -z-10" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Side: Interactive Preview / Peeking Element */}
          <div className="lg:col-span-5 relative flex items-center justify-center min-h-[220px] rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 overflow-hidden p-6 shadow-sm">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#fbcfe8_1px,transparent_1px),linear-gradient(to_bottom,#fbcfe8_1px,transparent_1px)] bg-[size:2rem_2rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40" />
            
            {/* Peeking Robot Animation Container */}
            <div className="relative z-10 flex flex-col items-center text-center">
              {isVisible && (
                <img
                  src={Logo}
                  alt="Peeking Robot"
                  className="h-28 w-auto object-contain animate-peek drop-shadow-[0_10px_20px_rgba(236,72,153,0.2)] mb-4"
                  style={{ transformOrigin: "bottom center" }}
                />
              )}
              
            </div>
          </div>

          {/* Right Side: Content & Actions */}
          <div className="lg:col-span-7 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 mb-4">
              <BriefcaseBusiness className="size-5 text-pink-600 animate-bounce" style={{ animationDuration: "3.5s" }} />
              <span className="font-semibold text-sm tracking-wide text-pink-700 uppercase">BriefcaseBusiness</span>
            </div>

            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl text-slate-900">
              Start building your job shortlist.
            </h2>

            <p className="mt-4 max-w-xl text-base text-slate-600 sm:text-lg">
              Create an account and let the assistant collect the details needed to
              search 20 structured fictional roles.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <a
                className="inline-flex items-center gap-2 rounded-xl bg-pink-600 px-8 py-4 text-base font-semibold text-white shadow-[0_0_25px_rgba(236,72,153,0.35)] transition-all hover:-translate-y-1 hover:bg-pink-500 active:translate-y-0"
                href="/register"
                onClick={handleInternalLink}
              >
                Create free account <ArrowRight className="size-5" />
              </a>
              <span className="text-xs text-slate-500 font-medium">
                Takes less than 1 minute
              </span>
            </div>
          </div>

        </div>
      </div>

    </div>
  </FadeIn>
</section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl px-5 text-center sm:px-8">
      <p className="text-sm font-extrabold uppercase tracking-widest text-pink-600">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-extrabold text-slate-950 sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-lg leading-8 text-slate-600">{description}</p>
      )}
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <article className="h-full rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-sm p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:border-pink-200 hover:bg-white relative overflow-hidden group">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-pink-100 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-70" />

      <span className="relative z-10 grid size-12 place-items-center rounded-xl bg-pink-50 text-pink-600 ring-1 ring-pink-100">
        <Icon className="size-6" />
      </span>
      <h3 className="relative z-10 mt-6 text-xl font-bold text-slate-900">{title}</h3>
      <p className="relative z-10 mt-3 leading-7 text-slate-600">{description}</p>
    </article>
  );
}

function Brand() {
  return (
   <a
      href="#top"
      className="inline-flex items-center group transition-transform hover:scale-105"
      aria-label="PhayShin home"
    >
      <img
        className="h-12 w-auto object-contain rounded-md"
        src={Logo}
        alt="PhayShin Logo"
      />
    </a>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-5 py-10 sm:px-8 md:flex-row">
        <Brand />
        <p className="text-sm font-medium text-slate-500">
          &copy; {new Date().getFullYear()} PhayShin. Fictional job matching for
          this workshop.
        </p>
      </div>
    </footer>
  );
}