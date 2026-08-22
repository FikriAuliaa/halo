import { ToastProvider } from "@/components/ui/toast-provider";

/**
 * Route-group layout for the student flow. The ambient gradient field
 * (DESIGN.md §2.3) is already applied at the document body level in
 * globals.css, so widening the viewport beyond 480px naturally reveals it
 * around the centered column that StudentShell establishes — no extra
 * wrapper is needed here (DESIGN.md §9, B044).
 */
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
