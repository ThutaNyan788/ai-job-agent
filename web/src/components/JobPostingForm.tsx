import { useState, type FormEvent } from "react";
import {
  Award,
  Briefcase,
  Building2,
  CheckCircle2,
  Code2,
  DollarSign,
  FileText,
  Globe,
  Heart,
  Layers,
  Loader2,
  MapPin,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { JobPost, JobPostInput, JobSkill } from "@shared/events";
import { apiFetch } from "@/api";
import { navigate } from "@/navigation";
import { MarketplaceHeader } from "./MarketplaceHeader";

type ListField = "responsibilities" | "requirements" | "benefits" | "niceToHave";

const initialForm: JobPostInput = {
  title: "",
  description: "",
  status: "active",
  company: { name: "", website: "" },
  location: { city: "", country: "", workType: "hybrid" },
  salary: { currency: "USD", min: 0, max: 0 },
  employmentType: "full_time",
  experienceLevel: "junior",
  yearsOfExperience: { min: 0, max: 2 },
  requiredSkills: [{ name: "", level: "beginner" }],
  responsibilities: [""],
  requirements: [""],
  benefits: [],
  niceToHave: [],
};

export function JobPostingForm({ email }: { email: string }) {
  const [form, setForm] = useState<JobPostInput>(initialForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiFetch<{ job: JobPost }>("/api/company/jobs", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          requiredSkills: form.requiredSkills.filter((skill) => skill.name.trim()),
          responsibilities: cleanList(form.responsibilities),
          requirements: cleanList(form.requirements),
          benefits: cleanList(form.benefits),
          niceToHave: cleanList(form.niceToHave),
        }),
      });
      navigate("/company/jobs");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create the job post.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBusy(false);
    }
  }

  function updateList(field: ListField, index: number, value: string) {
    setForm((current) => ({ ...current, [field]: current[field].map((item, itemIndex) => itemIndex === index ? value : item) }));
  }

  function addListItem(field: ListField) {
    setForm((current) => ({ ...current, [field]: [...current[field], ""] }));
  }

  function removeListItem(field: ListField, index: number) {
    setForm((current) => ({ ...current, [field]: current[field].filter((_, itemIndex) => itemIndex !== index) }));
  }

  function updateSkill(index: number, update: Partial<JobSkill>) {
    setForm((current) => ({ ...current, requiredSkills: current.requiredSkills.map((skill, skillIndex) => skillIndex === index ? { ...skill, ...update } : skill) }));
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <MarketplaceHeader email={email} role="company" />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-pink-600">Company workspace</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">Create a job post</h1>
          <p className="mt-2 text-slate-500">Add the details candidates need to understand the role and decide whether to apply.</p>
        </div>

        {error && <div role="alert" className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
        <form onSubmit={submit} className="space-y-6">
          <FormSection icon={FileText} title="Basic information">
            <div className="grid gap-5 md:grid-cols-3">
              <Field label="Job title" className="md:col-span-2"><input className={inputClass} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Frontend Developer" required /></Field>
              <Field label="Status"><select className={inputClass} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as JobPost["status"] })}><option value="active">Active</option><option value="draft">Draft</option><option value="closed">Closed</option></select></Field>
            </div>
            <Field label="Job description"><textarea className={`${inputClass} min-h-32 resize-y py-3`} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Describe the role, its impact, and the team..." minLength={20} required /></Field>
          </FormSection>

          <FormSection icon={Building2} title="Company & location">
            <div className="grid gap-5 md:grid-cols-2">
              <IconField icon={Building2} label="Company name"><input className={iconInputClass} value={form.company.name} onChange={(event) => setForm({ ...form, company: { ...form.company, name: event.target.value } })} placeholder="TechNova Solutions" required /></IconField>
              <IconField icon={Globe} label="Company website"><input className={iconInputClass} type="url" value={form.company.website} onChange={(event) => setForm({ ...form, company: { ...form.company, website: event.target.value } })} placeholder="https://example.com" required /></IconField>
              <IconField icon={MapPin} label="City"><input className={iconInputClass} value={form.location.city} onChange={(event) => setForm({ ...form, location: { ...form.location, city: event.target.value } })} placeholder="Singapore" required /></IconField>
              <IconField icon={MapPin} label="Country"><input className={iconInputClass} value={form.location.country} onChange={(event) => setForm({ ...form, location: { ...form.location, country: event.target.value } })} placeholder="Singapore" required /></IconField>
              <IconField icon={Layers} label="Work type" className="md:col-span-2"><select className={iconInputClass} value={form.location.workType} onChange={(event) => setForm({ ...form, location: { ...form.location, workType: event.target.value as JobPost["location"]["workType"] } })}><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="onsite">On-site</option></select></IconField>
            </div>
          </FormSection>

          <FormSection icon={DollarSign} title="Salary & employment">
            <div className="grid gap-5 md:grid-cols-3">
              <Field label="Currency"><input className={inputClass} value={form.salary.currency} maxLength={3} onChange={(event) => setForm({ ...form, salary: { ...form.salary, currency: event.target.value.toUpperCase() } })} placeholder="USD" required /></Field>
              <Field label="Minimum salary"><input className={inputClass} type="number" min="0" value={form.salary.min} onChange={(event) => setForm({ ...form, salary: { ...form.salary, min: event.target.valueAsNumber || 0 } })} required /></Field>
              <Field label="Maximum salary"><input className={inputClass} type="number" min="0" value={form.salary.max} onChange={(event) => setForm({ ...form, salary: { ...form.salary, max: event.target.valueAsNumber || 0 } })} required /></Field>
              <IconField icon={Briefcase} label="Employment type"><select className={iconInputClass} value={form.employmentType} onChange={(event) => setForm({ ...form, employmentType: event.target.value as JobPost["employmentType"] })}><option value="full_time">Full time</option><option value="part_time">Part time</option><option value="contract">Contract</option><option value="internship">Internship</option></select></IconField>
              <IconField icon={Award} label="Experience level"><select className={iconInputClass} value={form.experienceLevel} onChange={(event) => setForm({ ...form, experienceLevel: event.target.value as JobPost["experienceLevel"] })}><option value="junior">Junior</option><option value="mid">Mid</option><option value="senior">Senior</option><option value="lead">Lead</option></select></IconField>
              <Field label="Years of experience">
                <div className="flex items-center gap-2"><input aria-label="Minimum years" className={inputClass} type="number" min="0" value={form.yearsOfExperience.min} onChange={(event) => setForm({ ...form, yearsOfExperience: { ...form.yearsOfExperience, min: event.target.valueAsNumber || 0 } })} /><span className="text-slate-400">—</span><input aria-label="Maximum years" className={inputClass} type="number" min="0" value={form.yearsOfExperience.max} onChange={(event) => setForm({ ...form, yearsOfExperience: { ...form.yearsOfExperience, max: event.target.valueAsNumber || 0 } })} /></div>
              </Field>
            </div>
          </FormSection>

          <FormSection icon={Code2} title="Required skills" action={<AddButton label="Add skill" onClick={() => setForm({ ...form, requiredSkills: [...form.requiredSkills, { name: "", level: "beginner" }] })} />}>
            <div className="space-y-3">
              {form.requiredSkills.map((skill, index) => (
                <div key={index} className="flex gap-2">
                  <input aria-label={`Skill ${index + 1}`} className={inputClass} value={skill.name} onChange={(event) => updateSkill(index, { name: event.target.value })} placeholder="React" required />
                  <select aria-label={`Skill ${index + 1} level`} className={`${inputClass} max-w-40`} value={skill.level} onChange={(event) => updateSkill(index, { level: event.target.value as JobSkill["level"] })}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select>
                  <RemoveButton label={`Remove skill ${index + 1}`} onClick={() => setForm({ ...form, requiredSkills: form.requiredSkills.filter((_, skillIndex) => skillIndex !== index) })} />
                </div>
              ))}
            </div>
          </FormSection>

          <DynamicSection icon={CheckCircle2} title="Responsibilities" field="responsibilities" values={form.responsibilities} required onAdd={addListItem} onUpdate={updateList} onRemove={removeListItem} />
          <DynamicSection icon={Award} title="Requirements" field="requirements" values={form.requirements} required onAdd={addListItem} onUpdate={updateList} onRemove={removeListItem} />
          <DynamicSection icon={Heart} title="Benefits" field="benefits" values={form.benefits} onAdd={addListItem} onUpdate={updateList} onRemove={removeListItem} />
          <DynamicSection icon={Sparkles} title="Nice to have" field="niceToHave" values={form.niceToHave} onAdd={addListItem} onUpdate={updateList} onRemove={removeListItem} />

          <div className="flex flex-col-reverse justify-end gap-3 border-t border-slate-200 pt-6 sm:flex-row">
            <button type="button" onClick={() => navigate("/company/jobs")} className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={busy} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-6 text-sm font-bold text-white shadow-lg shadow-pink-100 disabled:opacity-60">
              {busy && <Loader2 className="size-4 animate-spin" />} {form.status === "draft" ? "Save draft" : "Create job"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

function cleanList(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}

function FormSection({ icon: Icon, title, action, children }: { icon: typeof FileText; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <section className="space-y-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7"><div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4"><h2 className="flex items-center gap-2.5 text-lg font-bold text-slate-950"><Icon className="size-5 text-pink-500" />{title}</h2>{action}</div>{children}</section>;
}

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return <label className={`block space-y-2 ${className}`}><span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>{children}</label>;
}

function IconField({ icon: Icon, label, className, children }: { icon: typeof Building2; label: string; className?: string; children: React.ReactNode }) {
  return <Field label={label} className={className}><div className="relative"><Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />{children}</div></Field>;
}

function DynamicSection({ icon, title, field, values, required, onAdd, onUpdate, onRemove }: { icon: typeof FileText; title: string; field: ListField; values: string[]; required?: boolean; onAdd: (field: ListField) => void; onUpdate: (field: ListField, index: number, value: string) => void; onRemove: (field: ListField, index: number) => void }) {
  return <FormSection icon={icon} title={title} action={<AddButton label={`Add ${title.toLowerCase()}`} onClick={() => onAdd(field)} />}><div className="space-y-3">{values.map((value, index) => <div className="flex gap-2" key={index}><input aria-label={`${title} ${index + 1}`} className={inputClass} value={value} onChange={(event) => onUpdate(field, index, event.target.value)} placeholder={`Add ${title.toLowerCase()}`} required={required} /><RemoveButton label={`Remove ${title.toLowerCase()} ${index + 1}`} onClick={() => onRemove(field, index)} /></div>)}{values.length === 0 && <p className="py-3 text-center text-sm text-slate-400">No {title.toLowerCase()} added yet.</p>}</div></FormSection>;
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 rounded-xl bg-pink-50 px-3 py-2 text-xs font-bold text-pink-600 hover:bg-pink-100"><Plus className="size-3.5" />{label}</button>;
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className="grid size-11 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="size-4" /></button>;
}

const inputClass = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-pink-400 focus:ring-4 focus:ring-pink-100";
const iconInputClass = `${inputClass} pl-10`;
