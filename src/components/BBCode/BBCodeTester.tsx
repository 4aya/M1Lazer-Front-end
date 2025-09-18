import React, { useState } from 'react';
import { parseBBCode } from '../../utils/bbcodeParser';
import BBCodeRenderer from '../BBCode/BBCodeRenderer';

/**
 * BBCodeTest component to verify parser functionality
 */
const BBCodeTester: React.FC = () => {
  const [input, setInput] = useState(`[b]Bold text[/b]
[i]Italic text[/i]
[u]Underline text[/u]
[s]Strike-up text[/s]
[color=red]Red text[/color]
[size=150]Large text[/size]

[quote="Test the user"]Here is a citation example[/quote]

[code]
function hello() {
    console.log("Hello World!");
}
[/code]

[spoiler]This is spoiler content[/spoiler]

[box=Folding box title]This is the content of the folded box[/box]

[list]
[*]List items1
[*]List items2
[*]List items3
[/list]

[url=https://osu.ppy.sh]osu!Official website[/url]
[profile=123456]User Links[/profile]

[centre]Chinese text[/centre]

[heading]This is the title[/heading]

[notice]Important notification content[/notice]

[img]https://assets.ppy.sh/images/osu-logo.png[/img]

[youtube]dQw4w9WgXcQ[/youtube]`);

  const parseResult = parseBBCode(input);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">BBCodeParser testing</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input area */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">BBCodeenter</h2>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full h-96 p-4 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
            placeholder="HereenterBBCode..."
          />
          
          {/* Analytical status */}
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              parseResult.valid 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              {parseResult.valid ? '✓ Successful analysis' : `✗ ${parseResult.errors.length}An error`}
            </div>
          </div>
          
          {/* Error List */}
          {parseResult.errors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h3 className="font-medium text-red-800 dark:text-red-200 mb-2">Parsing error:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-red-700 dark:text-red-300">
                {parseResult.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {/* Preview area */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">HTMLPreview</h2>
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 p-4 h-96 overflow-auto">
            <BBCodeRenderer html={parseResult.html} />
          </div>
          
          {/* HTMLSource code */}
          <details className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
            <summary className="p-3 cursor-pointer font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
              CheckHTMLSource code
            </summary>
            <pre className="p-4 text-xs text-gray-600 dark:text-gray-400 overflow-auto bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <code>{parseResult.html}</code>
            </pre>
          </details>
        </div>
      </div>
      
      {/* Supported tag description */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-4">SupportedBBCodeLabel</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">Text format</h4>
            <ul className="space-y-1 text-blue-600 dark:text-blue-400">
              <li>[b]Bold[/b]</li>
              <li>[i]Italic[/i]</li>
              <li>[u]Underline[/u]</li>
              <li>[s]Delete line[/s]</li>
              <li>[color=red]color[/color]</li>
              <li>[size=150]size[/size]</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">Block-level elements</h4>
            <ul className="space-y-1 text-blue-600 dark:text-blue-400">
              <li>[quote]Quote[/quote]</li>
              <li>[code]Code[/code]</li>
              <li>[box=title]Folding frame[/box]</li>
              <li>[spoilerbox]Spoiler box[/spoilerbox]</li>
              <li>[list][*]List[/list]</li>
              <li>[centre]Center[/centre]</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">Links and Media</h4>
            <ul className="space-y-1 text-blue-600 dark:text-blue-400">
              <li>[url=Link]text[/url]</li>
              <li>[profile=ID]user[/profile]</li>
              <li>[img]pictureURL[/img]</li>
              <li>[youtube]videoID[/youtube]</li>
              <li>[audio]AudioURL[/audio]</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BBCodeTester;