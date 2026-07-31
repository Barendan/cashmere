
import React, { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Info } from "lucide-react";

type MetricsCardProps = {
  title: string;
  value: string | number;
  icon: ReactNode;
  iconBgClass?: string;
  secondaryValue?: string | number;
  secondaryLabel?: string;
  dateRange?: string;
  className?: string;
  /** 1-6: applies a distinct fading gradient + icon tint from the accent tokens. */
  accent?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Small extra line under the value, e.g. "0.8 per visit". */
  subLine?: string;
  /** Plain-English explanation shown on hover/tap. */
  explanation?: ReactNode;
};

const MetricsCard = ({
  title,
  value,
  icon,
  iconBgClass = "bg-spa-sage/20",
  secondaryValue,
  secondaryLabel = "Yesterday",
  dateRange,
  className = "",
  accent,
  subLine,
  explanation,
}: MetricsCardProps) => {
  const accentCardClass = accent ? `accent-card-${accent}` : "bg-white";
  const accentIconClass = accent ? `accent-icon-${accent}` : iconBgClass;

  const card = (
    <Card
      className={`${accentCardClass} h-full transition-shadow hover:shadow-md ${
        explanation ? "cursor-help" : ""
      } ${className}`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <span className="truncate">{title}</span>
              {explanation && <Info className="h-3.5 w-3.5 shrink-0 opacity-60" />}
            </p>
            <h3 className="text-2xl font-semibold mt-1">{value}</h3>
            {subLine && <p className="text-xs text-muted-foreground mt-1">{subLine}</p>}
            {dateRange && <p className="text-xs text-muted-foreground mt-1">{dateRange}</p>}
            {secondaryValue !== undefined && (
              <p className="text-xs text-muted-foreground mt-1">
                {secondaryLabel}: {secondaryValue}
              </p>
            )}
          </div>
          <div
            className={`h-12 w-12 shrink-0 rounded-full ${accentIconClass} flex items-center justify-center`}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!explanation) return card;

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <button type="button" className="text-left w-full h-full">
          {card}
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 text-sm bg-white">
        <p className="font-medium mb-1">{title}</p>
        <div className="text-muted-foreground space-y-1 text-xs leading-relaxed">{explanation}</div>
      </HoverCardContent>
    </HoverCard>
  );
};

export default MetricsCard;
