declare module 'pg' {
  export interface QueryResult<T = any> {
    rows: T[];
    rowCount: number | null;
  }

  export interface PoolClient {
    query<T = any>(text: string, values?: unknown[]): Promise<QueryResult<T>>;
    release(): void;
  }

  export class Pool {
    constructor(config?: Record<string, unknown>);
    query<T = any>(text: string, values?: unknown[]): Promise<QueryResult<T>>;
    connect(): Promise<PoolClient>;
    end(): Promise<void>;
  }
}
