
import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, TooltipProps } from "recharts";
import { formatTooltipValue } from "@/lib/format";

type DataItem = {
  name: string;
  value: number;
};

type MetricsPieChartProps = {
  data: DataItem[];
  tooltipType?: "currency" | "percent" | "number";
  tooltipLabel?: string;
  colors?: string[];
  height?: number | string;
  outerRadius?: number;
};

const COLORS = ['#AECCC6', '#9CB380', '#A6C0D0', '#D1C6B8', '#E6DFD9', '#7E9A9A'];

const MetricsPieChart = ({
  data,
  tooltipType = "currency",
  tooltipLabel = "Value",
  colors = COLORS,
  height = "100%",
  outerRadius = 100
}: MetricsPieChartProps) => {
  
  const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (!active || !payload || !payload.length) return null;

    const item = payload[0];
    const percentage = item.payload && item.payload.percent ? 
      `(${(item.payload.percent * 100).toFixed(0)}%)` : '';
    
    return (
      <div className="bg-white p-2 border border-spa-sand rounded-md shadow-md">
        <p className="font-medium">{item.name}</p>
        <p className="text-sm">
          {tooltipLabel}: {formatTooltipValue(item.value || 0, tooltipType)} {percentage}
        </p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={outerRadius}
          fill="#8884d8"
          label={({ name, percent }) => 
            `${name}: ${(percent * 100).toFixed(0)}%`
          }
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default MetricsPieChart;
