import { useState, useEffect, useRef, useCallback } from 'react';

interface InteractableState {
  isInteracting: boolean;
  style: React.CSSProperties;
}

export function useInteractable() {
  const ref = useRef<HTMLDivElement>(null);
  
  const [state, setState] = useState<InteractableState>({
    isInteracting: false,
    style: {},
  });

  const dragStart = useRef({ x: 0, y: 0, left: 0, top: 0, width: 0 });
  const [interactionType, setInteractionType] = useState<'drag' | 'resize' | null>(null);

  const initInteraction = useCallback((e: React.MouseEvent | React.TouchEvent, type: 'drag' | 'resize') => {
    if ('button' in e && e.button !== 0) return;
    if (!ref.current) return;
    
    e.stopPropagation();

    const rect = ref.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const currentLeft = state.isInteracting && typeof state.style.left === 'number' ? state.style.left : rect.left;
    const currentTop = state.isInteracting && typeof state.style.top === 'number' ? state.style.top : rect.top;
    const currentWidth = state.isInteracting && typeof state.style.width === 'number' ? state.style.width : rect.width;

    dragStart.current = {
      x: clientX,
      y: clientY,
      left: currentLeft,
      top: currentTop,
      width: currentWidth,
    };

    setInteractionType(type);
    setState({
      isInteracting: true,
      style: {
        position: 'fixed',
        left: currentLeft,
        top: currentTop,
        width: currentWidth,
        margin: 0,
        right: 'auto',
        bottom: 'auto',
        transform: 'none',
      },
    });
  }, [state.isInteracting, state.style]);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => initInteraction(e, 'drag');
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => initInteraction(e, 'resize');

  useEffect(() => {
    if (!interactionType) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const dx = clientX - dragStart.current.x;
      const dy = clientY - dragStart.current.y;

      setState((prev) => {
        if (interactionType === 'drag') {
          return {
            ...prev,
            style: {
              ...prev.style,
              left: dragStart.current.left + dx,
              top: dragStart.current.top + dy,
            },
          };
        } else if (interactionType === 'resize') {
          // Drive the size change using dx. Multiply by 2 because we are scaling from the center.
          const dw = dx * 2;
          // Ensure minimum width of 250px to prevent layout collapse
          const newWidth = Math.max(250, dragStart.current.width + dw);
          const actualDw = newWidth - dragStart.current.width;
          
          return {
            ...prev,
            style: {
              ...prev.style,
              width: newWidth,
              left: dragStart.current.left - actualDw / 2,
              top: dragStart.current.top - actualDw / 2,
            },
          };
        }
        return prev;
      });
    };

    const handleUp = () => {
      setInteractionType(null);
    };

    window.addEventListener('mousemove', handleMove, { passive: false });
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [interactionType]);

  return { 
    ref, 
    style: state.isInteracting ? state.style : undefined, 
    interactionType,
    handleDragStart, 
    handleResizeStart 
  };
}
