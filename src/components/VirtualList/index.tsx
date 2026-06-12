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
  estimatedItemHeight: number; // 初始预估高度
  containerHeight?: number | string;
  bufferScale?: number; // 缓冲区比例，建议聊天场景设为 1 或更高
  autoScrollToBottom?: boolean; // 是否锚定底部
  className?: string;
}
/**
 * 虚拟列表组件
 * @param listData 列表数据
 * @param renderItem 渲染函数，接收 item 和 index 作为参数，返回 ReactNode
 * @param estimatedItemHeight 初始预估高度
 * @param containerHeight 容器高度，默认 100%
 * @param bufferScale 缓冲区比例，默认是1
 * @param autoScrollToBottom 是否自动锚定底部，默认 false
 * @param className 自定义类名
 */
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
  const isAtBottom = useRef(true); // 是否处于底部
  const lastScrollTop = useRef(0); // 记录上一次滚动位置，用于判断方向

  // 初始化positions数组，预估每个item的高度和位置
  const [positions, setPositions] = useState(() =>
    listData.map((_, index) => ({
      index,
      height: estimatedItemHeight,
      top: index * estimatedItemHeight,
      bottom: (index + 1) * estimatedItemHeight,
    })),
  );
  //初始化， 监听滚动容器的高度，一旦容器变高 / 变矮，立刻更新 clientHeight。
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setClientHeight(entry.contentRect.height || entry.target.clientHeight);
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // 加入listData的消息条数变化，position也要跟着变化，新加入的消息的positon数组item给设成预估值
  useEffect(() => {
    setPositions((prev) => {
      if (prev.length === listData.length) return prev;
      // 如果是新增消息，就给新增的消息设置一个预估值数组，像一开始的position一样，接着给它追加到positions数组后面
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
      // 如果是删除消息，就直接切割原数组就好了

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
  const bufferCount = visibleCount; // 默认缓冲一屏(也就是一页item)的数量
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

  // 锚定底部：每帧检查，用户在底部就跟着内容滚动
  useEffect(() => {
    if (!autoScrollToBottom) return;
    let raf: number;
    const tick = () => {
      if (containerRef.current && isAtBottom.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoScrollToBottom]);

  const pendingUpdates = useRef<Record<number, number>>({}); //暂时储存高度，等屏幕刷新时批量更新
  const rafId = useRef<number | null>(null); // 用于取消 rAF 回调的引用

  // 【ResizeObserver】
  // 解决图片加载、流式输出导致的高度突变。一旦 item 尺寸变化，立即修正 positions
  // 使用 rAF 批量更新，避免 AI 吐字时高频触发级联计算导致的性能瓶颈
  // 传入item编号和其真实高度
  const updateItemSize = useCallback((index: number, realHeight: number) => {
    pendingUpdates.current[index] = realHeight;

    if (rafId.current !== null) return;

    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      const updates = { ...pendingUpdates.current }; //更新的item块
      pendingUpdates.current = {};

      setPositions((prev) => {
        const nextPositions = [...prev];
        let firstChangedIndex = Infinity;

        // 1. 批量应用所有待处理的高度变更
        Object.entries(updates).forEach(([idxStr, height]) => {
          const idx = parseInt(idxStr);
          const item = nextPositions[idx];
          if (item && item.height !== height) {
            nextPositions[idx] = { ...item, height, bottom: item.top + height };
            firstChangedIndex = Math.min(firstChangedIndex, idx);
          }
        });

        if (firstChangedIndex === Infinity) return prev;

        // 2. 仅从第一个发生变化的项开始，执行一次性级联更新
        for (let i = firstChangedIndex + 1; i < nextPositions.length; i++) {
          nextPositions[i] = {
            ...nextPositions[i],
            top: nextPositions[i - 1].bottom,
            bottom: nextPositions[i - 1].bottom + nextPositions[i].height,
          };
        }
        return nextPositions;
      });
    });
  }, []);

  // 清理 raf
  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        height: containerHeight,
        overflowY: "auto",
        overflowX: "hidden", //  禁用横向滚动
        position: "relative",
      }}
      onScroll={(e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

        // 判断是否是主动向上滚动
        const isScrollingUp = scrollTop < lastScrollTop.current;
        lastScrollTop.current = scrollTop;

        setScrollTop(scrollTop);

        // 判断当前距离底部的距离
        const offsetFromBottom = scrollHeight - scrollTop - clientHeight;

        if (isScrollingUp && offsetFromBottom > 20) {
          // 只有当用户主动向上滚动，且距离底部超过 20px 时，才认为离开了底部
          isAtBottom.current = false;
        } else if (offsetFromBottom < 20) {
          // 只要回到探底区域，就重新激活锚定状态
          isAtBottom.current = true;
        }
      }}
    >
      {/* 占位盒子 - 移除 width: 100% 避免潜在的抖动和溢出 */}
      <div
        style={{
          height: totalHeight,
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
        }}
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
