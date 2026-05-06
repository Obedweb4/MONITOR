import { PublicLayout } from "@/layouts";
import { FileText, Shield, AlertTriangle, Clock, Ban, Gavel, RefreshCw, Mail } from "lucide-react";

const sections = [
  {
    icon: FileText,
    title: "1. Acceptance of Terms",
    content: "By accessing or using OBEDTECH MONITOR (the Service), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.",
    aos: "fade-right",
  },
  {
    icon: Shield,
    title: "2. Description of Service",
    content: "OBEDTECH MONITOR provides uptime monitoring for websites and APIs, including email notifications for downtime events. The Service is provided as-is and may change at any time.",
    aos: "fade-left",
  },
  {
    icon: AlertTriangle,
    title: "3. Account Responsibility",
    content: "You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use.",
    aos: "fade-right",
  },
  {
    icon: Ban,
    title: "4. Acceptable Use",
    content: "You agree not to use the Service to monitor services you do not own or have permission to monitor. Abusive use, including excessive pinging of third-party services, is prohibited.",
    aos: "fade-left",
  },
  {
    icon: Clock,
    title: "5. Service Availability",
    content: "We strive for high availability but do not guarantee 100% uptime. The Service may be interrupted for maintenance or due to circumstances beyond our control.",
    aos: "fade-right",
  },
  {
    icon: Gavel,
    title: "6. Limitation of Liability",
    content: "OBEDTECH MONITOR and OBED TECH shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, including missed downtime alerts.",
    aos: "fade-left",
  },
  {
    icon: Ban,
    title: "7. Termination",
    content: "We reserve the right to suspend or terminate accounts that violate these terms or engage in abusive behavior, without prior notice.",
    aos: "fade-right",
  },
  {
    icon: RefreshCw,
    title: "8. Changes to Terms",
    content: "We may update these terms from time to time. Continued use of the Service after changes are posted constitutes acceptance of the new terms.",
    aos: "fade-left",
  },
  {
    icon: Mail,
    title: "9. Contact",
    content: null,
    aos: "fade-up",
  },
];

export default function Terms() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="pt-12 pb-10 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <div data-aos="zoom-in" className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-full text-xs font-semibold mb-4">
            <FileText size={13} />
            Legal
          </div>
          <h1 data-aos="zoom-in" data-aos-delay="50" className="text-4xl md:text-5xl font-bold font-outfit mb-4">
            Terms of <span className="text-emerald-500">Service</span>
          </h1>
          <p data-aos="fade-up" data-aos-delay="150" className="text-muted text-base">
            Last updated: 13th March 2026
          </p>
        </div>
      </section>

      {/* Sections */}
      <section className="px-4 pb-16 overflow-hidden">
        <div className="max-w-3xl mx-auto space-y-4">
          {sections.map((s, i) => (
            <div
              key={s.title}
              data-aos={s.aos}
              data-aos-delay={String(i * 60)}
              data-aos-duration="500"
              className="bg-background border border-line rounded-2xl p-5 md:p-6 flex gap-4"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0 mt-0.5">
                <s.icon size={17} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-sm mb-1.5">{s.title}</h2>
                {s.content ? (
                  <p className="text-muted text-sm leading-relaxed">{s.content}</p>
                ) : (
                  <p className="text-muted text-sm leading-relaxed">
                    For questions about these terms, contact us at{" "}
                    <a href="/contact" className="text-emerald-500 hover:underline">our contact page</a>{" "}
                    or email{" "}
                    <a href="mailto:maurice@obedtech.top" className="text-emerald-500 hover:underline">
                      maurice@obedtech.top
                    </a>.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
