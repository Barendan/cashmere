
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
  outerRadius = 70  // Reduced further to make room for labels with lines
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

  // Render custom label with smaller font and truncation
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 30; // Position labels further out
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    // Truncate long names
    const maxLength = 10;
    const truncatedName = name.length > maxLength ? `${name.substring(0, maxLength)}...` : name;
    const labelText = `${truncatedName}: ${(percent * 100).toFixed(0)}%`;

    return (
      <text 
        x={x} 
        y={y} 
        fill="#374151"
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="11"
        fontWeight="500"
      >
        {labelText}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={outerRadius}
          fill="#8884d8"
          label={renderCustomLabel}
          labelLine={true}
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
