import { useEffect, useRef, useState } from 'react';

export function isStandaloneDisplayMode() {
  if (typeof window === 'undefined') return false;

  const modes = ['standalone', 'fullscreen', 'minimal-ui'];
  return modes.some(mode => window.matchMedia(`(display-mode: ${mode})`).matches) ||
    window.navigator.standalone === true;
}

const SWIPE_SPRING = 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)';
const SWIPE_SLIDE = 'transform 190ms cubic-bezier(0.4, 0, 0.2, 1)';

export function useSwipePager({ onNext, onPrev, canNext, canPrev }) {
  const [offset, setOffset] = useState(0);
  const [transition, setTransition] = useState('none');
  const latest = useRef({ onNext, onPrev, canNext, canPrev });
  const gesture = useRef({ active: false, horizontal: null, startX: 0, startY: 0, lastX: 0 });
  const animating = useRef(false);
  const timers = useRef([]);

  latest.current = { onNext, onPrev, canNext, canPrev };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const springBack = () => {
    setTransition(SWIPE_SPRING);
    setOffset(0);
    timers.current.push(setTimeout(() => setTransition('none'), 430));
  };

  const changePage = direction => {
    animating.current = true;
    const width = window.innerWidth || 360;
    setTransition(SWIPE_SLIDE);
    setOffset(direction === 1 ? -width : width);

    timers.current.push(setTimeout(() => {
      if (direction === 1) latest.current.onNext();
      else latest.current.onPrev();
      setTransition('none');
      setOffset(direction === 1 ? width : -width);

      timers.current.push(setTimeout(() => {
        setTransition(SWIPE_SLIDE);
        setOffset(0);
        timers.current.push(setTimeout(() => {
          animating.current = false;
          setTransition('none');
        }, 200));
      }, 20));
    }, 190));
  };

  const onTouchStart = e => {
    if (animating.current || e.touches.length !== 1) return;
    if (e.target.closest('button, a, input, textarea, select, [data-no-swipe]')) return;
    const touch = e.touches[0];
    gesture.current = {
      active: true,
      horizontal: null,
      startX: touch.clientX,
      startY: touch.clientY,
      lastX: touch.clientX,
    };
    setTransition('none');
  };

  const onTouchMove = e => {
    const state = gesture.current;
    if (!state.active || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - state.startX;
    const dy = touch.clientY - state.startY;

    if (state.horizontal === null && (Math.abs(dx) > 7 || Math.abs(dy) > 7)) {
      state.horizontal = Math.abs(dx) > Math.abs(dy);
    }
    if (state.horizontal === false) {
      state.active = false;
      return;
    }
    if (state.horizontal !== true) return;

    e.preventDefault();
    state.lastX = touch.clientX;
    const atBoundary = (dx > 0 && !latest.current.canPrev) || (dx < 0 && !latest.current.canNext);
    setOffset(atBoundary ? dx * 0.28 : dx);
  };

  const finishTouch = () => {
    const state = gesture.current;
    if (!state.active) return;
    state.active = false;
    if (state.horizontal !== true) return;

    const dx = state.lastX - state.startX;
    const threshold = Math.min(72, (window.innerWidth || 360) * 0.18);
    if (dx <= -threshold && latest.current.canNext) changePage(1);
    else if (dx >= threshold && latest.current.canPrev) changePage(-1);
    else springBack();
  };

  return {
    swipeHandlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd: finishTouch,
      onTouchCancel: finishTouch,
    },
    swipeStyle: {
      transform: `translate3d(${offset}px, 0, 0)`,
      transition,
      willChange: 'transform',
      touchAction: 'pan-y',
    },
  };
}
