/**
 * Image optimization tool
 */

// Generate fuzzy dataURL
export const generateBlurDataURL = (width = 8, height = 8): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';
  
  // Create simple gradients as placeholders
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f3f4f6');
  gradient.addColorStop(1, '#e5e7eb');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  return canvas.toDataURL('image/jpeg', 0.1);
};

// Check if the image is loadable
export const checkImageLoad = (src: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
};

// Preloaded pictures
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
};

// Get image size
export const getImageDimensions = (src: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = reject;
    img.src = src;
  });
};

// Check if it is a pictureURL
export const isImageUrl = (url: string): boolean => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
  const lowercaseUrl = url.toLowerCase();
  return imageExtensions.some(ext => lowercaseUrl.includes(ext)) || 
         lowercaseUrl.includes('image') ||
         lowercaseUrl.includes('img');
};

// Optimize picturesURL(Add parameters, etc.)
export const optimizeImageUrl = (url: string, options: {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpg' | 'png';
} = {}): string => {
  try {
    const urlObj = new URL(url);
    
    // If it is an image service that supports parameters, add optimization parameters
    if (options.width) urlObj.searchParams.set('w', options.width.toString());
    if (options.height) urlObj.searchParams.set('h', options.height.toString());
    if (options.quality) urlObj.searchParams.set('q', options.quality.toString());
    if (options.format) urlObj.searchParams.set('f', options.format);
    
    return urlObj.toString();
  } catch {
    // ifURLInvalid, return to originalURL
    return url;
  }
};

export default {
  generateBlurDataURL,
  checkImageLoad,
  preloadImage,
  getImageDimensions,
  isImageUrl,
  optimizeImageUrl,
};