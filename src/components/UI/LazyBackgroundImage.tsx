import React, { useState, useRef, useEffect } from 'react';

interface LazyBackgroundImageProps {
  src?: string;
  fallback?: string;
  className?: string;
  children: React.ReactNode;
}

const LazyBackgroundImage: React.FC<LazyBackgroundImageProps> = ({
  src,
  fallback,
  className = '',
  children
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showBackground, setShowBackground] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isInView || !src) return;

    // Delay loading background images to ensure that user data is displayed first
    const timer = setTimeout(() => {
      const img = new Image();
      img.onload = () => {
        setIsLoaded(true);
        setHasError(false);
        // Delay the background display a little more, so that user data can be rendered first
        setTimeout(() => setShowBackground(true), 50);
      };
      img.onerror = () => {
        setHasError(true);
        setIsLoaded(false);
      };
      img.src = src;
    }, 300); // Delay300msStart loading the background and make sure that the user data is displayed first

    return () => clearTimeout(timer);
  }, [isInView, src]);

  const backgroundImage = (() => {
    if (!showBackground || !src) return 'none';
    if (hasError && fallback) return `url(${fallback})`;
    if (isLoaded) return `url(${src})`;
    return 'none';
  })();

  const backgroundOpacity = showBackground && isLoaded && !hasError ? 1 : 0;

  return (
    <div ref={elementRef} className={`relative ${className}`}>
      {/* Background picture layer - Only background gradient */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: backgroundOpacity,
          transition: 'opacity 0.5s ease-in-out'
        }}
      />
      
      {/* Content layer - Show now */}
      <div className="relative">
        {children}
      </div>
    </div>
  );
};

export default LazyBackgroundImage;
