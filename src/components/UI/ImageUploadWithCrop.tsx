import React, { useState, useRef } from 'react';
import { FiUpload } from 'react-icons/fi';
import ImageCropper from './ImageCropper';
import toast from 'react-hot-toast';

interface ImageUploadWithCropProps {
  onImageSelect: (file: File) => void;
  preview?: string;
  aspectRatio?: number;
  maxWidth?: number;
  maxHeight?: number;
  maxFileSize?: number; // MB
  acceptedTypes?: string[];
  placeholder?: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  isUploading?: boolean;
  uploadingText?: string;
}

const ImageUploadWithCrop: React.FC<ImageUploadWithCropProps> = ({
  onImageSelect,
  preview,
  aspectRatio,
  maxWidth = 1200,
  maxHeight = 800,
  maxFileSize = 10, // 10MB
  acceptedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
  placeholder = 'Select a picture',
  description,
  icon,
  className = '',
  isUploading = false,
  uploadingText = 'Uploading...'
}) => {
  const [showCropper, setShowCropper] = useState(false);
  const [originalImageSrc, setOriginalImageSrc] = useState<string>('');
  const [originalFileName, setOriginalFileName] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Process file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  // Processing files (unified file processing logic)
  const processFile = (file: File) => {
    // Verify file type
    if (!acceptedTypes.includes(file.type)) {
      toast.error(`Unsupported file formats. Supported formats: ${acceptedTypes.map(type => type.split('/')[1]).join(', ')}`);
      return;
    }

    // Verify file size
    if (file.size > maxFileSize * 1024 * 1024) {
      toast.error(`File size cannot exceed ${maxFileSize}MB`);
      return;
    }

    // Read the file and display the cropper
    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalImageSrc(e.target?.result as string);
      setOriginalFileName(file.name);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop event processing
  const handleDragOver = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  // Processing and cutting complete
  const handleCropComplete = (croppedFile: File) => {
    onImageSelect(croppedFile);
    setShowCropper(false);
    setOriginalImageSrc('');
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle crop cancel
  const handleCropCancel = () => {
    setShowCropper(false);
    setOriginalImageSrc('');
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Click on the upload area
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <div className={`space-y-4 ${className}`}>
        {/* Upload area */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleUploadClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`inline-flex items-center px-4 py-2 text-white rounded-lg transition-colors ${
              isDragOver 
                ? 'bg-osu-pink/80' 
                : 'bg-osu-pink hover:bg-osu-pink/90'
            }`}
          >
            {icon || <FiUpload className="mr-2" />}
            {isDragOver ? 'Release the file to start uploading' : placeholder}
          </button>
          {description && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {description}
            </div>
          )}
        </div>

        {/* Preview pictures */}
        {preview && (
          <div className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${
            aspectRatio === 2 ? 'w-60 h-30' : // Flag proportion 2:1 (240x120)
            aspectRatio === 1.5 ? 'w-full max-w-md h-48' : // Cover ratio 3:2
            'w-48 h-48' // Default square
          }`}>
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Hide file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Picture cropper */}
      {showCropper && (
        <ImageCropper
          src={originalImageSrc}
          aspectRatio={aspectRatio}
          maxWidth={maxWidth}
          maxHeight={maxHeight}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          fileName={originalFileName}
          isUploading={isUploading}
          uploadingText={uploadingText}
        />
      )}
    </>
  );
};

export default ImageUploadWithCrop;
