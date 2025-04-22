
import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimeRangeType } from "./types";
import { Calendar, Clock, CalendarDays } from "lucide-react";

interface TimeRangeSelectorProps {
  timeRange: TimeRangeType;
  setTimeRange: (range: TimeRangeType) => void;
  className?: string;
}

const TimeRangeSelector = ({ 
  timeRange, 
  setTimeRange, 
  className = "" 
}: TimeRangeSelectorProps) => {
  return (
    <Tabs 
      value={timeRange} 
      onValueChange={(value) => setTimeRange(value as TimeRangeType)}
      className={className}
    >
      <TabsList>
        <TabsTrigger value="7days" className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          Last 7 Days
        </TabsTrigger>
        <TabsTrigger value="30days" className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          Last 30 Days
        </TabsTrigger>
        <TabsTrigger value="monthly" className="flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5" />
          All Time
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

export default TimeRangeSelector;
