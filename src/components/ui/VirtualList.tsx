import { ReactNode } from 'react';
import { useVirtualList } from '@/hooks/useVirtualList';
import { cn } from '@/lib/utils';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number | ((index: number) => number);
  containerHeight: number;
  overscan?: number;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  innerClassName?: string;
  emptyState?: ReactNode;
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5,
  renderItem,
  className,
  innerClassName,
  emptyState,
}: VirtualListProps<T>) {
  const { virtualItems, totalHeight, containerProps } = useVirtualList({
    items,
    itemHeight,
    containerHeight,
    overscan,
  });

  if (items.length === 0 && emptyState) {
    return <div className={className}>{emptyState}</div>;
  }

  return (
    <div
      {...containerProps}
      className={cn('scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent', className)}
    >
      <div
        style={{ height: totalHeight, position: 'relative' }}
        className={innerClassName}
      >
        {virtualItems.map(({ index, item, style }) => (
          <div key={index} style={style}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default VirtualList;
