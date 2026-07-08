import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { LifeBuoy, Mail, MessageCircle, Clock, ShieldCheck, HelpCircle } from "lucide-react";

const FAQS = [
  {
    q: "How do I get access after purchase?",
    a: "Once your order is approved, our team adds your TradingView username to the indicator's invite list. You'll get an email confirmation and the indicator will appear under your TradingView Invite-only Scripts within a few hours.",
  },
  {
    q: "How does the trial work?",
    a: "Premium indicators come with a free trial (typically 7–15 days). The trial gives you full access so you can validate the signals on your own setup before subscribing.",
  },
  {
    q: "Can I switch between Indicator, Strategy or Both versions?",
    a: "Yes. Open the indicator detail page and pick the version that fits your workflow. The price updates live based on your selection and duration.",
  },
  {
    q: "Do you offer refunds?",
    a: "We offer a 7-day refund window if the indicator does not work on your TradingView account due to a technical issue from our side. Performance-based refunds are not supported.",
  },
  {
    q: "Which markets and timeframes are supported?",
    a: "Most of our indicators work across NIFTY, BankNifty, Forex, Crypto, Stocks and Commodities on any timeframe from 1 minute to Weekly. Each indicator's detail page lists the recommended setup.",
  },
];

export default function SupportPage() {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast({ variant: "destructive", title: "Missing details", description: "Please fill name, email and message." });
      return;
    }
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setForm({ name: "", email: "", subject: "", message: "" });
      toast({ title: "Message sent", description: "Our team will get back to you within 24 hours." });
    }, 600);
  };

  const channels = [
    { Icon: Mail, title: "Email Us", desc: "support@pinesignallab.in", note: "Replies within 24 hours" },
    { Icon: MessageCircle, title: "WhatsApp", desc: "+91 89201 67711", note: "Mon – Sat, 10 AM – 7 PM IST" },
    { Icon: Clock, title: "Onboarding", desc: "Instant access setup", note: "After order approval" },
  ];

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <LifeBuoy className="h-3.5 w-3.5" /> Help & Support
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl" data-testid="text-support-title">
            We're here to help
          </h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Questions about access, billing or how an indicator works? Reach out and our team will get you sorted.
          </p>
        </div>

        <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {channels.map(({ Icon, title, desc, note }) => (
            <Card key={title} className="flex items-start gap-4 border-card-border p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold">{title}</div>
                <div className="mt-0.5 text-sm text-foreground/90">{desc}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">{note}</div>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Quick answers</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Find answers to common questions about access, trials, billing, and setup.
              </p>
            </div>

            <Card className="border-card-border p-3 sm:p-4">
              <Accordion type="single" collapsible className="w-full space-y-2">
                {FAQS.map((f, idx) => (
                  <AccordionItem
                    key={idx}
                    value={`faq-${idx}`}
                    className="rounded-lg border border-card-border bg-background px-4 transition-colors hover:bg-muted/40 data-[state=open]:bg-muted/30"
                  >
                    <AccordionTrigger
                      className="gap-3 py-4 text-left text-sm font-semibold hover:no-underline"
                      data-testid={`faq-q-${idx}`}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <HelpCircle className="h-3.5 w-3.5" />
                      </span>
                      <span className="flex-1">{f.q}</span>
                    </AccordionTrigger>

                    <AccordionContent
                      className="pb-4 pl-10 text-sm leading-6 text-muted-foreground"
                      data-testid={`faq-a-${idx}`}
                    >
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Card>
          </div>

          <div>
            <h2 className="mb-4 text-xl font-semibold">Send us a message</h2>
            <Card className="border-card-border p-5">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Your full name"
                    data-testid="input-support-name"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@example.com"
                    data-testid="input-support-email"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Subject</label>
                  <Input
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="Short summary"
                    data-testid="input-support-subject"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Message</label>
                  <Textarea
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="How can we help?"
                    data-testid="input-support-message"
                  />
                </div>
                <Button type="submit" disabled={sending} className="w-full" data-testid="button-support-submit">
                  {sending ? "Sending..." : "Send Message"}
                </Button>
                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" /> Your details are kept private and used only to reply to your query.
                </p>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
