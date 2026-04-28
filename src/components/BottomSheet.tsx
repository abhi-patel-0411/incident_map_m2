import React, { useState, useRef } from 'react';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';

interface BottomSheetProps {
  children: React.ReactNode;
}

export function BottomSheet({ children }: BottomSheetProps) {
  const [sheetHeight, setSheetHeight] = useState(40); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const startHeight = useRef(40);
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomSheetRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Add robust touch listeners for the entire bottom sheet to enable dragging from anywhere
  // if the list is at the top OR the user is dragging the non-scrollable parts.
  React.useEffect(() => {
    const el = bottomSheetRef.current;
    if (!el) return;

    let activeDrag = false;
    let touchStartY = 0;
    let initialHeight = 40;

    const handleTouchStart = (e: TouchEvent) => {
      activeDrag = true;
      setIsDragging(true);
      touchStartY = e.touches[0].clientY;
      initialHeight = startHeight.current;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!activeDrag) return;

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - touchStartY;

      const target = e.target as HTMLElement;
      const scrollable = target.closest('.scrollable-content');

      if (scrollable) {
        // If swiping UP (deltaY < 0), let user scroll the list natively
        if (deltaY < 0) {
          activeDrag = false;
          setIsDragging(false);
          return;
        }

        // If swiping DOWN (deltaY > 0), but NOT at the top of the list, let user scroll natively
        if (deltaY > 0 && Math.round(scrollable.scrollTop) > 0) {
          activeDrag = false;
          setIsDragging(false);
          return;
        }
      }

      // If we are dragging the sheet, prevent native actions like pull-to-refresh
      if (e.cancelable) {
        e.preventDefault();
      }

      // Calculate delta as a percentage of the container's actual clientHeight
      let containerHeight = window.innerHeight;
      const parent = el.parentElement;
      if (parent) {
        containerHeight = parent.clientHeight;
      }
      
      const deltaH = (deltaY / containerHeight) * 100;
      let newHeight = initialHeight - deltaH;

      newHeight = Math.max(10, Math.min(newHeight, 100)); // allow up to 100%
      setSheetHeight(newHeight);
      startHeight.current = newHeight;
    };

    const handleTouchEnd = () => {
      if (!activeDrag) return;
      activeDrag = false;
      setIsDragging(false);

      // Snap logic
      let finalHeight = startHeight.current;
      if (finalHeight < 35) {
        finalHeight = 20;
      } else if (finalHeight < 70) {
        finalHeight = 50;
      } else {
        finalHeight = 100; // Snap to 100% of container height (just below header)
      }
      setSheetHeight(finalHeight);
      startHeight.current = finalHeight;
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);
    el.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []);

  // Sync startHeight with React state to ensure touch handlers have the latest
  React.useEffect(() => {
    startHeight.current = sheetHeight;
  }, [sheetHeight]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return; // touched device uses global touch listeners
    setIsDragging(true);
    startY.current = e.clientY;
    startHeight.current = sheetHeight;
    if (containerRef.current) {
        containerRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || e.pointerType === 'touch') return;
    const deltaY = e.clientY - startY.current;
    
    // Calculate new height percentage based on parent container
    let containerHeight = window.innerHeight;
    if (bottomSheetRef.current && bottomSheetRef.current.parentElement) {
      containerHeight = bottomSheetRef.current.parentElement.clientHeight;
    }
    
    const deltaH = (deltaY / containerHeight) * 100;
    let newHeight = startHeight.current - deltaH;
    
    // Clamp between 10% and 100%
    newHeight = Math.max(10, Math.min(newHeight, 100));
    setSheetHeight(newHeight);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging || e.pointerType === 'touch') return;
    setIsDragging(false);
    if (containerRef.current) {
        containerRef.current.releasePointerCapture(e.pointerId);
    }
    
    // Snap points: 20%, 50%, 100%
    if (sheetHeight < 35) {
      setSheetHeight(20);
    } else if (sheetHeight < 70) {
      setSheetHeight(50);
    } else {
      setSheetHeight(100);
    }
  };

  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <Box
      ref={bottomSheetRef}
      sx={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: `${sheetHeight}%`, // use % relative to its container (calc(100dvh - 56px))
        bgcolor: 'background.paper',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        boxShadow: '0px -4px 20px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        transition: isDragging ? 'none' : 'height 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
        zIndex: 1000,
        overflow: 'hidden'
      }}
    >
      {/* Drag Handle */}
      <Box
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        sx={{
          width: '100%',
          py: 2.5,
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'grab',
          touchAction: 'none',
          backgroundColor: '#f8fafc', // match list panel header
          // no border bottom, let it blend smoothly into the child header
          '&:active': {
            cursor: 'grabbing',
          }
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 5,
            bgcolor: 'grey.300',
            borderRadius: 3,
          }}
        />
      </Box>

      {/* Content Area */}
      <Box sx={{ flex: 1, minHeight: 0, px: 0, pb: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </Box>
    </Box>
  );
}