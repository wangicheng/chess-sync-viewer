import { useState, useCallback, useRef, useEffect } from 'react';

export function useSplitPane(initialWidth: number, minWidth: number, maxWidthFn: () => number) {
  const [paneWidth, setPaneWidth] = useState(() => {
    const saved = localStorage.getItem('chess-sync-pane-width');
    return saved ? parseInt(saved, 10) : initialWidth;
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startWidth: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Only handle primary mouse button or touch
    if ('button' in e && e.button !== 0) return;
    
    e.preventDefault();
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    dragRef.current = {
      startX: clientX,
      startWidth: paneWidth
    };
  }, [paneWidth]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const deltaX = dragRef.current.startX - clientX;
      
      // Moving left means deltaX is positive, increasing the right pane's width
      let newWidth = dragRef.current.startWidth + deltaX;
      
      const maxWidth = maxWidthFn();
      if (newWidth < minWidth) newWidth = minWidth;
      if (newWidth > maxWidth) newWidth = maxWidth;
      
      setPaneWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleMouseMove, { passive: false });
    document.addEventListener('touchend', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleMouseMove);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, minWidth, maxWidthFn]);

  // Save to localStorage when drag ends, not on every pixel move
  useEffect(() => {
    if (!isDragging) {
      localStorage.setItem('chess-sync-pane-width', paneWidth.toString());
    }
  }, [isDragging, paneWidth]);

  return { paneWidth, isDragging, handleMouseDown };
}
