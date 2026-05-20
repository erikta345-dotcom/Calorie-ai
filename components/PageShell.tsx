import BottomNav from "@/components/BottomNav";

export default function PageShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-h-screen bg-white dark:bg-zinc-950 max-w-md mx-auto pb-32${className ? ` ${className}` : ""}`}>
      {children}
      <BottomNav />
    </div>
  );
}
