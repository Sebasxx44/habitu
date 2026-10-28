import { Tooltip } from "@base-ui/react/tooltip";
import type { ReactNode } from "react";

// COMPONENT
export const TooltipTA = ({
  content,
  children,
}: {
  content: string;
  children: ReactNode;
}) => (
  <Tooltip.Provider>
    <Tooltip.Root>
      <Tooltip.Trigger
        aria-label={content}
        className="grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary focus-visible:outline focus-visible:outline-primary"
      >
        {children}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={8} className="z-[100]">
          <Tooltip.Popup className="max-w-[min(280px,90vw)] rounded-xl border border-border bg-popover px-3 py-2 text-xs leading-relaxed text-popover-foreground shadow-lg">
            {content}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  </Tooltip.Provider>
);
