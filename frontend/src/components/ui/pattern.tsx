export default function Pattern({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full">
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundColor: "var(--background)",
          backgroundImage: `
            repeating-linear-gradient(22.5deg, transparent, transparent 2px, rgba(75, 85, 99, 0.06) 2px, rgba(75, 85, 99, 0.06) 3px, transparent 3px, transparent 8px),
            repeating-linear-gradient(67.5deg, transparent, transparent 2px, rgba(107, 114, 128, 0.05) 2px, rgba(107, 114, 128, 0.05) 3px, transparent 3px, transparent 8px)
          `,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
