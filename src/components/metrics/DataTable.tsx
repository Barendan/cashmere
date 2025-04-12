
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';

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
  maxHeight = "30vh",
  emptyMessage = "No data available."
}: DataTableProps) => {
  return (
    <div className="rounded-md border border-spa-sand">
      <Table>
        <TableHeader className="sticky top-0 bg-white z-10">
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
      </Table>
      <ScrollArea style={{ maxHeight }}>
        <Table>
          <TableBody>
            {data.length > 0 ? (
              data.map((item, index) => (
                <TableRow key={index}>
                  {columns.map((column) => (
                    <TableCell key={`${index}-${column.key}`} className={column.className}>
                      {column.formatter 
                        ? column.formatter(item[column.key], item) 
                        : item[column.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-6 text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
};

export default DataTable;
