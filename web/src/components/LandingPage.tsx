import { useEffect, useState, type ComponentType } from "react";
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
} from "lucide-react";
import heroImage from "@/assets/hero.png";
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

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased selection:bg-pink-200">
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
      className={`sticky top-0 z-50 bg-white/90 backdrop-blur-xl transition-shadow ${scrolled ? "border-b border-slate-200 shadow-sm" : ""}`}
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

function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden border-b border-slate-100"
    >
      <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-7xl items-center gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-pink-50 px-3 py-1.5 text-xs font-bold uppercase text-pink-700">
            <Sparkles className="size-3.5" />
            AI job-matching harness
          </div>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Find roles that fit your{" "}
            <span className="text-pink-600">real experience.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            Build your candidate profile through chat, search a structured job
            catalog, and understand exactly why each role matches.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              className="inline-flex items-center justify-center gap-2 rounded-md bg-pink-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-pink-200 hover:bg-pink-700"
              href="/register"
              onClick={handleInternalLink}
            >
              Start matching <ArrowRight className="size-5" />
            </a>
            <a
              className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-6 py-3.5 font-semibold text-slate-700 hover:bg-slate-50"
              href="/login"
              onClick={handleInternalLink}
            >
              Sign in
            </a>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-500">
            {["Structured profile", "Ranked matches", "Durable review"].map(
              (item) => (
                <span key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-pink-600" />
                  {item}
                </span>
              ),
            )}
          </div>
        </div>
        <div className="relative flex min-h-[340px] items-end justify-center lg:min-h-[620px]">
          <div
            className="absolute bottom-10 size-[70%] rounded-full bg-pink-100"
            aria-hidden="true"
          />
          <img
            className="relative z-10 max-h-[570px] w-auto max-w-full object-contain drop-shadow-2xl"
            src={heroImage}
            alt="TalentAI assistant ready to help with a job search"
          />
        </div>
      </div>
    </section>
  );
}

function FeatureSection() {
  return (
    <section id="features" className="py-20 lg:py-28">
      <SectionHeading
        eyebrow="Built for focused job search"
        title="From profile to job review in one workspace"
        description="Every tool call is visible, deterministic matching is explainable, and your progress is saved to your account."
      />
      <div className="mx-auto mt-12 grid max-w-7xl gap-5 px-5 sm:px-8 md:grid-cols-3">
        {features.map((feature) => (
          <InfoCard key={feature.title} {...feature} />
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="border-y border-slate-100 bg-slate-50 py-20 lg:py-28"
    >
      <SectionHeading
        eyebrow="How it works"
        title="Three steps to a relevant shortlist"
      />
      <ol className="mx-auto mt-12 grid max-w-7xl gap-8 px-5 sm:px-8 md:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.title} className="relative">
              <div className="flex items-center gap-4">
                <span className="grid size-12 place-items-center rounded-md bg-pink-600 text-white">
                  <Icon className="size-6" />
                </span>
                <span className="text-sm font-bold text-pink-600">
                  STEP {index + 1}
                </span>
              </div>
              <h3 className="mt-5 text-xl font-bold">{step.title}</h3>
              <p className="mt-2 leading-7 text-slate-600">
                {step.description}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function CallToAction() {
  return (
    <section id="companies" className="px-5 py-20 sm:px-8 lg:py-28">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-lg bg-slate-950 px-6 py-14 text-center text-white sm:px-12">
        <BriefcaseBusiness className="mx-auto size-8 text-pink-400" />
        <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-bold sm:text-4xl">
          Start building your job shortlist.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-slate-300">
          Create an account and let the assistant collect the details needed to
          search 20 structured fictional roles.
        </p>
        <a
          className="mt-8 inline-flex items-center gap-2 rounded-md bg-pink-600 px-6 py-3.5 font-semibold hover:bg-pink-500"
          href="/register"
          onClick={handleInternalLink}
        >
          Create free account <ArrowRight className="size-5" />
        </a>
      </div>
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
      <p className="text-sm font-bold uppercase text-pink-600">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-lg leading-7 text-slate-600">{description}</p>
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
    <article className="rounded-lg border border-slate-200 bg-white p-7 shadow-sm transition-transform hover:-translate-y-1">
      <span className="grid size-11 place-items-center rounded-md bg-pink-50 text-pink-600">
        <Icon className="size-5" />
      </span>
      <h3 className="mt-5 text-xl font-bold">{title}</h3>
      <p className="mt-3 leading-7 text-slate-600">{description}</p>
    </article>
  );
}

function Brand() {
  return (
    <a
      href="#top"
      className="flex items-center gap-2.5"
      aria-label="TalentAI home"
    >
      <span className="grid size-9 place-items-center overflow-hidden rounded-md bg-pink-50">
        <img
          className="h-10 w-10 object-contain object-top"
          src={heroImage}
          alt=""
        />
      </span>
      <span className="text-lg font-extrabold">
        Talent<span className="text-pink-600">AI</span>
      </span>
    </a>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-5 py-8 sm:px-8 md:flex-row">
        <Brand />
        <p className="text-sm text-slate-500">
          &copy; {new Date().getFullYear()} TalentAI. Fictional job matching for
          this workshop.
        </p>
      </div>
    </footer>
  );
}
