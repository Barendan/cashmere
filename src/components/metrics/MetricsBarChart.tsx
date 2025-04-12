
import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, TooltipProps } from "recharts";
import { formatTooltipValue } from "@/lib/format";

type DataType = Record<string, any>;

type MetricsBarChartProps = {
  data: DataType[];
  dataKey: string;
  nameKey?: string;
  layout?: "horizontal" | "vertical";
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  height?: number | string;
  barName?: string;
  barFill?: string;
  tooltipType?: "currency" | "percent" | "number";
  tooltipLabel?: string;
};

const MetricsBarChart = ({
  data,
  dataKey,
  nameKey = "name",
  layout = "horizontal",
  margin = {},
  height = "100%",
  barName = "Value",
  barFill = "#AECCC6",
  tooltipType = "currency",
  tooltipLabel = "Value"
}: MetricsBarChartProps) => {
  const defaultMargin = layout === "vertical" ? { left: 100, ...margin } : margin;
  
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active || !payload || !payload.length) return null;
    
    return (
      <div className="bg-white p-2 border border-spa-sand rounded-md shadow-md">
        <p className="font-medium">{payload[0].name || label}</p>
        <p className="text-sm">
          {tooltipLabel}: {formatTooltipValue(payload[0].value || 0, tooltipType)}
        </p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      {layout === "vertical" ? (
        <BarChart data={data} layout="vertical" margin={defaultMargin}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis 
            type="category" 
            dataKey={nameKey} 
            tick={{ fontSize: 12 }} 
            width={100} 
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar 
            dataKey={dataKey} 
            name={barName} 
            fill={barFill} 
          />
        </BarChart>
      ) : (
        <BarChart data={data} margin={defaultMargin}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey={nameKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar 
            dataKey={dataKey} 
            name={barName} 
            fill={barFill} 
          />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
};

export default MetricsBarChart;
