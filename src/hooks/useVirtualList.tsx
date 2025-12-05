import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

interface UseVirtualListOptions<T> {
  items: T[];
  itemHeight: number | ((index: number) => number);
  containerHeight: number;
  overscan?: number;
}

interface VirtualListResult<T> {
  virtualItems: Array<{
    index: number;
    item: T;
    style: React.CSSProperties;
  }>;
  totalHeight: number;
  containerProps: {
    ref: React.RefObject<HTMLDivElement>;
    style: React.CSSProperties;
    onScroll: () => void;
  };
  scrollToIndex: (index: number, behavior?: ScrollBehavior) => void;
}

export function useVirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5,
}: UseVirtualListOptions<T>): VirtualListResult<T> {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate item heights
  const getItemHeight = useCallback((index: number): number => {
    return typeof itemHeight === 'function' ? itemHeight(index) : itemHeight;
  }, [itemHeight]);

  // Calculate cumulative heights for variable-size items
  const itemMetrics = useMemo(() => {
    const metrics: Array<{ offset: number; height: number }> = [];
    let offset = 0;
    
    for (let i = 0; i < items.length; i++) {
      const height = getItemHeight(i);
      metrics.push({ offset, height });
      offset += height;
    }
    
    return metrics;
  }, [items.length, getItemHeight]);

  const totalHeight = useMemo(() => {
    return itemMetrics.length > 0
      ? itemMetrics[itemMetrics.length - 1].offset + itemMetrics[itemMetrics.length - 1].height
      : 0;
  }, [itemMetrics]);

  // Find visible range
  const { startIndex, endIndex } = useMemo(() => {
    if (items.length === 0) {
      return { startIndex: 0, endIndex: 0 };
    }

    // Binary search for start index
    let start = 0;
    let end = items.length - 1;
    
    while (start < end) {
      const mid = Math.floor((start + end) / 2);
      if (itemMetrics[mid].offset + itemMetrics[mid].height < scrollTop) {
        start = mid + 1;
      } else {
        end = mid;
      }
    }
    
    const visibleStart = Math.max(0, start - overscan);
    
    // Find end index
    let visibleEnd = start;
    while (
      visibleEnd < items.length &&
      itemMetrics[visibleEnd].offset < scrollTop + containerHeight
    ) {
      visibleEnd++;
    }
    visibleEnd = Math.min(items.length - 1, visibleEnd + overscan);
    
    return { startIndex: visibleStart, endIndex: visibleEnd };
  }, [scrollTop, containerHeight, items.length, itemMetrics, overscan]);

  // Generate virtual items
  const virtualItems = useMemo(() => {
    const result = [];
    
    for (let i = startIndex; i <= endIndex && i < items.length; i++) {
      result.push({
        index: i,
        item: items[i],
        style: {
          position: 'absolute' as const,
          top: itemMetrics[i].offset,
          left: 0,
          width: '100%',
          height: itemMetrics[i].height,
        },
      });
    }
    
    return result;
  }, [startIndex, endIndex, items, itemMetrics]);

  // Scroll handler
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  // Scroll to specific index
  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    if (containerRef.current && itemMetrics[index]) {
      containerRef.current.scrollTo({
        top: itemMetrics[index].offset,
        behavior,
      });
    }
  }, [itemMetrics]);

  // Sync scroll position on mount
  useEffect(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  return {
    virtualItems,
    totalHeight,
    containerProps: {
      ref: containerRef,
      style: {
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
      },
      onScroll: handleScroll,
    },
    scrollToIndex,
  };
}

export default useVirtualList;
