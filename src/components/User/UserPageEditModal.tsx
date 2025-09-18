import React, { useState, useEffect } from 'react';
import { FaTimes, FaSave } from 'react-icons/fa';
import type { User } from '../../types';
import BBCodeEditor from './BBCodeEditor';
import { userAPI } from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';

interface UserPageEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSave: (updatedUser: User) => void;
}

const UserPageEditModal: React.FC<UserPageEditModalProps> = ({
  isOpen,
  onClose,
  user,
  onSave,
}) => {
  const { user: currentUser } = useAuth();
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setContent(user.page?.raw || '');
      // Prevent background scrolling
      document.body.style.overflow = 'hidden';
      
      // Add global keyboard event listening, only handledEscapekey
      const handleGlobalKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !e.defaultPrevented) {
          onClose();
        }
      };
      
      document.addEventListener('keydown', handleGlobalKeyDown);
      
      return () => {
        document.removeEventListener('keydown', handleGlobalKeyDown);
        document.body.style.overflow = 'unset';
      };
    } else {
      // Restore background scrolling
      document.body.style.overflow = 'unset';
    }
  }, [isOpen, user.page?.raw, onClose]);

  const handleSave = async () => {
    if (!currentUser || currentUser.id !== user.id) return;

    setIsSaving(true);
    try {
      const response = await userAPI.updateUserPage(currentUser.id, content);
      
      // Try to get the renderedHTML
      let html = '';
      if (response.html) {
        html = response.html;
      } else if (response.data?.html) {
        html = response.data.html;
      } else if (response.preview?.html) {
        html = response.preview.html;
      } else {
        // If notHTML, try to verifyBBCodeGet a preview
        try {
          const validationResult = await userAPI.validateBBCode(content);
          if (validationResult.preview?.html) {
            html = validationResult.preview.html;
          }
        } catch (validationError) {
          console.warn('BBCodeVerification failed:', validationError);
          // Use original content asHTML(Not ideal but at least the content is displayed)
          html = content.replace(/\n/g, '<br>');
        }
      }
      
      // Update user data
      const updatedUser = {
        ...user,
        page: {
          raw: content,
          html: html,
        }
      };
      
      // Notify the parent component to update
      onSave(updatedUser);
      onClose();
    } catch (error) {
      console.error('Saving failed:', error);
      // Here you can add error prompts
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setContent(user.page?.raw || '');
    onClose();
  };

  // Prevent events from bubbled inside the modal box
  const handleModalContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Prevent mouse events from bubbled inside the modal box
  const handleModalContentMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleModalContentMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Handle mouse press events, record press position and time
  const [mouseDownTarget, setMouseDownTarget] = useState<EventTarget | null>(null);
  const [mouseDownTime, setMouseDownTime] = useState<number>(0);
  const [mouseDownPosition, setMouseDownPosition] = useState<{x: number, y: number} | null>(null);
  
  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    setMouseDownTarget(e.target);
    setMouseDownTime(Date.now());
    setMouseDownPosition({ x: e.clientX, y: e.clientY });
  };

  const handleBackdropMouseUp = (e: React.MouseEvent) => {
    const timeDiff = Date.now() - mouseDownTime;
    const isQuickClick = timeDiff < 200; // less than200msThink of it as clicking rather than dragging
    
    // Calculate the distance of the mouse
    const distance = mouseDownPosition ? 
      Math.sqrt(
        Math.pow(e.clientX - mouseDownPosition.x, 2) + 
        Math.pow(e.clientY - mouseDownPosition.y, 2)
      ) : 0;
    
    const isStationary = distance < 5; // Moving distance is less than5pxThink it's a click
    
    // The modal box is closed only when pressing and releasing on the same element, and is a quick click or a still click, and is a background layer.
    if (e.target === e.currentTarget && 
        mouseDownTarget === e.target && 
        (isQuickClick || isStationary)) {
      onClose();
    }
    
    // Reset status
    setMouseDownTarget(null);
    setMouseDownTime(0);
    setMouseDownPosition(null);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4"
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-7xl h-[95vh] overflow-hidden flex flex-col"
        onClick={handleModalContentClick}
        onMouseDown={handleModalContentMouseDown}
        onMouseUp={handleModalContentMouseUp}
      >
        {/* head */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Editor of About Me
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* content */}
        <div className="p-4 md:p-6 overflow-y-auto flex-1">
          <BBCodeEditor
            title="About Me"
            value={content}
            onChange={setContent}
            placeholder="use BBCode to Write yours About Me..."
            className="min-h-[60vh] h-full"
          />
        </div>

        {/* Bottom button */}
        <div className="flex items-center justify-end gap-3 p-4 md:p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-osu-pink hover:bg-pink-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <FaSave className="w-4 h-4" />
                save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserPageEditModal;