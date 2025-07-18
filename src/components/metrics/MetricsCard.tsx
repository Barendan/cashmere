
import React, { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

type MetricsCardProps = {
  title: string;
  value: string | number;
  icon: ReactNode;
  iconBgClass?: string;
  secondaryValue?: string | number;
  secondaryLabel?: string;
};

const MetricsCard = ({ 
  title, 
  value, 
  icon, 
  iconBgClass = "bg-spa-sage/20",
  secondaryValue,
  secondaryLabel = "Yesterday"
}: MetricsCardProps) => {
  return (
    <Card className="bg-white">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-semibold mt-1">{value}</h3>
            {secondaryValue !== undefined && (
              <p className="text-xs text-muted-foreground mt-1">
                {secondaryLabel}: {secondaryValue}
              </p>
            )}
          </div>
          <div className={`h-12 w-12 rounded-full ${iconBgClass} flex items-center justify-center`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricsCard;
