import React, { useState, useRef, useEffect } from 'react';

interface ContentContainerProps {
  children: React.ReactNode;
  maxHeight?: number; // Maximum height (pixels)
  className?: string;
  expandText?: string;
  collapseText?: string;
  showExpandButton?: boolean;
}

const ContentContainer: React.FC<ContentContainerProps> = ({
  children,
  maxHeight = 400,
  className = '',
  expandText = 'Show more',
  collapseText = 'Close',
  showExpandButton = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkHeight = () => {
      if (contentRef.current) {
        const contentHeight = contentRef.current.scrollHeight;
        setShowButton(contentHeight > maxHeight);
      }
    };

    checkHeight();
    // Listening content changes
    const resizeObserver = new ResizeObserver(checkHeight);
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [maxHeight, children]);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Content area */}
      <div
        ref={contentRef}
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: !isExpanded && showButton ? `${maxHeight}px` : 'none',
        }}
      >
        {children}
      </div>

      {/* Gradient mask - Shows only when the button is not expanded and needs to be displayed */}
      {!isExpanded && showButton && showExpandButton && (
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-gray-900 to-transparent pointer-events-none" />
      )}

      {/* Expand/CloseButton - Dynamically adjust spacing,ExpandReduce blank space when */}
      {showButton && showExpandButton && (
        <div className={`text-center transition-all duration-300 ${
          isExpanded ? 'mt-1 mb-0' : 'mt-4'
        }`}>
          <button
            onClick={toggleExpanded}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-osu-pink hover:text-pink-700 dark:text-osu-pink dark:hover:text-pink-300 transition-colors duration-200"
          >
            {isExpanded ? (
              <>
                <svg className="w-4 h-4 mr-1 transition-transform duration-200" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                {collapseText}
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1 transition-transform duration-200" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                {expandText}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default ContentContainer;