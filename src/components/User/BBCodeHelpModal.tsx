import React from 'react';
import { FaTimes } from 'react-icons/fa';

interface BBCodeHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BBCodeHelpModal: React.FC<BBCodeHelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const bbcodeTags = [
    {
      category: 'Text format',
      tags: [
        { tag: '[b]Bold[/b]', description: 'Boldtext', example: '**Bold**' },
        { tag: '[i]Italic[/i]', description: 'Italictext', example: '*Italic*' },
        { tag: '[u]Underline[/u]', description: 'Underlinetext', example: 'Underlinetext' },
        { tag: '[strike]Delete line[/strike]', description: 'Delete linetext', example: '~~Delete line~~' },
        { tag: '[spoiler]Spoiler[/spoiler]', description: 'Spoilerbar, mouse hover display', example: '███████' },
      ]
    },
    {
      category: 'Color and size',
      tags: [
        { tag: '[color=red]red[/color]', description: 'Colorful text', example: 'redtext' },
        { tag: '[color=#ff0000]red[/color]', description: 'Hexadecimal color', example: 'redtext' },
        { tag: '[size=150]Large characters[/size]', description: 'Font size (50, 85, 100, 150)', example: 'Large characters' },
      ]
    },
    {
      category: 'typesetting',
      tags: [
        { tag: '[centre]Center[/centre]', description: 'CenterAlign', example: 'Centertext' },
        { tag: '[heading]title[/heading]', description: 'bigtitle', example: '# title' },
        { tag: '[quote]Quote[/quote]', description: 'Quotepiece', example: '> Quotecontent' },
        { tag: '[quote="author"]Quote[/quote]', description: 'bringauthorofQuote', example: '> author: Quotecontent' },
      ]
    },
    {
      category: 'List',
      tags: [
        { tag: '[list]\n[*]project1\n[*]project2\n[/list]', description: 'DisorderList', example: '• project1\n• project2' },
        { tag: '[list=1]\n[*]project1\n[*]project2\n[/list]', description: 'OrderlyList', example: '1. project1\n2. project2' },
      ]
    },
    {
      category: 'Code',
      tags: [
        { tag: '[c]Inside the lineCode[/c]', description: 'Inside the lineCode', example: '`Code`' },
        { tag: '[code]\nCodepiece\n[/code]', description: 'Codepiece', example: '```\nCodepiece\n```' },
      ]
    },
    {
      category: 'Links and Media',
      tags: [
        { tag: '[url=Link]text[/url]', description: 'Link', example: 'Linktext' },
        { tag: '[profile=123456]user[/profile]', description: 'userHome pageLink', example: 'userLink' },
        { tag: '[email=Mail]Mail[/email]', description: 'MailLink', example: 'MailLink' },
        { tag: '[img]pictureURL[/img]', description: 'insertpicture', example: '[picture]' },
        { tag: '[youtube]videoID[/youtube]', description: 'YouTubevideo', example: '[video]' },
        { tag: '[audio]AudioURL[/audio]', description: 'AudioPlayer', example: '[Audio]' },
      ]
    },
    {
      category: 'Interactive elements',
      tags: [
        { tag: '[box=title]content[/box]', description: 'Folding frame', example: '▼ title' },
        { tag: '[spoilerbox]content[/spoilerbox]', description: 'Spoilerbox', example: '▼ SPOILER' },
        { tag: '[notice]notify[/notice]', description: 'notifybox', example: '⚠️ importantnotify' },
        { 
          tag: '[imagemap]\npictureURL\n10.0 10.0 30.0 20.0 https://example.com Linktitle\n25.0 40.0 50.0 30.0 # noneLinkarea\n[/imagemap]', 
          description: 'pictureMapping - existpictureCreate on clickablearea. Format:X Y width high Link title(Percent coordinates)', 
          example: '[Interactionpicture]' 
        },
      ]
    },
  ];

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* head */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            BBCode Tag Help
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              BBCode is a lightweight markup language for formattingtext. You can use the following tags to beautify you of your About Me:
            </div>

            {bbcodeTags.map((category, categoryIndex) => (
              <div key={categoryIndex} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                  {category.category}
                </h3>
                <div className="space-y-3">
                  {category.tags.map((tag, tagIndex) => (
                    <div key={tagIndex} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded">
                      <div>
                        <div className="text-sm font-mono text-gray-800 dark:text-gray-200 mb-1">
                          {tag.tag}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {tag.description}
                        </div>
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">Effect preview:</div>
                        <div className="whitespace-pre-line">{tag.example}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                hint
              </h4>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Tags can be used in nesting, such as [b][i]thickItalic[/i][/b]</li>
                <li>• The tags must be paired correctly, and the start and end tags must correspond to</li>
                <li>• Some tags such as [color] and [size] Required parameters</li>
                <li>• You can quickly insert labels using toolbar buttons</li>
                <li>• Use the preview function to view the final effect</li>
              </ul>
            </div>
          </div>
        </div>

        {/* bottom */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-osu-pink hover:bg-pink-600 text-white rounded-lg transition-colors"
          >
            closure
          </button>
        </div>
      </div>
    </div>
  );
};

export default BBCodeHelpModal;