import { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { AdminMobileCard, SwipeAction } from './AdminMobileCard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface MobileTableColumn<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  // For mobile card view - which columns are most important
  priority?: 'primary' | 'secondary' | 'hidden';
}

interface AdminMobileTableProps<T> {
  data: T[];
  columns: MobileTableColumn<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  getRowActions?: (item: T) => SwipeAction[];
  emptyMessage?: string;
  loading?: boolean;
}

export function AdminMobileTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  getRowActions,
  emptyMessage = 'No data available',
  loading,
}: AdminMobileTableProps<T>) {
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  // Mobile: Card view
  if (isMobile) {
    const primaryColumns = columns.filter(c => c.priority === 'primary' || !c.priority);
    const secondaryColumns = columns.filter(c => c.priority === 'secondary');

    return (
      <div className="space-y-3">
        {data.map((item) => (
          <AdminMobileCard
            key={keyExtractor(item)}
            onClick={onRowClick ? () => onRowClick(item) : undefined}
            menuActions={getRowActions?.(item)}
          >
            <div className="space-y-2">
              {/* Primary content */}
              <div className="space-y-1">
                {primaryColumns.slice(0, 2).map((col) => (
                  <div key={col.key} className={col.key === primaryColumns[0]?.key ? 'font-medium' : 'text-sm text-muted-foreground'}>
                    {col.render(item)}
                  </div>
                ))}
              </div>
              
              {/* Secondary content */}
              {secondaryColumns.length > 0 && (
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {secondaryColumns.map((col) => (
                    <span key={col.key} className="inline-flex items-center gap-1">
                      <span className="text-muted-foreground/60">{col.header}:</span>
                      {col.render(item)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </AdminMobileCard>
        ))}
      </div>
    );
  }

  // Desktop: Table view
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.filter(c => c.priority !== 'hidden').map((col) => (
            <TableHead key={col.key}>{col.header}</TableHead>
          ))}
          {getRowActions && <TableHead className="w-[50px]" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow
            key={keyExtractor(item)}
            className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
            onClick={onRowClick ? () => onRowClick(item) : undefined}
          >
            {columns.filter(c => c.priority !== 'hidden').map((col) => (
              <TableCell key={col.key}>{col.render(item)}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
