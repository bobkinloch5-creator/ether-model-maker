import { useEffect, useRef, useState } from "react";

export function useScrollAnimate<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1, ...options }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

export function useStaggeredScroll<T extends HTMLElement>(itemCount: number, baseDelay = 80) {
  const ref = useRef<T>(null);
  const [visibleSet, setVisibleSet] = useState<Set<number>>(new Set());

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const children = el.children;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Array.from(children).indexOf(entry.target as Element);
            if (idx >= 0) {
              setTimeout(() => {
                setVisibleSet((prev) => new Set(prev).add(idx));
              }, idx * baseDelay);
            }
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    Array.from(children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [itemCount, baseDelay]);

  return { ref, visibleSet };
}
