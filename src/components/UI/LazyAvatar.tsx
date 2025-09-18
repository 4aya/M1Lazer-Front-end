import React, { useState, useRef, useEffect } from 'react';

interface LazyAvatarProps {
  src?: string;
  alt: string;
  fallback?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const LazyAvatar: React.FC<LazyAvatarProps> = ({
  src,
  alt,
  fallback = '/default.jpg',
  className = '',
  size = 'md'
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  // hasError The status is not used, remove to eliminate TS warn
  const [imageSrc, setImageSrc] = useState<string | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  // Size Mapping
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

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

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isInView) return;

    // Delay loading of avatars to ensure that the ranking content is displayed first
    const timer = setTimeout(() => {
      if (src) {
        const img = new Image();
        img.onload = () => {
          setImageSrc(src);
          setIsLoaded(true);
        };
        img.onerror = () => {
          setImageSrc(fallback);
          setIsLoaded(true);
        };
        img.src = src;
      } else {
        setImageSrc(fallback);
        setIsLoaded(true);
      }
    }, 100); // Delay100msLoad avatar

    return () => clearTimeout(timer);
  }, [isInView, src, fallback]);

  return (
    <div 
      ref={containerRef}
      className={`${sizeClasses[size]} ${className} relative overflow-hidden rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 transition-colors duration-200`}
    >
      {/* Placeholder background - Only displayed when the image is not loaded */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse" />
        </div>
      )}
      
      {/* Actual pictures */}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
        />
      )}
    </div>
  );
};

export default LazyAvatar;