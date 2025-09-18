import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiUpload, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { userAPI } from '../../utils/api';
import ImageCropper from './ImageCropper';

interface AvatarUploadProps {
  userId?: number;
  currentAvatarUrl?: string;
  onUploadSuccess: (avatarUrl: string) => void;
  onClose: () => void;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  userId,
  currentAvatarUrl,
  onUploadSuccess,
  onClose,
}) => {
  const [imgSrc, setImgSrc] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [step, setStep] = useState<'select' | 'crop'>('select');
  const [originalFileName, setOriginalFileName] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prevent background scrolling
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Process file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  // Processing files (unified file processing logic)
  const processFile = (file: File) => {
    // Verify file type
    if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) {
      toast.error('Only supported PNG,JPEG,GIF Format picture');
      return;
    }

    // Verify file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size cannot exceed 5MB');
      return;
    }

    // Read the file
    const reader = new FileReader();
    reader.onload = (e) => {
      setImgSrc(e.target?.result as string);
      setOriginalFileName(file.name);
      setStep('crop');
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop event processing
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  // Processing and cutting complete
  const handleCropComplete = async (croppedFile: File) => {
    if (!userId) {
      toast.error('user ID Does not exist');
      return;
    }

    setIsUploading(true);
    try {
      const response = await userAPI.uploadAvatar(croppedFile);
      toast.success('Avatar upload successfully');
      onUploadSuccess(response.avatar_url);
      onClose();
    } catch (error: any) {
      console.error('Avatar upload failed:', error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Avatar upload failed, please try again');
      }
    } finally {
      setIsUploading(false);
    }
  };

  // Handle crop cancel
  const handleCropCancel = () => {
    setStep('select');
    setImgSrc('');
    setOriginalFileName('');
  };

  // (Reserve placeholder: Maybe it needs to be added in the future“restart”button, remove unused resetUpload Function to eliminate TS warn)

  return createPortal(
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isUploading) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden"
        style={{ minHeight: '400px' }}
      >
        {/* head */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {step === 'select' ? 'Upload avatar' : 'Crop avatar'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Content area */}
        <div className="p-6">
          {step === 'select' && (
            <div className="text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {currentAvatarUrl && (
                <div className="mb-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Current avatar</p>
                  <img
                    src={currentAvatarUrl}
                    alt="Current avatar"
                    className="w-24 h-24 rounded-full mx-auto object-cover border-2 border-gray-200 dark:border-gray-600"
                  />
                </div>
              )}

              <div 
                className={`border-2 border-dashed rounded-lg p-8 mb-4 transition-colors cursor-pointer ${
                  isDragOver 
                    ? 'border-osu-pink bg-osu-pink/10' 
                    : 'border-gray-300 dark:border-gray-600 hover:border-osu-pink/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <FiUpload className={`w-12 h-12 mx-auto mb-4 ${isDragOver ? 'text-osu-pink' : 'text-gray-400'}`} />
                <p className={`mb-2 ${isDragOver ? 'text-osu-pink' : 'text-gray-600 dark:text-gray-400'}`}>
                  {isDragOver ? 'Release the file to start uploading' : 'Click to select the picture or drag the picture to here'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  support PNG,JPEG,GIF Format, maximum 5MB
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-400 mt-1">
                  The avatar will be automatically adjusted to 256x256 Pixels
                </p>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-osu-pink hover:bg-osu-pink/90 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Select a picture
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Picture cropper */}
      {step === 'crop' && imgSrc && (
        <ImageCropper
          src={imgSrc}
          aspectRatio={1} // 1:1 Square avatar
          maxWidth={256}
          maxHeight={256}
          quality={0.9}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          fileName={originalFileName}
          isUploading={isUploading}
          uploadingText="Upload avatarmiddle..."
        />
      )}
    </div>,
    document.body
  );
};

export default AvatarUpload;