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
  Building2,
  MapPin,
  Laptop,
  Video,
  User,
  UserPlus,
  Compass,
  Layers,
} from "lucide-react";
import heroImage from "@/assets/hero.png";
import Logo from "@/assets/logo.png";
import { handleInternalLink } from "@/navigation";

const navLinks = [
  { label: "Features", href: "#features", icon: Layers },
  { label: "How it works", href: "#how-it-works", icon: Compass },
  { label: "Job catalog", href: "#companies", icon: BriefcaseBusiness },
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
      ? "translate-y-8"
      : direction === "left"
      ? "-translate-x-6 sm:-translate-x-10"
      : direction === "right"
      ? "translate-x-6 sm:translate-x-10"
      : "";

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${className} ${
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
          50% { transform: translateY(-12px) rotate(1deg); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-18px) rotate(-1.5deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; transform: scale(0.95); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        @keyframes peek-up {
          0% { transform: translateY(100%); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .animate-float { animation: float 5s ease-in-out infinite; }
        .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
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

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileOpen]);

  return (
    <header
      className={`sticky top-0 z-50 bg-white/95 backdrop-blur-xl transition-all ${
        scrolled ? "border-b border-slate-100 shadow-xs" : ""
      }`}
    >
      <nav
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        aria-label="Primary navigation"
      >
        <Brand />

        {/* Desktop Nav Items */}
        <ul className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                className="text-sm font-semibold text-slate-600 transition-colors hover:text-pink-600"
                href={link.href}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 md:flex">
          <a
            className="px-3.5 py-2 text-sm font-semibold text-slate-700 hover:text-pink-600 transition-colors"
            href="/login"
            onClick={handleInternalLink}
          >
            Sign in
          </a>
          <a
            className="rounded-xl bg-pink-600 px-4 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-pink-700 active:scale-95 transition-all"
            href="/register"
            onClick={handleInternalLink}
          >
            Create account
          </a>
        </div>

        {/* Mobile Toggle Button */}
        <button
          type="button"
          className="grid size-10 place-items-center rounded-xl text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors md:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {/* Mobile Menu Drawer Overlay & Content */}
      {mobileOpen && (
        <div className="fixed inset-x-0 top-16 bottom-0 z-50 bg-slate-900/20 backdrop-blur-xs md:hidden animate-in fade-in duration-200">
          <div className="border-b border-slate-100 bg-white px-4 py-5 shadow-2xl animate-in slide-in-from-top-2 duration-200 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="mx-auto grid max-w-7xl gap-1">
              <span className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Navigation
              </span>
              {navLinks.map((link) => {
                const LinkIcon = link.icon;
                return (
                  <a
                    key={link.href}
                    className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-800 hover:bg-pink-50 hover:text-pink-600 active:bg-pink-100/60 transition-colors"
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                  >
                    <LinkIcon className="size-4 text-pink-500" />
                    <span>{link.label}</span>
                  </a>
                );
              })}

              <div className="mt-4 pt-4 border-t border-slate-100 grid gap-2.5">
                <a
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors"
                  href="/login"
                  onClick={(e) => {
                    setMobileOpen(false);
                    handleInternalLink(e);
                  }}
                >
                  <User className="size-4 text-slate-500" />
                  <span>Sign in</span>
                </a>
                <a
                  className="flex items-center justify-center gap-2 rounded-xl bg-pink-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-pink-700 active:scale-[0.98] transition-colors"
                  href="/register"
                  onClick={(e) => {
                    setMobileOpen(false);
                    handleInternalLink(e);
                  }}
                >
                  <UserPlus className="size-4" />
                  <span>Create free account</span>
                </a>
              </div>
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
      <div className="absolute size-2 rounded-full bg-pink-400/40 top-1/4 left-4 sm:left-10 animate-float" />
      <div className="absolute size-3 rounded-full bg-rose-400/30 top-1/3 right-4 sm:right-12 animate-float-slow" />
      <div className="absolute size-1.5 rounded-full bg-pink-400/50 top-2/3 left-1/3 animate-float" />
    </div>
  );
}

function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden border-b border-slate-100 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-pink-100/70 via-slate-50 to-rose-100/50"
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:2rem_2rem] sm:bg-[size:2.5rem_2.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none -z-10" />
      <div className="absolute top-12 left-10 size-64 sm:size-96 rounded-full bg-pink-300/30 blur-3xl animate-pulse-glow pointer-events-none -z-10" />

      <FloatingParticles />

      <div className="mx-auto grid max-w-7xl items-center gap-8 lg:gap-12 px-4 py-8 sm:px-6 lg:px-8 lg:grid-cols-[1.1fr_1.2fr] lg:py-16">
        <div className="relative z-10 max-w-2xl text-center lg:text-left mx-auto lg:mx-0">
          <FadeIn direction="left" delay={100}>
            <div className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-pink-50/90 backdrop-blur-md px-3 py-1 text-xs font-bold uppercase tracking-wide text-pink-700 shadow-2xs">
              <Sparkles className="size-3.5 animate-pulse text-pink-600 shrink-0" />
              <span>AI career assistant platform</span>
            </div>
            <h1 className="mt-4 text-3xl font-extrabold leading-[1.18] text-slate-950 sm:text-5xl lg:text-6xl tracking-tight">
              Find your dream job with an{" "}
              <span className="bg-gradient-to-r from-pink-600 via-rose-600 to-pink-600 bg-clip-text text-transparent">
                intelligent AI partner.
              </span>
            </h1>
            <p className="mt-4 text-base sm:text-lg leading-relaxed text-slate-600 max-w-xl mx-auto lg:mx-0">
              Build your candidate profile through chat, search structured roles, and let your AI assistant pinpoint your absolute best matches with complete transparency.
            </p>
          </FadeIn>

          <FadeIn direction="left" delay={200}>
            <div className="mt-6 sm:mt-8 flex flex-col gap-3 sm:flex-row justify-center lg:justify-start">
              <a
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-pink-600 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-pink-200 hover:bg-pink-700 active:scale-[0.98] transition-all"
                href="/register"
                onClick={handleInternalLink}
              >
                <span>Find your dream job</span>
                <ArrowRight className="size-5" />
              </a>
              <a
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white/90 backdrop-blur px-6 py-3.5 text-base font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-[0.98] transition-all"
                href="/login"
                onClick={handleInternalLink}
              >
                Sign in
              </a>
            </div>
            
            <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-xs sm:text-sm text-slate-500">
              {["High Match Precision", "Explainable Fits", "Instant Direct Apply"].map(
                (item) => (
                  <span key={item} className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="size-4 text-pink-600 shrink-0" />
                    <span>{item}</span>
                  </span>
                )
              )}
            </div>
          </FadeIn>
        </div>

        <FadeIn delay={200} className="flex justify-center w-full overflow-hidden py-4">
          <Hero3DScene />
        </FadeIn>
      </div>
    </section>
  );
}

function Hero3DScene() {
  return (
    <div className="relative flex min-h-[440px] sm:min-h-[520px] w-full max-w-md sm:max-w-xl items-center justify-center px-2">
      {/* Background glow effects */}
      <div className="absolute inset-0 -z-20 flex items-center justify-center pointer-events-none">
        <div className="size-[280px] sm:size-[440px] rounded-full bg-pink-400/20 blur-[70px] sm:blur-[100px] animate-pulse-glow" />
      </div>

      <div className="relative z-10 w-full flex items-center justify-center animate-float">
        {/* Main Workspace Card */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="rounded-3xl border border-slate-200/90 bg-white/95 p-4 sm:p-6 shadow-[0_20px_50px_rgba(219,39,119,0.12)] backdrop-blur-2xl relative w-[280px] sm:w-[350px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-rose-400 inline-block" />
                <span className="size-2.5 rounded-full bg-amber-400 inline-block" />
                <span className="size-2.5 rounded-full bg-emerald-400 inline-block" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-pink-600 bg-pink-50 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Laptop className="size-3" /> Job Workspace
              </span>
            </div>

            <div className="mt-4 flex flex-col items-center justify-center py-5 bg-slate-900 rounded-2xl text-white relative overflow-hidden shadow-inner">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-pink-900/40 via-slate-900 to-slate-950" />
              <div className="relative z-10 flex flex-col items-center">
                <div className="size-14 sm:size-16 rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 p-1 shadow-lg flex items-center justify-center">
                  <div className="size-full rounded-full bg-slate-950 flex items-center justify-center text-base sm:text-lg font-extrabold text-pink-300">
                    Pro
                  </div>
                </div>
                <div className="mt-2.5 text-xs sm:text-sm font-bold text-slate-100">Modern Professional</div>
                <div className="text-[10px] sm:text-xs text-pink-300/80 flex items-center gap-1 mt-0.5">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Exploring Opportunities</span>
                </div>
              </div>
            </div>

            <div className="mt-3.5 flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-medium">Active Search</span>
              <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">AI Connected</span>
            </div>
          </div>
        </div>

        {/* Floating Robot Card - Left */}
        <div className="absolute -left-2 sm:-left-8 bottom-2 sm:bottom-6 z-30 animate-float-slow">
          <div className="rounded-2xl border border-pink-200 bg-white/95 p-3 sm:p-4 shadow-lg backdrop-blur-xl flex flex-col items-center w-32 sm:w-40">
            <div className="relative size-10 sm:size-12 flex items-center justify-center">
              <img src={heroImage} alt="Assistant Robot" className="size-10 sm:size-12 object-contain" />
            </div>
            <div className="mt-2 text-center">
              <div className="text-[11px] sm:text-xs font-bold text-slate-900">AI Assistant</div>
              <div className="text-[9px] sm:text-[10px] text-pink-600 font-semibold">Always Online</div>
            </div>
          </div>
        </div>

        {/* Floating Recommendation Card - Right */}
        <div className="absolute -right-2 sm:-right-6 top-0 z-40 w-56 sm:w-68 animate-float">
          <div className="rounded-2xl border border-pink-300 bg-white/95 p-3.5 sm:p-4 shadow-xl backdrop-blur-2xl relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500" />
            
            <div className="flex items-center justify-between">
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-pink-700 bg-pink-50 border border-pink-200 px-1.5 py-0.5 rounded">
                AI Match
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                <Sparkles className="size-3" /> 96% Match
              </span>
            </div>

            <div className="mt-2.5">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">Frontend Developer</h3>
              <div className="mt-1 flex items-center gap-2 text-[10px] sm:text-xs text-slate-500">
                <span className="flex items-center gap-0.5"><Building2 className="size-3 text-slate-400" /> TechCorp</span>
                <span className="flex items-center gap-0.5"><MapPin className="size-3 text-slate-400" /> Remote</span>
              </div>
            </div>

            <button
              type="button"
              className="mt-2.5 w-full rounded-lg bg-pink-600 py-1.5 text-center text-[11px] font-bold text-white shadow-xs hover:bg-pink-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1"
            >
              <span>Apply Now</span>
              <ArrowRight className="size-3" />
            </button>
          </div>
        </div>

        {/* Floating Live HR Schedule Card - Bottom */}
        <div className="absolute right-2 sm:right-4 bottom-[-24px] sm:bottom-[-36px] z-35 w-52 sm:w-60 animate-float-slow" style={{ animationDelay: "1s" }}>
          <div className="rounded-xl border border-indigo-100 bg-white/95 p-2.5 sm:p-3 shadow-lg backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
            <div className="flex items-center justify-between pl-1.5">
              <div className="flex items-center gap-2">
                <span className="grid size-6 sm:size-7 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Video className="size-3 sm:size-3.5" />
                </span>
                <div>
                  <div className="text-[11px] font-bold text-slate-900">HR Interview</div>
                  <div className="text-[9px] text-slate-500">Today at 2:30 PM</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureSection() {
  return (
    <section id="features" className="relative py-16 sm:py-24 lg:py-28 overflow-hidden bg-white">
      <div className="relative z-10">
        <FadeIn>
          <SectionHeading
            eyebrow="Built for focused job search"
            title="From profile to job review in one workspace"
            description="Every tool call is visible, deterministic matching is explainable, and your progress is saved to your account."
          />
        </FadeIn>

        <div className="mx-auto mt-10 sm:mt-14 grid max-w-7xl gap-5 px-4 sm:px-6 lg:px-8 sm:grid-cols-2 md:grid-cols-3">
          {features.map((feature, index) => (
            <FadeIn key={feature.title} delay={index * 120}>
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
      className="border-y border-slate-100 bg-slate-50/70 py-16 sm:py-24 lg:py-28 overflow-hidden relative"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionHeading
            eyebrow="How it works"
            title="Four steps to your next opportunity"
          />
        </FadeIn>

        <div className="mt-12 sm:mt-16 grid gap-8 lg:grid-cols-[1fr_auto] items-center">
          {/* Steps Column */}
          <ol className="grid gap-4 sm:gap-6 sm:grid-cols-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.title}
                  className="bg-white p-5 sm:p-6 rounded-2xl shadow-2xs border border-slate-100 transition-all active:scale-[0.99] sm:hover:-translate-y-1 sm:hover:shadow-md"
                >
                  <FadeIn delay={index * 100} direction="up">
                    <div className="flex items-center justify-between">
                      <span className="grid size-10 sm:size-12 place-items-center rounded-xl bg-pink-100 text-pink-600">
                        <Icon className="size-5 sm:size-6" />
                      </span>
                      <span className="text-[11px] font-black text-pink-600 tracking-wider bg-pink-50 px-2.5 py-1 rounded-full border border-pink-100">
                        STEP 0{index + 1}
                      </span>
                    </div>
                    <h3 className="mt-4 text-base sm:text-lg font-bold text-slate-900">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-slate-600">
                      {step.description}
                    </p>
                  </FadeIn>
                </li>
              );
            })}
          </ol>

          {/* Guiding Visual Side Display */}
          <FadeIn
            direction="right"
            delay={200}
            className="hidden lg:flex flex-col items-center justify-center relative pl-6"
          >
            <div className="relative z-10 animate-float">
              <img
                src={heroImage}
                alt="Assistant Robot Guide"
                className="h-[320px] w-auto object-contain drop-shadow-lg"
              />
              <div className="mt-4 text-center rounded-full bg-white/90 backdrop-blur px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs border border-slate-200">
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
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="companies" className="px-4 py-16 sm:px-6 lg:px-8 lg:py-28 relative overflow-hidden bg-white">
      <FadeIn>
        <div ref={ref} className="mx-auto max-w-6xl relative">
          <div className="relative z-10 overflow-hidden rounded-3xl bg-pink-100/90 p-6 sm:p-10 lg:p-14 text-slate-950 shadow-xl border border-pink-200">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-pink-300/60 via-pink-100 to-pink-50 -z-10" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Logo/Illustration Card */}
              <div className="lg:col-span-5 relative flex items-center justify-center min-h-[160px] sm:min-h-[200px] rounded-2xl bg-white/80 backdrop-blur-md border border-white overflow-hidden p-4 shadow-2xs">
                <div className="relative z-10 flex flex-col items-center text-center">
                  {isVisible && (
                    <img
                      src={Logo}
                      alt="PhayShin Logo"
                      className="h-20 sm:h-24 w-auto object-contain animate-peek drop-shadow-md mb-2"
                      style={{ transformOrigin: "bottom center" }}
                    />
                  )}
                </div>
              </div>

              {/* Text & Actions */}
              <div className="lg:col-span-7 text-center lg:text-left">
                <div className="inline-flex items-center gap-1.5 mb-2">
                  <BriefcaseBusiness className="size-4 text-pink-600" />
                  <span className="font-bold text-xs tracking-wide text-pink-700 uppercase">
                    Get Started Today
                  </span>
                </div>

                <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                  Start building your job shortlist.
                </h2>

                <p className="mt-3 max-w-xl text-sm sm:text-base text-slate-600">
                  Create an account and let the assistant collect the details needed to search structured roles tailored to you.
                </p>

                <div className="mt-6 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                  <a
                    className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-pink-600 px-6 py-3.5 text-sm sm:text-base font-bold text-white shadow-md shadow-pink-200 hover:bg-pink-500 active:scale-[0.98] transition-all"
                    href="/register"
                    onClick={handleInternalLink}
                  >
                    <span>Create free account</span>
                    <ArrowRight className="size-4" />
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
    <div className="mx-auto max-w-2xl text-center px-2">
      <p className="text-xs font-black uppercase tracking-widest text-pink-600">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-extrabold text-slate-950 sm:text-4xl tracking-tight">
        {title}
      </h2>
      {description && (
        <p className="mt-3 text-sm sm:text-lg leading-relaxed text-slate-600">{description}</p>
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
    <article className="h-full rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-xs p-6 shadow-2xs transition-all duration-300 active:scale-[0.99] sm:hover:-translate-y-1.5 sm:hover:shadow-lg sm:hover:border-pink-200 relative overflow-hidden group">
      <span className="relative z-10 grid size-11 place-items-center rounded-xl bg-pink-50 text-pink-600 ring-1 ring-pink-100">
        <Icon className="size-5" />
      </span>
      <h3 className="relative z-10 mt-4 text-base sm:text-lg font-bold text-slate-900">{title}</h3>
      <p className="relative z-10 mt-2 text-xs sm:text-sm leading-relaxed text-slate-600">{description}</p>
    </article>
  );
}

function Brand() {
  return (
    <a
      href="#top"
      className="inline-flex items-center group transition-transform active:scale-95 hover:scale-105"
      aria-label="PhayShin home"
    >
      <img
        className="h-10 sm:h-12 w-auto object-contain rounded-md"
        src={Logo}
        alt="PhayShin Logo"
      />
    </a>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50/80">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:px-6 lg:px-8 sm:flex-row text-center sm:text-left">
        <Brand />
        <p className="text-xs font-medium text-slate-500">
          &copy; {new Date().getFullYear()} PhayShin. Fictional job matching platform.
        </p>
      </div>
    </footer>
  );
}