import { useState } from "react";
import { FileUp, Loader2, MessageCircleMore, X } from "lucide-react";
import { uploadCv } from "@/api";
import { navigate } from "@/navigation";

// Shown when the user clicks "Apply". They either attach a CV now (saved via
// the existing /api/cv/uploads endpoint, then the application proceeds) or
// go build one with the assistant first.
export function ApplyCvModal({
  jobTitle,
  onClose,
  onApply,
}: {
  jobTitle: string;
  onClose: () => void;
  onApply: (cvUploadId: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveAndApply() {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const upload = await uploadCv(file);
      onApply(upload.id);
      onClose();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to save the CV.");
    } finally {
      setUploading(false);
    }
  }

  function chatInstead() {
    onClose();
    navigate("/ai-assistant");
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Apply to ${jobTitle}`}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-950">Apply to {jobTitle}</h2>
            <p className="mt-1 text-sm text-slate-500">Attach a CV to submit your application.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <label
            className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${
              file ? "border-pink-300 bg-pink-50" : "border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-pink-100 text-pink-600">
              <FileUp className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-slate-900">Upload my CV (PDF)</span>
              <span className="block truncate text-xs font-medium text-slate-500">
                {file ? file.name : "Saved to your account, then this application is submitted."}
              </span>
            </span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>

          {file && (
            <button
              type="button"
              disabled={uploading}
              onClick={() => void saveAndApply()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-md disabled:opacity-60"
            >
              {uploading && <Loader2 className="size-4 animate-spin" />} Save CV &amp; continue applying
            </button>
          )}

          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

          <div className="relative py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <div className="absolute inset-x-0 top-1/2 -z-10 h-px bg-slate-200" />
            <span className="relative bg-white px-2">or</span>
          </div>

          <button
            type="button"
            onClick={chatInstead}
            className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 p-4 text-left transition hover:bg-slate-50"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
              <MessageCircleMore className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-slate-900">Chat with AI to build my CV</span>
              <span className="block text-xs font-medium text-slate-500">
                No CV yet? Talk to the assistant to create one first.
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
