import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'reportTable',
  standalone: true,
  pure: true,
})
export class ReportTablePipe implements PipeTransform {
  transform<T>(
    rows: T[],
    searchTerm: string,
    sortKey: string,
    sortDirection: 'asc' | 'desc',
  ): T[] {
    const query = searchTerm.trim().toLowerCase();
    const filtered = query
      ? rows.filter((row) =>
          Object.values(row as Record<string, unknown>).some((value) =>
            String(value ?? '')
              .toLowerCase()
              .includes(query),
          ),
        )
      : rows;

    if (!sortKey) return filtered;

    return [...filtered].sort((left, right) => {
      const a = (left as Record<string, unknown>)[sortKey];
      const b = (right as Record<string, unknown>)[sortKey];
      const comparison = this.compare(a, b);
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  private compare(a: unknown, b: unknown): number {
    if (a == null && b == null) return 0;
    if (a == null) return -1;
    if (b == null) return 1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;

    return String(a).localeCompare(String(b), undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  }
}
