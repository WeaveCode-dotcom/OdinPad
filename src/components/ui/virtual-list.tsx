import { useVirtualizer } from "@tanstack/react-virtual";
import { type ReactNode, useRef } from "react";

type VirtualListProps<T> = {
  items: T[];
  estimateRowHeight: number;
  className?: string;
  maxHeight?: string;
  /** Accessible label for the list (e.g. "Library books"). Required for screen reader context. */
  ariaLabel?: string;
  children: (item: T, index: number) => ReactNode;
};

/**
 * Vertical windowed list for large in-memory arrays (library shelf, inbox list mode).
 */
export function VirtualList<T>({
  items,
  estimateRowHeight,
  className = "",
  maxHeight = "min(70vh, 720px)",
  ariaLabel,
  children,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateRowHeight,
    overscan: 6,
  });

  if (items.length === 0) return null;

  return (
    <div ref={parentRef} className={className} style={{ maxHeight, overflow: "auto" }}>
      <ul
        role="list"
        aria-label={ariaLabel}
        aria-rowcount={items.length}
        className="relative w-full list-none p-0 m-0"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((vi) => (
          <li
            key={vi.key}
            role="listitem"
            aria-rowindex={vi.index + 1}
            aria-posinset={vi.index + 1}
            aria-setsize={items.length}
            className="absolute left-0 top-0 w-full px-0 py-1.5"
            style={{ transform: `translateY(${vi.start}px)` }}
          >
            {children(items[vi.index], vi.index)}
          </li>
        ))}
      </ul>
    </div>
  );
}
