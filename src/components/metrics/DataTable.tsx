
import React from "react";

type Column = {
  key: string;
  header: string;
  formatter?: (value: any, item?: Record<string, any>) => React.ReactNode;
  className?: string;
};

type DataTableProps = {
  data: Record<string, any>[];
  columns: Column[];
  maxHeight?: string;
  emptyMessage?: string;
};

const DataTable = ({ 
  data, 
  columns, 
  maxHeight = "320px",
  emptyMessage = "No data available."
}: DataTableProps) => {
  return (
    <div
      className="rounded-md border border-border overflow-x-auto overflow-y-auto"
      style={{ maxHeight }}
    >
      <table className="w-full caption-bottom text-sm">
        <thead className="sticky top-0 bg-background z-10 [&_tr]:border-b">
          <tr className="border-b">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`h-12 px-4 text-left align-middle font-medium text-muted-foreground ${column.className || ""}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {data.length > 0 ? (
            data.map((item, index) => (
              <tr key={index} className="border-b transition-colors hover:bg-muted/50">
                {columns.map((column) => (
                  <td
                    key={`${index}-${column.key}`}
                    className={`p-4 align-middle ${column.className || ""}`}
                  >
                    {column.formatter
                      ? column.formatter(item[column.key], item)
                      : item[column.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="text-center py-6 text-muted-foreground">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
