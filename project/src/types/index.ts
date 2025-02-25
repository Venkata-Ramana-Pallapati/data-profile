export interface DataQualityMetrics {
  missing_values: Record<string, number>;
  duplicate_rows: number;
  null_values_percentage: Record<string, number>;
  duplicate_percentage: number;
  completeness_percentage: Record<string, number>;
  uniqueness_percentage: Record<string, number>;
}

export interface TableMetrics {
  [tableName: string]: DataQualityMetrics;
}

export interface User {
  email: string;
}


// types.ts
export interface CorrelationData {
  [column: string]: { [relatedColumn: string]: number };
}

export type ViewType = 'global' | 'custom';