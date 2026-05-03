// src/components/VirtualList/index.tsx
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";

export interface VirtualListProps<T> {
  listData: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  estimatedItemHeight: number; // 初始预估高度，建议 80-120
  containerHeight?: number | string;
  bufferScale?: number; // 缓冲区比例，建议聊天场景设为 1 或更高
  autoScrollToBottom?: boolean; // AI 场景核心：是否锚定底部
  className?: string;
}

export function VirtualList<T>({
  listData,
  renderItem,
  estimatedItemHeight,
  containerHeight = "100%",
  bufferScale = 1,
  autoScrollToBottom = false,
  className,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [clientHeight, setClientHeight] = useState(0); //可视区域的真实高度
  // 初始化positions数组，预估每个item的高度和位置
  const [positions, setPositions] = useState(() =>
    listData.map((_, index) => ({
      index,
      height: estimatedItemHeight,
      top: index * estimatedItemHeight,
      bottom: (index + 1) * estimatedItemHeight,
    })),
  );
  //初始化， 监听滚动容器的高度，一旦容器变高 / 变矮，立刻更新 clientHeight！（其实就是根据浏览器窗口大小决定clientHeight大小）
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setClientHeight(entry.contentRect.height || entry.target.clientHeight);
      }
      console.log("ssss");
    });
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // 当 listData 长度变化（新消息）或内容变化（流式输出）时，自动滚到底部
  useEffect(() => {
    if (autoScrollToBottom && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [listData]);

  // 加入listData的消息条数变化，position也要跟着变化
  useEffect(() => {
    setPositions((prev) => {
      if (prev.length === listData.length) return prev;
      if (listData.length > prev.length) {
        const lastBottom = prev.length > 0 ? prev[prev.length - 1].bottom : 0;
        const addCount = listData.length - prev.length;
        const newItems = Array.from({ length: addCount }).map((_, i) => {
          const idx = prev.length + i;
          return {
            index: idx,
            height: estimatedItemHeight,
            top: lastBottom + i * estimatedItemHeight,
            bottom: lastBottom + (i + 1) * estimatedItemHeight,
          };
        });
        return [...prev, ...newItems];
      }
      return prev.slice(0, listData.length);
    });
  }, [listData.length]);

  // 由于是不定高，必须通过二分查找 positions 找到当前 scrollTop 对应的 start 索引，找第一个 bottom 大于等于 scrollTop 的 item 索引
  const getStartIndex = useCallback(
    (scrollTop: number) => {
      let left = 0;
      let right = positions.length - 1;
      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (positions[mid].bottom === scrollTop) return mid + 1;
        if (positions[mid].bottom < scrollTop) left = mid + 1;
        else right = mid - 1;
      }
      return left;
    },
    [positions],
  );

  const startIndex = getStartIndex(scrollTop); //渲染列表的首item下标
  const visibleCount = Math.ceil(clientHeight / estimatedItemHeight); //总共能放多少个item

  // 计算渲染列表的起始index（上下各多渲染几个item，防止快速滚动白屏）
  const bufferCount = visibleCount; // 默认缓冲一屏的数量
  const start = Math.max(0, startIndex - bufferCount);
  const end = Math.min(
    listData.length,
    startIndex + visibleCount + bufferCount,
  );

  //渲染偏移量：使内容始终出现在视口内
  const offset = start > 0 ? positions[start].top : 0;

  // 渲染列表的总高度，用来撑开容器
  const totalHeight =
    positions.length > 0 ? positions[positions.length - 1].bottom : 0;

  // 【ResizeObserver】
  //解决图片加载、流式输出导致的高度突变。一旦 item 尺寸变化，立即修正 positions
  // 传入item编号和其真实高度
  const updateItemSize = useCallback((index: number, realHeight: number) => {
    setPositions((prev) => {
      const item = prev[index];
      if (!item || item.height === realHeight) return prev;

      const nextPositions = [...prev];
      nextPositions[index] = {
        ...item,
        height: realHeight,
        bottom: item.top + realHeight,
      };

      // 级联更新：后面所有项的 top/bottom 都要顺延偏移
      for (let i = index + 1; i < nextPositions.length; i++) {
        nextPositions[i] = {
          ...nextPositions[i],
          top: nextPositions[i - 1].bottom,
          bottom: nextPositions[i - 1].bottom + nextPositions[i].height,
        };
      }
      return nextPositions;
    });
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        height: containerHeight,
        overflowY: "auto",
        position: "relative",
      }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      {/* 占位盒子 */}
      <div
        style={{ height: totalHeight, position: "absolute", width: "100%" }}
      />
      {/* 详细渲染列表 */}
      <div style={{ transform: `translate3d(0, ${offset}px, 0)` }}>
        {listData.slice(start, end).map((item, index) => (
          <VirtualListItem
            key={start + index}
            index={start + index}
            onResize={updateItemSize}
          >
            {renderItem(item, start + index)}
          </VirtualListItem>
        ))}
      </div>
    </div>
  );
}

// 内部测量组件：利用 ResizeObserver 实时感知高度
function VirtualListItem({
  children,
  index,
  onResize,
}: {
  children: React.ReactNode;
  index: number;
  onResize: (i: number, h: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver((entries) => {
      const height = ref.current?.offsetHeight; //获取这个更新的Dom元素的高度
      if (height) onResize(index, height);
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [index, onResize]);
  return <div ref={ref}>{children}</div>;
}
