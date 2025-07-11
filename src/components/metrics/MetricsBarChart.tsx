
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
  // Improved margin calculation based on layout and data
  const getDefaultMargin = () => {
    if (layout === "vertical") {
      return { left: 120, right: 20, top: 20, bottom: 20, ...margin };
    } else {
      // For horizontal layout, increase bottom margin to accommodate rotated labels
      const hasLongLabels = data.some(item => 
        item[nameKey] && item[nameKey].length > 8
      );
      return { 
        left: 20, 
        right: 20, 
        top: 20, 
        bottom: hasLongLabels ? 80 : 50, // More space for long labels
        ...margin 
      };
    }
  };

  const defaultMargin = getDefaultMargin();
  
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

  // Custom label formatter to truncate long names
  const formatLabel = (value: string) => {
    if (!value) return value;
    return value.length > 15 ? `${value.substring(0, 15)}...` : value;
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
            tick={{ fontSize: 11 }} 
            width={110}
            tickFormatter={formatLabel}
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
          <XAxis 
            dataKey={nameKey} 
            tick={{ fontSize: 11 }} 
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
            tickFormatter={formatLabel}
          />
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
