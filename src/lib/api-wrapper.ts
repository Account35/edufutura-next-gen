import { supabase } from '@/integrations/supabase/client';
import { logApiCall } from './logging';
import { DatabaseError } from './errors';

/**
 * Wrapper for Supabase queries with automatic logging and error handling
 */
export async function supabaseQuery<T>(
  operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert',
  tableName: string,
  queryBuilder: () => Promise<{ data: T | null; error: any }>
): Promise<T> {
  const startTime = performance.now();
  
  try {
    const { data, error } = await queryBuilder();
    const duration = Math.round(performance.now() - startTime);

    // Log successful query
    await logApiCall({
      endpoint: `/${tableName}`,
      method: operation.toUpperCase(),
      status: error ? 500 : 200,
      duration_ms: duration,
      error_message: error?.message
    });

    if (error) {
      throw new DatabaseError(
        operation,
        tableName,
        error.message,
        error
      );
    }

    if (!data) {
      throw new DatabaseError(
        operation,
        tableName,
        'No data returned'
      );
    }

    return data;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    
    await logApiCall({
      endpoint: `/${tableName}`,
      method: operation.toUpperCase(),
      status: 500,
      duration_ms: duration,
      error_message: error instanceof Error ? error.message : 'Unknown error'
    });

    if (error instanceof DatabaseError) {
      throw error;
    }

    throw new DatabaseError(
      operation,
      tableName,
      error instanceof Error ? error.message : 'Unknown database error',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Helper functions for common operations
 */
export const db = {
  /**
   * Select with automatic logging
   */
  async select<T>(tableName: string, query: () => Promise<{ data: T | null; error: any }>): Promise<T> {
    return supabaseQuery('select', tableName, query);
  },

  /**
   * Insert with automatic logging
   */
  async insert<T>(tableName: string, query: () => Promise<{ data: T | null; error: any }>): Promise<T> {
    return supabaseQuery('insert', tableName, query);
  },

  /**
   * Update with automatic logging
   */
  async update<T>(tableName: string, query: () => Promise<{ data: T | null; error: any }>): Promise<T> {
    return supabaseQuery('update', tableName, query);
  },

  /**
   * Delete with automatic logging
   */
  async delete<T>(tableName: string, query: () => Promise<{ data: T | null; error: any }>): Promise<T> {
    return supabaseQuery('delete', tableName, query);
  },

  /**
   * Upsert with automatic logging
   */
  async upsert<T>(tableName: string, query: () => Promise<{ data: T | null; error: any }>): Promise<T> {
    return supabaseQuery('upsert', tableName, query);
  }
};
