import { useRef, type ReactNode } from "react";
import { Dialog, DialogPortal, DialogOverlay, DialogTitle } from "@/components/ui/dialog";
import { Content } from "@radix-ui/react-dialog";

// The existing appearance is preserved; Radix supplies focus trapping and Escape.
export function ProjectDialog({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const previousFocus = useRef(document.activeElement);
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogPortal>
      <DialogOverlay className="bg-foreground/50" />
      <Content aria-describedby={undefined} aria-modal="true"
        onCloseAutoFocus={e => { e.preventDefault(); const target = previousFocus.current; if (target instanceof HTMLElement && target.isConnected) target.focus(); }}
        className={`fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg bg-card ${wide ? "max-w-4xl" : "max-w-3xl"}`}>
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {children}
      </Content>
    </DialogPortal>
  </Dialog>;
}