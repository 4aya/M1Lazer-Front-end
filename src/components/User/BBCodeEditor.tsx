import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { BBCodeValidationResponse } from '../../types';
import { 
  FaBold, FaItalic, FaUnderline, FaStrikethrough, FaImage, FaLink, 
  FaQuoteLeft, FaCode, FaList, FaEye, FaEyeSlash, FaYoutube,
  FaEnvelope, FaUser, FaMusic, FaExclamationTriangle, FaMapMarked,
  FaPalette, FaFont, FaHeading, FaAlignCenter, FaMask, FaBox, FaQuestionCircle
} from 'react-icons/fa';
import LoadingSpinner from '../UI/LoadingSpinner';
import { parseBBCode } from '../../utils/bbcodeParser';
import BBCodeRenderer from '../BBCode/BBCodeRenderer';
import BBCodeHelpModal from './BBCodeHelpModal';

interface BBCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  disabled?: boolean;
  title?: string; // Added title attributes
}

interface BBCodeTool {
  icon: React.ComponentType<{ className?: string }>;
  tooltip: string;
  action: () => void;
  shortcut?: string;
}

const BBCodeEditor: React.FC<BBCodeEditorProps> = ({
  value,
  onChange,
  placeholder = 'Enter hereBBCodecontent...',
  className = '',
  maxLength = 60000,
  disabled = false,
  title, // Added title parameters
}) => {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [validationResult, setValidationResult] = useState<BBCodeValidationResponse | null>(null);
  const [validationLoading, setValidationLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Anti-shake verification function
  const debouncedValidation = useCallback(async (content: string) => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(async () => {
      if (content.trim()) {
        try {
          setValidationLoading(true);
          setValidationError(null);
          
          // Use the local parser for basic verification first
          const localResult = parseBBCode(content);
          
          // Set local verification results to avoid repeated calls to the server
          setValidationResult({
            valid: localResult.valid,
            errors: localResult.errors,
            preview: {
              html: localResult.html,
              raw: content
            }
          });
        } catch (error) {
          console.error('BBCode validation error:', error);
          setValidationError('Verification failed, please check the network connection');
          setValidationResult(null);
        } finally {
          setValidationLoading(false);
        }
      } else {
        setValidationResult(null);
        setValidationLoading(false);
      }
    }, 300); // Reduce anti-shake time
  }, []);

  // whencontentTrigger verification when changes
  useEffect(() => {
    debouncedValidation(value);
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [value, debouncedValidation]);

  // insertBBCodeHelper functions for tags
  const insertBBCode = useCallback((openTag: string, closeTag: string, defaultContent: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Save the current focus status
    const wasActive = document.activeElement === textarea;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const contentToWrap = selectedText || defaultContent;
    
    const newText = value.substring(0, start) + 
                   openTag + contentToWrap + closeTag + 
                   value.substring(end);
    
    onChange(newText);

    // userequestAnimationFramemake sureDOMAfter updating, set the cursor position
    requestAnimationFrame(() => {
      if (textarea && wasActive) {
        try {
          textarea.focus();
          if (selectedText) {
            textarea.setSelectionRange(start + openTag.length, start + openTag.length + selectedText.length);
          } else {
            textarea.setSelectionRange(start + openTag.length, start + openTag.length + defaultContent.length);
          }
        } catch (error) {
          // Ignore possible focus setting errors
          console.debug('Focus restoration failed:', error);
        }
      }
    });
  }, [value, onChange]);

  // BBCodeToolbar configuration
  const tools: BBCodeTool[] = [
    // Basic formatting
    {
      icon: FaBold,
      tooltip: 'Bold (Ctrl+B)',
      shortcut: 'ctrl+b',
      action: () => insertBBCode('[b]', '[/b]', 'Boldtext'),
    },
    {
      icon: FaItalic,
      tooltip: 'Italic (Ctrl+I)',
      shortcut: 'ctrl+i',
      action: () => insertBBCode('[i]', '[/i]', 'Italictext'),
    },
    {
      icon: FaUnderline,
      tooltip: 'Underline (Ctrl+U)',
      shortcut: 'ctrl+u',
      action: () => insertBBCode('[u]', '[/u]', 'Underlinetext'),
    },
    {
      icon: FaStrikethrough,
      tooltip: 'Delete line',
      action: () => insertBBCode('[strike]', '[/strike]', 'Delete linetext'),
    },
    {
      icon: FaPalette,
      tooltip: 'color',
      action: () => insertBBCode('[color=red]', '[/color]', 'Colorful text'),
    },
    {
      icon: FaFont,
      tooltip: 'Font size',
      action: () => insertBBCode('[size=100]', '[/size]', 'text'),
    },
    
    // contentinsert
    {
      icon: FaImage,
      tooltip: 'insertpicture',
      action: () => insertBBCode('[img]', '[/img]', 'https://example.com/image.jpg'),
    },
    {
      icon: FaLink,
      tooltip: 'insertLink',
      action: () => insertBBCode('[url=', ']Linktext[/url]', 'https://example.com'),
    },
    {
      icon: FaUser,
      tooltip: 'User homepage link',
      action: () => insertBBCode('[profile=', ']username[/profile]', '123456'),
    },
    {
      icon: FaEnvelope,
      tooltip: 'Email link',
      action: () => insertBBCode('[email=', ']Email link[/email]', 'example@example.com'),
    },
    {
      icon: FaYoutube,
      tooltip: 'YouTubevideo',
      action: () => insertBBCode('[youtube]', '[/youtube]', 'dQw4w9WgXcQ'),
    },
    {
      icon: FaMusic,
      tooltip: 'Audio',
      action: () => insertBBCode('[audio]', '[/audio]', 'https://example.com/audio.mp3'),
    },
    {
      icon: FaMapMarked,
      tooltip: 'Picture Mapping',
      action: () => insertBBCode('[imagemap]\n', '\n10.0 10.0 30.0 20.0 https://example.com Click to visit the website\n50.0 30.0 40.0 25.0 # This is the information area\n[/imagemap]', 'https://example.com/image.jpg'),
    },
    
    // Structuredcontent
    {
      icon: FaQuoteLeft,
      tooltip: 'Quote',
      action: () => insertBBCode('[quote]', '[/quote]', 'Quotecontent'),
    },
    {
      icon: FaCode,
      tooltip: 'Code block',
      action: () => insertBBCode('[code]', '[/code]', 'Codecontent'),
    },
    {
      icon: FaList,
      tooltip: 'List',
      action: () => insertBBCode('[list]\n[*]', '\n[*]project2\n[/list]', 'project1'),
    },
    {
      icon: FaBox,
      tooltip: 'Folding frame',
      action: () => insertBBCode('[box=title]', '[/box]', 'foldcontent'),
    },
    {
      icon: FaMask,
      tooltip: 'Spoiler bar',
      action: () => insertBBCode('[spoiler]', '[/spoiler]', 'Spoilercontent'),
    },
    {
      icon: FaAlignCenter,
      tooltip: 'Align center',
      action: () => insertBBCode('[centre]', '[/centre]', 'Centertext'),
    },
    {
      icon: FaHeading,
      tooltip: 'title',
      action: () => insertBBCode('[heading]', '[/heading]', 'titletext'),
    },
    {
      icon: FaExclamationTriangle,
      tooltip: 'Notification box',
      action: () => insertBBCode('[notice]', '[/notice]', 'Important notice'),
    },
  ];

  // Toolbar button click processing
  const handleToolClick = useCallback((e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    action();
  }, []);

  // Keyboard shortcut key processing
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      const tool = tools.find(t => t.shortcut === `ctrl+${e.key.toLowerCase()}`);
      if (tool) {
        e.preventDefault();
        tool.action();
      }
    }
  }, [tools]);

  // colorSelector
  const insertColor = useCallback((color: string) => {
    insertBBCode(`[color=${color}]`, '[/color]', 'Colorful text');
  }, [insertBBCode]);

  // Font sizeSelector
  const insertSize = useCallback((size: number) => {
    insertBBCode(`[size=${size}]`, '[/size]', `${size}pxtext`);
  }, [insertBBCode]);

  return (
    <div className={`${className}`}>
      {/* titlecolumn */}
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
        </div>
      )}
      
      {/* Editor Container */}
      <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
        {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
        <div className="flex items-center gap-1 flex-wrap">
          {/* Basic formattingtool */}
          <div className="flex items-center gap-1">
            {tools.slice(0, 6).map((tool, index) => (
              <button
                key={index}
                type="button"
                onClick={(e) => handleToolClick(e, tool.action)}
                disabled={disabled}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={tool.tooltip}
              >
                <tool.icon className="w-3 h-3 text-gray-600 dark:text-gray-300" />
              </button>
            ))}
          </div>
          
          {/* Dividing line */}
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
          
          {/* contentinserttool */}
          <div className="flex items-center gap-1">
            {tools.slice(6, 13).map((tool, index) => (
              <button
                key={index + 6}
                type="button"
                onClick={(e) => handleToolClick(e, tool.action)}
                disabled={disabled}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={tool.tooltip}
              >
                <tool.icon className="w-3 h-3 text-gray-600 dark:text-gray-300" />
              </button>
            ))}
          </div>
          
          {/* Dividing line */}
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
          
          {/* Structuredcontenttool */}
          <div className="flex items-center gap-1">
            {tools.slice(13).map((tool, index) => (
              <button
                key={index + 13}
                type="button"
                onClick={(e) => handleToolClick(e, tool.action)}
                disabled={disabled}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={tool.tooltip}
              >
                <tool.icon className="w-3 h-3 text-gray-600 dark:text-gray-300" />
              </button>
            ))}
          </div>
          
          {/* Dividing line */}
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
          
          {/* fastcolorchoose */}
          <div className="flex items-center gap-1">
            {['red', 'blue', 'green', 'purple', 'orange'].map(color => (
              <button
                key={color}
                type="button"
                onClick={(e) => handleToolClick(e, () => insertColor(color))}
                disabled={disabled}
                className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform disabled:cursor-not-allowed"
                style={{ backgroundColor: color }}
                title={`${color}colortext`}
              />
            ))}
          </div>
          
          {/* Dividing line */}
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
          
          {/* Font size */}
          <select
            onChange={(e) => e.target.value && insertSize(parseInt(e.target.value))}
            disabled={disabled}
            className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50"
            defaultValue=""
          >
            <option value="" disabled>Font size</option>
            <option value="50">Extremely small (50)</option>
            <option value="85">Small (85)</option>
            <option value="100">ordinary (100)</option>
            <option value="150">big (150)</option>
          </select>
        </div>

        {/* Preview toggle and word count */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {value.length}/{maxLength}
          </span>
          
          <button
            type="button"
            onClick={(e) => handleToolClick(e, () => setIsHelpModalOpen(true))}
            disabled={disabled}
            className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="BBCodehelp"
          >
            <FaQuestionCircle className="w-3 h-3" />
            <span className="hidden sm:inline">help</span>
          </button>
          
          <button
            type="button"
            onClick={(e) => handleToolClick(e, () => setIsPreviewMode(!isPreviewMode))}
            disabled={disabled}
            className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPreviewMode ? (
              <>
                <FaEyeSlash className="w-3 h-3" />
                <span className="hidden sm:inline">edit</span>
              </>
            ) : (
              <>
                <FaEye className="w-3 h-3" />
                <span className="hidden sm:inline">Preview</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* editDevicecontentarea */}
      <div className="relative">
        {isPreviewMode ? (
          /* Previewmodel */
          <div className="p-4 min-h-[300px] h-[50vh] overflow-y-auto">
            {validationLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="sm" />
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">generatePreviewmiddle...</span>
              </div>
            ) : validationError ? (
              <div className="text-center py-8 text-red-500 dark:text-red-400 text-sm">
                {validationError}
              </div>
            ) : validationResult?.preview ? (
              <BBCodeRenderer 
                html={validationResult.preview.html} 
                className="prose prose-sm dark:prose-invert max-w-none"
              />
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                {value.trim() ? 'CannotgeneratePreview' : 'entercontentTo viewPreview'}
              </div>
            )}
          </div>
        ) : (
          /* editmodel */
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            className="w-full p-4 min-h-[300px] h-[50vh] resize-none bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 font-mono text-sm leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ lineHeight: '1.6' }}
          />
        )}

        {/* Verification result indicator */}
        {!isPreviewMode && (
          <div className="absolute top-2 right-2 flex items-center gap-2">
            {validationLoading && (
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-xs">
                <LoadingSpinner size="sm" />
                <span>Verification</span>
              </div>
            )}
            
            {validationResult && !validationLoading && (
              <div className={`px-2 py-1 rounded-md text-xs ${
                validationResult.valid 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              }`}>
                {validationResult.valid ? '✓ Correct syntax' : `✗ ${validationResult.errors.length}An error`}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Verification errorList */}
      {validationResult && !validationResult.valid && validationResult.errors.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-red-50 dark:bg-red-900/10">
          <div className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">
            BBCodeSyntax error:
          </div>
          <ul className="list-disc list-inside space-y-1">
            {validationResult.errors.map((error, index) => (
              <li key={index} className="text-sm text-red-600 dark:text-red-400">
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* helptext - More compact design */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-2 py-1 bg-gray-50 dark:bg-gray-700/30">
        <details className="text-xs text-gray-600 dark:text-gray-400">
          <summary className="cursor-pointer hover:text-gray-800 dark:hover:text-gray-200 py-1">
            BBCodehelp
          </summary>
          <div className="mt-1 pb-1 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-0.5 text-xs">
            <div><strong>[b]Bold[/b]</strong></div>
            <div><em>[i]Italic[/i]</em></div>
            <div><u>[u]Underline[/u]</u></div>
            <div><del>[s]Delete line[/s]</del></div>
            <div>[color=red]color[/color]</div>
            <div>[size=16]bigSmall[/size]</div>
            <div>[url=Link]text[/url]</div>
            <div>[img]pictureURL[/img]</div>
            <div>[quote]Quote[/quote]</div>
            <div>[code]Code[/code]</div>
            <div className="md:col-span-1 col-span-2">[list][*]project1[*]project2[/list]</div>
          </div>
        </details>
      </div>

      {/* BBCodehelpModal Box */}
      <BBCodeHelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />
      </div>
    </div>
  );
};

export default BBCodeEditor;