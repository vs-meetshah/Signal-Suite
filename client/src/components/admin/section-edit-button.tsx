import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Pencil, Save, X, AlertTriangle } from "lucide-react";
import type { Indicator, InsertIndicator } from "@shared/schema";

type Faq = { q: string; a: string };

type FieldType =
  | "text"
  | "number"
  | "textarea"
  | "textarea-array"
  | "select"
  | "checkbox"
  | "faqs";

type FieldDef = {
  key: keyof InsertIndicator;
  label: string;
  type: FieldType;
  required?: boolean;
  rows?: number;
  placeholder?: string;
  hint?: string;
  options?: { value: string; label: string }[];
  fullWidth?: boolean;
};

export type SectionKey =
  | "hero"
  | "meta"
  | "tags"
  | "rating"
  | "about"
  | "features"
  | "video"
  | "markets"
  | "stats"
  | "signalLogic"
  | "entryExit"
  | "riskMgmt"
  | "pricing"
  | "faqs";

type SectionDef = {
  title: string;
  description?: string;
  fields: FieldDef[];
};

const SECTIONS: Record<SectionKey, SectionDef> = {
  hero: {
    title: "Hero Section",
    description: "Title, badges, short tagline shown at the top of the page.",
    fields: [
      { key: "name", label: "Name *", type: "text", required: true, placeholder: "Smart Trend Pro" },
      { key: "shortDescription", label: "Short Description *", type: "textarea", rows: 2, required: true, placeholder: "One-sentence tagline", fullWidth: true },
      { key: "category", label: "Category *", type: "text", required: true, placeholder: "Trend Following" },
      {
        key: "tier", label: "Tier *", type: "select", required: true,
        options: [{ value: "free", label: "Free" }, { value: "premium", label: "Premium" }],
      },
      { key: "nonRepainting", label: "Non-Repainting (signals never recalculate)", type: "checkbox", fullWidth: true },
    ],
  },
  meta: {
    title: "Version / Published / Developer",
    description: "Small meta row shown below the hero.",
    fields: [
      { key: "versionLabel", label: "Version Label", type: "text", placeholder: "v1.1 Beta" },
      { key: "publishedDate", label: "Published Date", type: "text", placeholder: "Mar 2026" },
      { key: "developer", label: "Developer", type: "text", placeholder: "Candle Codex" },
    ],
  },
  tags: {
    title: "Tags",
    description: "Pills shown under the hero. One tag per line.",
    fields: [
      {
        key: "tags", label: "Tags (one per line)", type: "textarea-array", rows: 6, fullWidth: true,
        placeholder: "Multi-timeframe\nConfluence\nAlgorithmic"
      },
    ],
  },
  rating: {
    title: "Rating",
    fields: [
      { key: "rating", label: "Rating (0.0 – 5.0)", type: "text", placeholder: "4.9" },
      { key: "reviewCount", label: "Review Count", type: "number", placeholder: "251" },
    ],
  },
  about: {
    title: "About / Description",
    description: "Full marketing description in the Overview tab.",
    fields: [
      {
        key: "description", label: "Description *", type: "textarea", rows: 10, required: true, fullWidth: true,
        placeholder: "Detailed description shown on the indicator detail page"
      },
    ],
  },
  features: {
    title: "Key Features",
    description: "Bullet list of features shown next to the description.",
    fields: [
      {
        key: "features", label: "Features (one per line) *", type: "textarea-array", rows: 10, required: true, fullWidth: true,
        placeholder: "Real-time signals\nMulti-timeframe analysis\nNo repaint"
      },
    ],
  },
  video: {
    title: "Video Tutorial & Image",
    fields: [
      {
        key: "videoUrl", label: "Video URL", type: "text", placeholder: "https://youtube.com/...", fullWidth: true,
        hint: "YouTube / Vimeo / direct video file URL."
      },
      {
        key: "imageUrl", label: "Image URL", type: "text", placeholder: "https://…", fullWidth: true,
        hint: "Optional thumbnail / cover image."
      },
    ],
  },
  markets: {
    title: "Markets & Timeframes",
    description: "Used in the Compatibility table.",
    fields: [
      {
        key: "markets", label: "Markets (one per line)", type: "textarea-array", rows: 6, fullWidth: true,
        placeholder: "NIFTY 50\nBANKNIFTY\nBTCUSDT"
      },
      {
        key: "bestTimeframes", label: "Best Timeframes (one per line)", type: "textarea-array", rows: 6, fullWidth: true,
        placeholder: "15 min\n1 hour\n4 hour"
      },
    ],
  },
  stats: {
    title: "Live Signal / Performance Stats",
    description: "Numbers shown in the stats row and TradingView chart symbol.",
    fields: [
      { key: "tradingViewSymbol", label: "TradingView Symbol", type: "text", placeholder: "NSE:NIFTY", fullWidth: true },
      { key: "winRate", label: "Win Rate", type: "text", placeholder: "78%" },
      { key: "avgReturn", label: "Avg Return", type: "text", placeholder: "+24%" },
      { key: "totalTrades", label: "Total Signals", type: "text", placeholder: "1,200" },
      { key: "avgRR", label: "Avg R:R", type: "text", placeholder: "1:2.4" },
      { key: "profitFactor", label: "Profit Factor", type: "text", placeholder: "2.1" },
      { key: "bestMarket", label: "Best Market", type: "text", placeholder: "NIFTY 50" },
    ],
  },
  signalLogic: {
    title: "Signal Logic & Methodology",
    fields: [
      {
        key: "signalLogic", label: "Signal Logic", type: "textarea", rows: 10, fullWidth: true,
        placeholder: "How signals are generated…"
      },
    ],
  },
  entryExit: {
    title: "Entry & Exit Conditions",
    fields: [
      { key: "entryConditions", label: "Entry Conditions", type: "textarea", rows: 6, fullWidth: true },
      { key: "exitConditions", label: "Exit Conditions", type: "textarea", rows: 6, fullWidth: true },
    ],
  },
  riskMgmt: {
    title: "Risk Management",
    description: "Stop-loss and target strategies.",
    fields: [
      { key: "stopLossStrategy", label: "Stop-Loss Strategy", type: "textarea", rows: 6, fullWidth: true },
      { key: "targetStrategy", label: "Target Strategy", type: "textarea", rows: 6, fullWidth: true },
    ],
  },
  pricing: {
    title: "Pricing & Trial",
    fields: [
      {
        key: "price", label: "Price (₹) *", type: "number", required: true, placeholder: "9000",
        hint: "Set 0 for free indicators."
      },
      {
        key: "trialDays", label: "Trial Days", type: "number", placeholder: "15",
        hint: "Premium only — typically 15."
      },
    ],
  },
  faqs: {
    title: "FAQs",
    description: "Question on first line, answer on next line(s). Separate each FAQ with --- on its own line.",
    fields: [
      {
        key: "faqs", label: "FAQs", type: "faqs", rows: 14, fullWidth: true,
        placeholder: "Does this indicator repaint?\nNo, all signals are confirmed at bar close.\n---\nWhat timeframes are supported?\nAll timeframes from 1m to 1D are supported."
      },
    ],
  },
};

function arrToText(arr: string[] | null | undefined) {
  return (arr || []).join("\n");
}

function textToArr(t: string): string[] {
  return t.split("\n").map((x) => x.trim()).filter(Boolean);
}

function faqsToText(faqs: Faq[] | null | undefined) {
  return (faqs || []).map((f) => `${f.q}\n${f.a}`).join("\n---\n");
}

function textToFaqs(t: string): Faq[] {
  return t
    .split(/\n---\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => {
      const [q, ...rest] = b.split("\n");
      return { q: (q || "").trim(), a: rest.join("\n").trim() };
    })
    .filter((f) => f.q && f.a);
}

type RawValue = string | number | boolean | string[] | Faq[] | null | undefined;

function buildInitialValues(indicator: Indicator, fields: FieldDef[]): Record<string, RawValue> {
  const out: Record<string, RawValue> = {};
  for (const f of fields) {
    const v = (indicator as any)[f.key];
    switch (f.type) {
      case "textarea-array":
        out[f.key as string] = arrToText(v as string[] | null | undefined);
        break;
      case "faqs":
        out[f.key as string] = faqsToText(v as Faq[] | null | undefined);
        break;
      case "checkbox":
        out[f.key as string] = !!v;
        break;
      case "number":
        out[f.key as string] = v == null ? "" : String(v);
        break;
      default:
        out[f.key as string] = v == null ? "" : String(v);
    }
  }
  return out;
}

function SectionEditDialog({
  open, onOpenChange, indicator, sectionKey,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  indicator: Indicator;
  sectionKey: SectionKey;
}) {
  const { toast } = useToast();
  const section = SECTIONS[sectionKey];
  const [values, setValues] = useState<Record<string, RawValue>>(() =>
    buildInitialValues(indicator, section.fields)
  );

  useEffect(() => {
    if (open) setValues(buildInitialValues(indicator, section.fields));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, indicator.id, sectionKey]);

  const setVal = (key: string, value: RawValue) =>
    setValues((s) => ({ ...s, [key]: value }));

  const validationError = useMemo(() => {
    for (const f of section.fields) {
      if (!f.required) continue;
      const v = values[f.key as string];
      if (f.type === "textarea-array") {
        if (textToArr(String(v ?? "")).length === 0) return `${f.label} is required`;
      } else if (f.type === "checkbox") {
        // No required validation for checkbox.
      } else if (f.type === "number") {
        if (v == null || String(v).trim() === "") return `${f.label} is required`;
      } else {
        if (!v || String(v).trim() === "") return `${f.label} is required`;
      }
    }
    return null;
  }, [values, section.fields]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Partial<InsertIndicator> = {};
      for (const f of section.fields) {
        const raw = values[f.key as string];
        switch (f.type) {
          case "textarea-array":
            (payload as any)[f.key] = textToArr(String(raw ?? ""));
            break;
          case "faqs":
            (payload as any)[f.key] = textToFaqs(String(raw ?? ""));
            break;
          case "checkbox":
            (payload as any)[f.key] = !!raw;
            break;
          case "number": {
            const s = String(raw ?? "").trim();
            if (s === "") {
              (payload as any)[f.key] = f.required ? 0 : null;
            } else {
              const n = parseFloat(s);
              if (f.key === "price") {
                (payload as any)[f.key] = isNaN(n) ? "0" : String(Math.max(0, n));
              } else {
                (payload as any)[f.key] = isNaN(n) ? 0 : n;
              }
            }
            break;
          }
          case "select":
            (payload as any)[f.key] = String(raw ?? "");
            break;
          default: {
            const s = String(raw ?? "");
            if (s.trim() === "" && !f.required) {
              (payload as any)[f.key] = null;
            } else {
              (payload as any)[f.key] = s;
            }
          }
        }
      }
      const res = await apiRequest("PATCH", `/api/admin/indicators/${indicator.id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/indicators"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
      toast({ title: "Section updated", description: `${section.title} has been saved.` });
      onOpenChange(false);
    },
    onError: (e: Error) =>
      toast({ variant: "destructive", title: "Save failed", description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] w-[calc(100vw-1rem)] max-w-2xl flex-col overflow-hidden p-0 sm:w-full"
        data-testid={`dialog-section-${sectionKey}`}
      >
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" /> Edit {section.title}
          </DialogTitle>
          {section.description && (
            <DialogDescription>{section.description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 gap-4 pb-2 sm:grid-cols-2">    {section.fields.map((f) => {
            const cls = f.fullWidth ? "sm:col-span-2" : "";
            const id = `field-${sectionKey}-${String(f.key)}`;
            const val = values[f.key as string];
            return (
              <div key={String(f.key)} className={`space-y-1 ${cls}`}>
                {f.type !== "checkbox" && (
                  <Label htmlFor={id} className="text-xs font-medium">
                    {f.label}
                  </Label>
                )}
                {f.type === "text" && (
                  <Input
                    id={id}
                    value={String(val ?? "")}
                    onChange={(e) => setVal(String(f.key), e.target.value)}
                    placeholder={f.placeholder}
                    data-testid={`input-section-${sectionKey}-${String(f.key)}`}
                  />
                )}
                {f.type === "number" && (
                  <Input
                    id={id}
                    type="number"
                    min="0"
                    value={String(val ?? "")}
                    onChange={(e) => setVal(String(f.key), e.target.value)}
                    placeholder={f.placeholder}
                    data-testid={`input-section-${sectionKey}-${String(f.key)}`}
                  />
                )}
                {(f.type === "textarea" || f.type === "textarea-array" || f.type === "faqs") && (
                  <Textarea
                    id={id}
                    value={String(val ?? "")}
                    onChange={(e) => setVal(String(f.key), e.target.value)}
                    rows={sectionKey === "markets" ? 5 : f.rows ?? 4}
                    placeholder={f.placeholder}
                    className={f.type === "textarea" ? "" : "font-mono text-xs"}
                    data-testid={`input-section-${sectionKey}-${String(f.key)}`}
                  />
                )}
                {f.type === "select" && (
                  <Select
                    value={String(val ?? "")}
                    onValueChange={(v) => setVal(String(f.key), v)}
                  >
                    <SelectTrigger
                      id={id}
                      data-testid={`input-section-${sectionKey}-${String(f.key)}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(f.options || []).map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {f.type === "checkbox" && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      id={id}
                      type="checkbox"
                      checked={!!val}
                      onChange={(e) => setVal(String(f.key), e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                      data-testid={`input-section-${sectionKey}-${String(f.key)}`}
                    />
                    <Label htmlFor={id} className="cursor-pointer text-xs font-medium">
                      {f.label}
                    </Label>
                  </div>
                )}
                {f.hint && <p className="text-[10px] text-muted-foreground">{f.hint}</p>}

                {String(f.key) === "imageUrl" && String(val ?? "").trim() && (
                  <div className="mt-2 overflow-hidden rounded-md border border-card-border bg-muted">
                    <img
                      src={String(val)}
                      alt="Image preview"
                      className="aspect-video w-full object-cover"
                      loading="lazy"
                      data-testid={`preview-section-${sectionKey}-image`}
                    />
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>

        {validationError && (
          <div
            className="mx-6 mb-3 shrink-0 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400"
            data-testid={`validation-error-${sectionKey}`}
          >
            <AlertTriangle className="h-3.5 w-3.5" /> {validationError}
          </div>
        )}

        <DialogFooter className="shrink-0 border-t border-card-border px-6 py-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid={`button-cancel-section-${sectionKey}`}
          >
            <X className="mr-1.5 h-4 w-4" /> Cancel
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!!validationError || saveMutation.isPending}
            data-testid={`button-save-section-${sectionKey}`}
          >
            <Save className="mr-1.5 h-4 w-4" />
            {saveMutation.isPending ? "Saving…" : "Save Section"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SectionEditButton({
  indicator,
  section,
  label,
  className,
  size = "sm",
  variant = "outline",
}: {
  indicator: Indicator;
  section: SectionKey;
  label?: string;
  className?: string;
  size?: "default" | "sm" | "icon";
  variant?: "default" | "outline" | "ghost" | "secondary";
}) {
  const [open, setOpen] = useState(false);
  const sectionDef = SECTIONS[section];
  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  return (
    <>
      <Button
        size={size}
        variant={variant}
        className={`h-7 gap-1.5 border-amber-500/40 bg-amber-500/5 px-2 text-[11px] font-medium text-amber-700 hover:bg-amber-500/10 dark:text-amber-400 ${className || ""}`}
        onClick={(e) => { stop(e); setOpen(true); }}
        title={`Edit ${sectionDef.title}`}
        aria-label={`Edit ${sectionDef.title}`}
        data-testid={`button-edit-section-${section}`}
      >
        <Pencil className="h-3 w-3" />
        {label ?? "Edit"}
      </Button>
      <SectionEditDialog
        open={open}
        onOpenChange={setOpen}
        indicator={indicator}
        sectionKey={section}
      />
    </>
  );
}
