
import React, { useState, useEffect } from "react";

export type SortDirection = "asc" | "desc" | null;

export interface SortState {
  column: string | null;
  direction: SortDirection;
}

export function useSortableTable<T>(initialData: T[]) {
  const [sortState, setSortState] = useState<SortState>({ column: "name", direction: "asc" });
  const [sortedData, setSortedData] = useState<T[]>(initialData);

  const sortData = (column: string) => {
    let direction: SortDirection = "asc";
    if (sortState.column === column) {
      direction = sortState.direction === "asc" ? "desc" : "asc";
    }

    const sorted = [...initialData].sort((a, b) => {
      // Simple case: string or number fields
      const av = (a as any)[column];
      const bv = (b as any)[column];
      if (typeof av === "number" && typeof bv === "number") {
        return direction === "asc" ? av - bv : bv - av;
      }
      if (typeof av === "string" && typeof bv === "string") {
        return direction === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return 0;
    });

    setSortState({ column, direction });
    setSortedData(sorted);
  };

  useEffect(() => {
    if (sortState.column) {
      // sort by that column and direction
      const sorted = [...initialData].sort((a, b) => {
        const av = (a as any)[sortState.column!];
        const bv = (b as any)[sortState.column!];
        if (typeof av === "number" && typeof bv === "number") {
          return sortState.direction === "asc" ? av - bv : bv - av;
        }
        if (typeof av === "string" && typeof bv === "string") {
          return sortState.direction === "asc"
            ? av.localeCompare(bv)
            : bv.localeCompare(av);
        }
        return 0;
      });
      setSortedData(sorted);
    } else {
      setSortedData(initialData);
    }
  }, [initialData, sortState]);
  

  return {
    sortedData,
    sortState,
    sortData,
  };
}
