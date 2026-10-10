import { useState, useCallback, useRef, useEffect } from 'react';

export interface DragItem {
  id: string;
  type: 'player' | 'substitute';
  data?: any;
}

interface TouchDragState {
  isDragging: boolean;
  draggedItem: DragItem | null;
  dragPosition: { x: number; y: number } | null;
  dragSourceIndex: number | null;
  longPressProgress: number;
}

interface UseTouchDragAndDropOptions {
  onDrop: (draggedId: string, targetIndex: number, sourceIndex?: number) => void;
  longPressDuration?: number;
  enableTouch?: boolean;
}

export const useTouchDragAndDrop = (options: UseTouchDragAndDropOptions) => {
  const { onDrop, longPressDuration = 500, enableTouch = true } = options;
  
  const [state, setState] = useState<TouchDragState>({
    isDragging: false,
    draggedItem: null,
    dragPosition: null,
    dragSourceIndex: null,
    longPressProgress: 0,
  });

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const pitchRef = useRef<HTMLDivElement | null>(null);

  // Check if device supports touch
  const isTouchDevice = typeof window !== 'undefined' && 
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  const clearTimers = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const startLongPress = useCallback((item: DragItem, sourceIndex: number, touchX: number, touchY: number) => {
    touchStartPosRef.current = { x: touchX, y: touchY };
    
    // Start progress animation
    const startTime = Date.now();
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / longPressDuration, 1);
      setState(prev => ({ ...prev, longPressProgress: progress }));
    }, 16);

    longPressTimerRef.current = setTimeout(() => {
      clearTimers();
      setState({
        isDragging: true,
        draggedItem: item,
        dragPosition: { x: touchX, y: touchY },
        dragSourceIndex: sourceIndex,
        longPressProgress: 0,
      });
      
      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, longPressDuration);
  }, [longPressDuration, clearTimers]);

  const handleTouchStart = useCallback((
    e: React.TouchEvent,
    item: DragItem,
    sourceIndex: number
  ) => {
    if (!enableTouch || !isTouchDevice) return;
    
    const touch = e.touches[0];
    startLongPress(item, sourceIndex, touch.clientX, touch.clientY);
  }, [enableTouch, isTouchDevice, startLongPress]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!state.isDragging) {
      // Check if moved too far (cancel long press)
      if (touchStartPosRef.current && longPressTimerRef.current) {
        const touch = e.touches[0];
        const dx = touch.clientX - touchStartPosRef.current.x;
        const dy = touch.clientY - touchStartPosRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 10) {
          clearTimers();
          setState(prev => ({ ...prev, longPressProgress: 0 }));
        }
      }
      return;
    }

    e.preventDefault();
    const touch = e.touches[0];
    setState(prev => ({
      ...prev,
      dragPosition: { x: touch.clientX, y: touch.clientY },
    }));
  }, [state.isDragging, clearTimers]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    clearTimers();
    
    if (!state.isDragging || !state.draggedItem) {
      setState(prev => ({ ...prev, longPressProgress: 0 }));
      return;
    }

    const touch = e.changedTouches[0];
    
    // Find drop target under the touch point
    if (pitchRef.current) {
      const pitchRect = pitchRef.current.getBoundingClientRect();
      const relativeX = touch.clientX - pitchRect.left;
      const relativeY = touch.clientY - pitchRect.top;
      
      // Find the closest position slot
      const slots = pitchRef.current.querySelectorAll('[data-pitch-slot]');
      let closestSlot: Element | null = null;
      let closestDistance = Infinity;
      let closestIndex = -1;

      slots.forEach((slot, index) => {
        const rect = slot.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2 - pitchRect.left;
        const centerY = rect.top + rect.height / 2 - pitchRect.top;
        const distance = Math.sqrt(
          Math.pow(relativeX - centerX, 2) + Math.pow(relativeY - centerY, 2)
        );
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestSlot = slot;
          closestIndex = index;
        }
      });

      // Only drop if close enough (within 80px)
      if (closestSlot && closestDistance < 80 && closestIndex !== -1) {
        onDrop(state.draggedItem.id, closestIndex, state.dragSourceIndex ?? undefined);
      }
    }

    setState({
      isDragging: false,
      draggedItem: null,
      dragPosition: null,
      dragSourceIndex: null,
      longPressProgress: 0,
    });
  }, [state.isDragging, state.draggedItem, state.dragSourceIndex, onDrop, clearTimers]);

  const cancelDrag = useCallback(() => {
    clearTimers();
    setState({
      isDragging: false,
      draggedItem: null,
      dragPosition: null,
      dragSourceIndex: null,
      longPressProgress: 0,
    });
  }, [clearTimers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return {
    ...state,
    pitchRef,
    isTouchDevice,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    cancelDrag,
  };
};

export default useTouchDragAndDrop;
