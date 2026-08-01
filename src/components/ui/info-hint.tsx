import React, { ReactNode } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Info } from "lucide-react";

type InfoHintProps = {
  /** Title shown at the top of the hover panel. */
  title: string;
  /** Plain-English explanation of what this shows / how it is calculated. */
  children: ReactNode;
  className?: string;
};

/**
 * Small info icon that reveals a concise explanation on hover or tap.
 * Used next to card titles across the metrics and inventory screens.
 */
const InfoHint = ({ title, children, className = "" }: InfoHintProps) => (
  <HoverCard openDelay={120} closeDelay={80}>
    <HoverCardTrigger asChild>
      <button
        type="button"
        aria-label={`About ${title}`}
        className={`inline-flex items-center text-muted-foreground hover:text-foreground transition-colors ${className}`}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
    </HoverCardTrigger>
    <HoverCardContent className="w-80 text-sm bg-white">
      <p className="font-medium mb-1">{title}</p>
      <div className="text-muted-foreground space-y-1 text-xs leading-relaxed">{children}</div>
    </HoverCardContent>
  </HoverCard>
);

export default InfoHint;
