// File: src/components/ModalPortal.tsx
// Description: Client-side React portal for mounting modals directly onto document.body, eliminating parent transform clipping.
// Author: Akilan M
// Created: 2026-09-20T20:16:41+05:30

'use client';

import { useEffect, ReactNode, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  children: ReactNode;
}

const emptySubscribe = () => () => {};

/**
 * ModalPortal safely mounts modal overlays directly to document.body using React Portal.
 * This guarantees position: fixed targets the true browser window viewport,
 * bypassing parent CSS transforms, filters, animations, or overflow containers.
 * Also locks background body scrolling while open.
 */
export default function ModalPortal({ children }: ModalPortalProps) {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  if (!isMounted || typeof document === 'undefined') {
    return null;
  }

  return createPortal(children, document.body);
}
