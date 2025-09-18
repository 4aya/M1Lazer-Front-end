/**
 * BBCode Parser for osu! style BBCode
 * Based on officialosu-web BBCodeFromDB.phpImplement to ensure that the output is consistent with the official website
 */

export interface BBCodeParseResult {
  html: string;
  errors: string[];
  valid: boolean;
}

export interface BBCodeTag {
  name: string;
  openTag: string;
  closeTag: string;
  hasParam?: boolean;
  paramRequired?: boolean;
  allowNested?: boolean;
  isBlock?: boolean;  // Whether the mark is a block-level element
  validator?: (param?: string, content?: string) => boolean;
  renderer: (content: string, param?: string) => string;
}

export class BBCodeParser {
  private readonly tags: Map<string, BBCodeTag> = new Map();
  private readonly errors: string[] = [];

  constructor() {
    this.initializeTags();
  }

  private initializeTags(): void {
    // === Basic formatting labels ===
    
    // Bold
    this.addTag({
      name: 'b',
      openTag: '[b]',
      closeTag: '[/b]',
      allowNested: true,
      renderer: (content: string) => `<strong>${content}</strong>`
    });

    // Italic
    this.addTag({
      name: 'i',
      openTag: '[i]',
      closeTag: '[/i]',
      allowNested: true,
      renderer: (content: string) => `<em>${content}</em>`
    });

    // Underline
    this.addTag({
      name: 'u',
      openTag: '[u]',
      closeTag: '[/u]',
      allowNested: true,
      renderer: (content: string) => `<u>${content}</u>`
    });

    // Delete line - support [s] and [strike]
    this.addTag({
      name: 's',
      openTag: '[s]',
      closeTag: '[/s]',
      allowNested: true,
      renderer: (content: string) => `<del>${content}</del>`
    });

    this.addTag({
      name: 'strike',
      openTag: '[strike]',
      closeTag: '[/strike]',
      allowNested: true,
      renderer: (content: string) => `<del>${content}</del>`
    });

    // color - According to the official implementation
    this.addTag({
      name: 'color',
      openTag: '[color=',
      closeTag: '[/color]',
      hasParam: true,
      paramRequired: true,
      allowNested: true,
      validator: (param?: string) => {
        if (!param) return false;
        // supporthexadecimalcolorandHTMLcolorname
        const hexPattern = /^#[0-9A-Fa-f]{3,6}$/;
        const htmlColors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'white', 'gray', 'grey'];
        return hexPattern.test(param) || htmlColors.includes(param.toLowerCase());
      },
      renderer: (content: string, param?: string) => `<span style="color: ${param};">${content}</span>`
    });

    // Font size - According to official restrictions30-200%
    this.addTag({
      name: 'size',
      openTag: '[size=',
      closeTag: '[/size]',
      hasParam: true,
      paramRequired: true,
      allowNested: true,
      validator: (param?: string) => {
        if (!param) return false;
        const size = parseInt(param);
        return !isNaN(size) && size >= 30 && size <= 200;
      },
      renderer: (content: string, param?: string) => {
        const size = Math.min(Math.max(parseInt(param || '100'), 30), 200);
        return `<span style="font-size: ${size}%;">${content}</span>`;
      }
    });

    // === Block-level elements ===

    // Center
    this.addTag({
      name: 'centre',
      openTag: '[centre]',
      closeTag: '[/centre]',
      allowNested: true,
      isBlock: true,
      renderer: (content: string) => `<center>${content}</center>`
    });

    // title
    this.addTag({
      name: 'heading',
      openTag: '[heading]',
      closeTag: '[/heading]',
      allowNested: false,
      isBlock: true,
      renderer: (content: string) => `<h2>${content}</h2>`
    });

    // Notification box
    this.addTag({
      name: 'notice',
      openTag: '[notice]',
      closeTag: '[/notice]',
      allowNested: true,
      isBlock: true,
      renderer: (content: string) => `<div class="well">${content}</div>`
    });

    // Quote - According to the official implementation
    this.addTag({
      name: 'quote',
      openTag: '[quote',
      closeTag: '[/quote]',
      hasParam: true,
      paramRequired: false,
      allowNested: true,
      isBlock: true,
      renderer: (content: string, param?: string) => {
        if (param) {
          // Remove quotes
          const author = param.replace(/^="?|"?$/g, '');
          return `<blockquote><h4>${this.escapeHtml(author)} wrote:</h4>${content}</blockquote>`;
        }
        return `<blockquote>${content}</blockquote>`;
      }
    });

    // Code block
    this.addTag({
      name: 'code',
      openTag: '[code]',
      closeTag: '[/code]',
      allowNested: false,
      isBlock: true,
      renderer: (content: string) => `<pre>${this.escapeHtml(content)}</pre>`
    });

    // Inline code
    this.addTag({
      name: 'c',
      openTag: '[c]',
      closeTag: '[/c]',
      allowNested: false,
      renderer: (content: string) => `<code>${this.escapeHtml(content)}</code>`
    });

    // Folding frame/Spoiler box - According to the official implementation
    this.addTag({
      name: 'box',
      openTag: '[box',
      closeTag: '[/box]',
      hasParam: true,
      paramRequired: false,
      allowNested: true,
      isBlock: true,
      renderer: (content: string, param?: string) => {
        const title = param ? param.replace(/^=/, '') : 'SPOILER';
        return `<div class="js-spoilerbox bbcode-spoilerbox"><button type="button" class="js-spoilerbox__link bbcode-spoilerbox__link" style="background: none; border: none; cursor: pointer; padding: 0; text-align: left; width: 100%;"><span class="bbcode-spoilerbox__link-icon"></span>${this.escapeHtml(title)}</button><div class="js-spoilerbox__body bbcode-spoilerbox__body">${content}</div></div>`;
      }
    });

    this.addTag({
      name: 'spoilerbox',
      openTag: '[spoilerbox]',
      closeTag: '[/spoilerbox]',
      allowNested: true,
      isBlock: true,
      renderer: (content: string) => `<div class="js-spoilerbox bbcode-spoilerbox"><button type="button" class="js-spoilerbox__link bbcode-spoilerbox__link" style="background: none; border: none; cursor: pointer; padding: 0; text-align: left; width: 100%;"><span class="bbcode-spoilerbox__link-icon"></span>SPOILER</button><div class="js-spoilerbox__body bbcode-spoilerbox__body">${content}</div></div>`
    });

    // Spoiler strip (black)
    this.addTag({
      name: 'spoiler',
      openTag: '[spoiler]',
      closeTag: '[/spoiler]',
      allowNested: true,
      renderer: (content: string) => `<span class="spoiler">${content}</span>`
    });

    // List - According to the official implementation
    this.addTag({
      name: 'list',
      openTag: '[list',
      closeTag: '[/list]',
      hasParam: true,
      paramRequired: false,
      allowNested: true,
      isBlock: true,
      renderer: (content: string, param?: string) => {
        // deal withListitem
        const processedContent = content
          .replace(/^\s*\[?\*\]?\s*/gm, '') // Remove the beginning [*]
          .split(/\s*\[\*\]\s*/) // use [*] segmentation
          .filter(item => item.trim()) // Filter empty items
          .map(item => `<li>${item}</li>`)
          .join('');
        
        if (param && param !== '=') {
          // OrderlyList
          return `<ol>${processedContent}</ol>`;
        } else {
          // DisorderList
          return `<ol class="unordered">${processedContent}</ol>`;
        }
      }
    });

    // === Linkandmedia ===

    // URLLink
    this.addTag({
      name: 'url',
      openTag: '[url',
      closeTag: '[/url]',
      hasParam: true,
      paramRequired: false,
      allowNested: false,
      validator: (param?: string) => {
        if (!param) return true;
        const url = param.replace(/^=/, '');
        return /^https?:\/\/.+/.test(url);
      },
      renderer: (content: string, param?: string) => {
        const url = param ? param.replace(/^=/, '') : content;
        const displayText = param ? content : url;
        return `<a rel="nofollow" href="${this.escapeHtml(url)}">${this.escapeHtml(displayText)}</a>`;
      }
    });

    // Mail
    this.addTag({
      name: 'email',
      openTag: '[email',
      closeTag: '[/email]',
      hasParam: true,
      paramRequired: false,
      allowNested: false,
      validator: (param?: string, content?: string) => {
        const email = param ? param.replace(/^=/, '') : content;
        if (!email) return false;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      renderer: (content: string, param?: string) => {
        const email = param ? param.replace(/^=/, '') : content;
        const displayText = param ? content : email;
        return `<a rel="nofollow" href="mailto:${this.escapeHtml(email)}">${this.escapeHtml(displayText)}</a>`;
      }
    });

    // useHousehold informationLink
    this.addTag({
      name: 'profile',
      openTag: '[profile',
      closeTag: '[/profile]',
      hasParam: true,
      paramRequired: false,
      allowNested: false,
      validator: (param?: string) => {
        if (!param) return true;
        const userId = param.replace(/^=/, '');
        return /^\d+$/.test(userId);
      },
      renderer: (content: string, param?: string) => {
        if (param) {
          const userId = param.replace(/^=/, '');
          return `<a href="/users/${userId}" class="profile-link">${this.escapeHtml(content)}</a>`;
        } else {
          // If there are no parameters, assumingcontentyesusehouseholdname,needAnalysisforusehouseholdID
          return `<a href="/users/${this.escapeHtml(content)}" class="profile-link">${this.escapeHtml(content)}</a>`;
        }
      }
    });

    // picture
    this.addTag({
      name: 'img',
      openTag: '[img]',
      closeTag: '[/img]',
      allowNested: false,
      isBlock: true,
      validator: (_param?: string, content?: string) => {
        if (!content) return false;
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(content);
      },
      renderer: (content: string) => {
        return `<img alt="" src="${this.escapeHtml(content)}" loading="lazy" />`;
      }
    });

    // YouTubevideo
    this.addTag({
      name: 'youtube',
      openTag: '[youtube]',
      closeTag: '[/youtube]',
      allowNested: false,
      isBlock: true,
      validator: (_param?: string, content?: string) => {
        const videoId = content?.trim();
        return !!videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId);
      },
      renderer: (content: string) => {
        const videoId = content.trim();
        return `<iframe class="u-embed-wide u-embed-wide--bbcode" src="https://www.youtube.com/embed/${this.escapeHtml(videoId)}?rel=0" allowfullscreen></iframe>`;
      }
    });

    // Audio
    this.addTag({
      name: 'audio',
      openTag: '[audio]',
      closeTag: '[/audio]',
      allowNested: false,
      isBlock: true,
      validator: (_param?: string, content?: string) => {
        if (!content) return false;
        return /^https?:\/\/.+\.(mp3|wav|ogg|m4a)$/i.test(content);
      },
      renderer: (content: string) => {
        return `<audio controls preload="none" src="${this.escapeHtml(content)}"></audio>`;
      }
    });

    // pictureMapping
    this.addTag({
      name: 'imagemap',
      openTag: '[imagemap]',
      closeTag: '[/imagemap]',
      allowNested: false,
      isBlock: true,
      renderer: (content: string) => {
        return this.parseImagemap(content);
      }
    });
  }

  private addTag(tag: BBCodeTag): void {
    this.tags.set(tag.name, tag);
  }

  private escapeHtml(text: string): string {
    // Type Check
    if (typeof text !== 'string') {
      text = String(text || '');
    }
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Analysis [imagemap] Label
   * based on osu-web BBCodeFromDB.php Implementation
   */
  private parseImagemap(content: string): string {
    const lines = content.trim().split('\n');
    if (lines.length < 1) return '';

    const imageUrl = lines[0]?.trim();
    if (!imageUrl) return '';

    // If onlypictureURL,NoLinkData, return to originalBBCode(According to official logic)
    if (lines.length < 2) {
      return `[imagemap]${this.escapeHtml(imageUrl)}[/imagemap]`;
    }

    const linksData = lines.slice(1);
    const links: string[] = [];
    
    // AnalysisLinkdata
    for (const line of linksData) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // makeuseOfficial spacessegmentationLogic, mostsegmentation6Parts
      const parts = trimmedLine.split(' ');
      if (parts.length >= 5) {
        try {
          const left = parseFloat(parts[0]);
          const top = parseFloat(parts[1]);
          const width = parseFloat(parts[2]);
          const height = parseFloat(parts[3]);
          const href = parts[4];
          // The6and the subsequent partstitle(Remove it#prefix if it exists)
          let title = parts.length > 5 ? parts.slice(5).join(' ') : '';
          if (title.startsWith('#')) {
            title = title.substring(1).trim();
          }

          // Verify the value
          if (isNaN(left) || isNaN(top) || isNaN(width) || isNaN(height)) {
            continue;
          }

          // Build styles (by officialCSS)
          const style = `left:${left}%;top:${top}%;width:${width}%;height:${height}%;`;

          if (href === '#') {
            // noneLinkarea,makeusespan(Official practice)
            links.push(
              `<span class="imagemap__link" style="${style}" title="${this.escapeHtml(title)}"></span>`
            );
          } else {
            // haveLinkarea,makeuseaLabel(Official practice)
            const safeHref = this.escapeHtml(href);
            const safeTitle = this.escapeHtml(title);
            links.push(
              `<a class="imagemap__link" href="${safeHref}" style="${style}" title="${safeTitle}"></a>`
            );
          }
        } catch (error) {
          // neglectAnalysisThe wrong line
          continue;
        }
      }
    }

    // Getpicturedocumentnamedoforalt
    const imageUrlParts = imageUrl.split('/');
    const imageName = imageUrlParts[imageUrlParts.length - 1] || '';
    const altText = imageName.split('?')[0]; // Remove query parameters

    // BuildHTML(In official format)
    const imageHtml = `<img class="imagemap__image" loading="lazy" src="${this.escapeHtml(imageUrl)}" width="1280" height="720" alt="${this.escapeHtml(altText)}" />`;
    const linksHtml = links.join('');
    
    return `<div class="imagemap">${imageHtml}${linksHtml}</div>`;
  }

  /**
   * AnalysisBBCodeThe text isHTML
   */
  public parse(input: string): BBCodeParseResult {
    this.errors.length = 0;
    
    // Type Check:Make sure the input is a string
    if (typeof input !== 'string') {
      this.errors.push(`Analysismistake: The input must be a string, but received ${typeof input}`);
      return {
        html: `<div class="bbcode">Invalid input type</div>`,
        errors: [...this.errors],
        valid: false
      };
    }
    
    // Empty input check
    if (!input || input.trim() === '') {
      return {
        html: `<div class="bbcode"></div>`,
        errors: [],
        valid: true
      };
    }
    
    try {
      const html = this.parseRecursive(input);
      const wrappedHtml = `<div class="bbcode">${html}</div>`;
      return {
        html: wrappedHtml,
        errors: [...this.errors],
        valid: this.errors.length === 0
      };
    } catch (error) {
      this.errors.push(`Analysismistake: ${error}`);
      return {
        html: `<div class="bbcode">${this.escapeHtml(String(input))}</div>`,
        errors: [...this.errors],
        valid: false
      };
    }
  }

  private parseRecursive(input: string): string {
    // Type Check
    if (typeof input !== 'string') {
      return this.escapeHtml(String(input || ''));
    }
    
    let result = input;
    
    // In official orderdeal with:Firstdeal withBlock-level elements,Againdeal withInline elements
    
    // === Block-level elements ===
    const blockTags = ['imagemap', 'box', 'spoilerbox', 'code', 'list', 'notice', 'quote', 'heading'];
    for (const tagName of blockTags) {
      const tag = this.tags.get(tagName);
      if (tag) {
        result = this.processTag(result, tag);
      }
    }
    
    // === Inline elements ===
    const inlineTags = ['audio', 'b', 'centre', 'c', 'color', 'email', 'img', 'i', 'size', 'spoiler', 's', 'strike', 'u', 'url', 'youtube', 'profile'];
    for (const tagName of inlineTags) {
      const tag = this.tags.get(tagName);
      if (tag) {
        result = this.processTag(result, tag);
      }
    }
    
    // deal withautomaticLink(pureURLConvertforLink)- In allBBCodeAfter processing
    result = this.processAutoLinks(result);
    
    // Finally process newline
    result = result.replace(/\n/g, '<br />');
    
    return result;
  }

  private processAutoLinks(text: string): string {
    // Only in nonBBCodeLabelareadeal withautomaticLink
    const urlRegex = /(https?:\/\/[^\s\[\]<>"]+)/g;
    return text.replace(urlRegex, (match, url, offset) => {
      // examineURLIs it already thereBBCodeLabelmiddle
      const beforeMatch = text.substring(0, offset);
      const afterMatch = text.substring(offset + match.length);
      
      // SimpleexamineyesNoURLLabelmiddle
      if (beforeMatch.includes('[url') && afterMatch.includes('[/url]')) {
        return match;
      }
      
      // examineyesNootherLabelmiddle
      const openBrackets = (beforeMatch.match(/\[/g) || []).length;
      const closeBrackets = (beforeMatch.match(/\]/g) || []).length;
      
      // If it is not closedLabelmiddle,Nodeal with
      if (openBrackets > closeBrackets) {
        return match;
      }
      
      return `<a rel="nofollow" href="${this.escapeHtml(url)}">${this.escapeHtml(url)}</a>`;
    });
  }

  private processTag(text: string, tag: BBCodeTag): string {
    if (tag.hasParam) {
      return this.processTagWithParam(text, tag);
    } else {
      return this.processSimpleTag(text, tag);
    }
  }

  private processSimpleTag(text: string, tag: BBCodeTag): string {
    const openPattern = this.escapeRegex(tag.openTag);
    const closePattern = this.escapeRegex(tag.closeTag);
    const regex = new RegExp(`${openPattern}(.*?)${closePattern}`, 'gis');
    
    return text.replace(regex, (match, content) => {
      if (tag.validator && !tag.validator(undefined, content)) {
        this.errors.push(`Label [${tag.name}] Content verification failed`);
        return match;
      }
      
      const processedContent = tag.allowNested ? this.parseRecursive(content) : this.escapeHtml(content);
      return tag.renderer(processedContent);
    });
  }

  private processTagWithParam(text: string, tag: BBCodeTag): string {
    // deal withWith parametersLabel,like [color=red]text[/color] or [quote="author"]text[/quote]
    const patterns = [
      // [tag=param]content[/tag]
      new RegExp(`\\[${tag.name}=([^\\]]+)\\](.*?)\\[\\/${tag.name}\\]`, 'gis'),
      // [tag="param"]content[/tag]
      new RegExp(`\\[${tag.name}="([^"]+)"\\](.*?)\\[\\/${tag.name}\\]`, 'gis'),
    ];
    
    // If the parameters are notyesNecessary, toosupportnoneParameter form
    if (!tag.paramRequired) {
      patterns.push(new RegExp(`\\[${tag.name}\\](.*?)\\[\\/${tag.name}\\]`, 'gis'));
    }
    
    let result = text;
    
    for (const pattern of patterns) {
      result = result.replace(pattern, (match, param, content) => {
        // ifyesnoneParameter matching, content inTheA capture group
        if (!content) {
          content = param;
          param = undefined;
        }
        
        if (tag.validator && !tag.validator(param, content)) {
          this.errors.push(`Label [${tag.name}] Parameter verification failed: ${param}`);
          return match;
        }
        
        const processedContent = tag.allowNested ? this.parseRecursive(content) : this.escapeHtml(content);
        return tag.renderer(processedContent, param);
      });
    }
    
    return result;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// Create a globalAnalysisDevice example
export const bbcodeParser = new BBCodeParser();

// Convenient functions
export function parseBBCode(input: string | any): BBCodeParseResult {
  // Make sure the input is a string
  if (typeof input !== 'string') {
    console.warn('parseBBCode: The input is not a string type, try to convert', { input, type: typeof input });
    // Try to convert to string
    if (input === null || input === undefined) {
      input = '';
    } else {
      input = String(input);
    }
  }
  
  return bbcodeParser.parse(input);
}