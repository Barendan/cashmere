
import { useState } from "react";

export type SortDirection = "asc" | "desc" | null;

export interface SortState {
  column: string | null;
  direction: SortDirection;
}

export function useSortableTable<T>(initialData: T[]) {
  const [sortState, setSortState] = useState<SortState>({ column: null, direction: null });
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

  // Update sorted data if initialData changes and no sorting is applied
  React.useEffect(() => {
    if (!sortState.column) setSortedData(initialData);
  }, [initialData, sortState.column]);

  return {
    sortedData,
    sortState,
    sortData,
  };
}
