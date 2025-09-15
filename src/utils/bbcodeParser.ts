/**
 * BBCode Parser for osu! style BBCode
 * 基于官方osu-web BBCodeFromDB.php实现，确保输出与官方网站一致
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
  isBlock?: boolean;  // 标记是否为块级元素
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
    // === 基础格式化标签 ===
    
    // 粗体
    this.addTag({
      name: 'b',
      openTag: '[b]',
      closeTag: '[/b]',
      allowNested: true,
      renderer: (content: string) => `<strong>${content}</strong>`
    });

    // 斜体
    this.addTag({
      name: 'i',
      openTag: '[i]',
      closeTag: '[/i]',
      allowNested: true,
      renderer: (content: string) => `<em>${content}</em>`
    });

    // 下划线
    this.addTag({
      name: 'u',
      openTag: '[u]',
      closeTag: '[/u]',
      allowNested: true,
      renderer: (content: string) => `<u>${content}</u>`
    });

    // 删除线 - 支持 [s] 和 [strike]
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

    // 颜色 - 按官方实现
    this.addTag({
      name: 'color',
      openTag: '[color=',
      closeTag: '[/color]',
      hasParam: true,
      paramRequired: true,
      allowNested: true,
      validator: (param?: string) => {
        if (!param) return false;
        // 支持十六进制颜色和HTML颜色名
        const hexPattern = /^#[0-9A-Fa-f]{3,6}$/;
        const htmlColors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'white', 'gray', 'grey'];
        return hexPattern.test(param) || htmlColors.includes(param.toLowerCase());
      },
      renderer: (content: string, param?: string) => `<span style="color: ${param};">${content}</span>`
    });

    // 字体大小 - 按官方限制在30-200%
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

    // === 块级元素 ===

    // 居中
    this.addTag({
      name: 'centre',
      openTag: '[centre]',
      closeTag: '[/centre]',
      allowNested: true,
      isBlock: true,
      renderer: (content: string) => `<center>${content}</center>`
    });

    // 标题
    this.addTag({
      name: 'heading',
      openTag: '[heading]',
      closeTag: '[/heading]',
      allowNested: false,
      isBlock: true,
      renderer: (content: string) => `<h2>${content}</h2>`
    });

    // 通知框
    this.addTag({
      name: 'notice',
      openTag: '[notice]',
      closeTag: '[/notice]',
      allowNested: true,
      isBlock: true,
      renderer: (content: string) => `<div class="well">${content}</div>`
    });

    // 引用 - 按官方实现
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
          // 去掉引号
          const author = param.replace(/^="?|"?$/g, '');
          return `<blockquote><h4>${this.escapeHtml(author)} wrote:</h4>${content}</blockquote>`;
        }
        return `<blockquote>${content}</blockquote>`;
      }
    });

    // 代码块
    this.addTag({
      name: 'code',
      openTag: '[code]',
      closeTag: '[/code]',
      allowNested: false,
      isBlock: true,
      renderer: (content: string) => `<pre>${this.escapeHtml(content)}</pre>`
    });

    // 行内代码
    this.addTag({
      name: 'c',
      openTag: '[c]',
      closeTag: '[/c]',
      allowNested: false,
      renderer: (content: string) => `<code>${this.escapeHtml(content)}</code>`
    });

    // 折叠框/剧透框 - 按官方实现
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

    // 剧透条（涂黑）
    this.addTag({
      name: 'spoiler',
      openTag: '[spoiler]',
      closeTag: '[/spoiler]',
      allowNested: true,
      renderer: (content: string) => `<span class="spoiler">${content}</span>`
    });

    // 列表 - 按官方实现
    this.addTag({
      name: 'list',
      openTag: '[list',
      closeTag: '[/list]',
      hasParam: true,
      paramRequired: false,
      allowNested: true,
      isBlock: true,
      renderer: (content: string, param?: string) => {
        // 处理列表项
        const processedContent = content
          .replace(/^\s*\[?\*\]?\s*/gm, '') // 移除开头的 [*]
          .split(/\s*\[\*\]\s*/) // 用 [*] 分割
          .filter(item => item.trim()) // 过滤空项
          .map(item => `<li>${item}</li>`)
          .join('');
        
        if (param && param !== '=') {
          // 有序列表
          return `<ol>${processedContent}</ol>`;
        } else {
          // 无序列表
          return `<ol class="unordered">${processedContent}</ol>`;
        }
      }
    });

    // === 链接和媒体 ===

    // URL链接
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

    // 邮箱
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

    // 用户资料链接
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
          // 如果没有参数，假设content是用户名，需要解析为用户ID
          return `<a href="/users/${this.escapeHtml(content)}" class="profile-link">${this.escapeHtml(content)}</a>`;
        }
      }
    });

    // 图片
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

    // YouTube视频
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

    // 音频
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

    // 图片映射
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
    // 类型检查
    if (typeof text !== 'string') {
      text = String(text || '');
    }
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 解析 [imagemap] 标签
   * 基于 osu-web BBCodeFromDB.php 的实现
   */
  private parseImagemap(content: string): string {
    const lines = content.trim().split('\n');
    if (lines.length < 1) return '';

    const imageUrl = lines[0]?.trim();
    if (!imageUrl) return '';

    // 如果只有图片URL，没有链接数据，返回原始BBCode（按官方逻辑）
    if (lines.length < 2) {
      return `[imagemap]${this.escapeHtml(imageUrl)}[/imagemap]`;
    }

    const linksData = lines.slice(1);
    const links: string[] = [];
    
    // 解析链接数据
    for (const line of linksData) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // 使用官方的空格分割逻辑，最多分割6个部分
      const parts = trimmedLine.split(' ');
      if (parts.length >= 5) {
        try {
          const left = parseFloat(parts[0]);
          const top = parseFloat(parts[1]);
          const width = parseFloat(parts[2]);
          const height = parseFloat(parts[3]);
          const href = parts[4];
          // 第6个及之后的部分作为title（去掉#前缀如果存在）
          let title = parts.length > 5 ? parts.slice(5).join(' ') : '';
          if (title.startsWith('#')) {
            title = title.substring(1).trim();
          }

          // 验证数值
          if (isNaN(left) || isNaN(top) || isNaN(width) || isNaN(height)) {
            continue;
          }

          // 构建样式（按官方CSS）
          const style = `left:${left}%;top:${top}%;width:${width}%;height:${height}%;`;

          if (href === '#') {
            // 无链接区域，使用span（官方做法）
            links.push(
              `<span class="imagemap__link" style="${style}" title="${this.escapeHtml(title)}"></span>`
            );
          } else {
            // 有链接区域，使用a标签（官方做法）
            const safeHref = this.escapeHtml(href);
            const safeTitle = this.escapeHtml(title);
            links.push(
              `<a class="imagemap__link" href="${safeHref}" style="${style}" title="${safeTitle}"></a>`
            );
          }
        } catch (error) {
          // 忽略解析错误的行
          continue;
        }
      }
    }

    // 获取图片文件名作为alt
    const imageUrlParts = imageUrl.split('/');
    const imageName = imageUrlParts[imageUrlParts.length - 1] || '';
    const altText = imageName.split('?')[0]; // 去掉查询参数

    // 构建HTML（按官方格式）
    const imageHtml = `<img class="imagemap__image" loading="lazy" src="${this.escapeHtml(imageUrl)}" width="1280" height="720" alt="${this.escapeHtml(altText)}" />`;
    const linksHtml = links.join('');
    
    return `<div class="imagemap">${imageHtml}${linksHtml}</div>`;
  }

  /**
   * 解析BBCode文本为HTML
   */
  public parse(input: string): BBCodeParseResult {
    this.errors.length = 0;
    
    // 类型检查：确保输入是字符串
    if (typeof input !== 'string') {
      this.errors.push(`解析错误: 输入必须是字符串，但收到了 ${typeof input}`);
      return {
        html: `<div class="bbcode">无效的输入类型</div>`,
        errors: [...this.errors],
        valid: false
      };
    }
    
    // 空输入检查
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
      this.errors.push(`解析错误: ${error}`);
      return {
        html: `<div class="bbcode">${this.escapeHtml(String(input))}</div>`,
        errors: [...this.errors],
        valid: false
      };
    }
  }

  private parseRecursive(input: string): string {
    // 类型检查
    if (typeof input !== 'string') {
      return this.escapeHtml(String(input || ''));
    }
    
    let result = input;
    
    // 按官方顺序处理：先处理块级元素，再处理内联元素
    
    // === 块级元素 ===
    const blockTags = ['imagemap', 'box', 'spoilerbox', 'code', 'list', 'notice', 'quote', 'heading'];
    for (const tagName of blockTags) {
      const tag = this.tags.get(tagName);
      if (tag) {
        result = this.processTag(result, tag);
      }
    }
    
    // === 内联元素 ===
    const inlineTags = ['audio', 'b', 'centre', 'c', 'color', 'email', 'img', 'i', 'size', 'spoiler', 's', 'strike', 'u', 'url', 'youtube', 'profile'];
    for (const tagName of inlineTags) {
      const tag = this.tags.get(tagName);
      if (tag) {
        result = this.processTag(result, tag);
      }
    }
    
    // 处理自动链接（纯URL转换为链接）- 在所有BBCode处理之后
    result = this.processAutoLinks(result);
    
    // 最后处理换行
    result = result.replace(/\n/g, '<br />');
    
    return result;
  }

  private processAutoLinks(text: string): string {
    // 只在非BBCode标签区域处理自动链接
    const urlRegex = /(https?:\/\/[^\s\[\]<>"]+)/g;
    return text.replace(urlRegex, (match, url, offset) => {
      // 检查URL是否已经在BBCode标签中
      const beforeMatch = text.substring(0, offset);
      const afterMatch = text.substring(offset + match.length);
      
      // 简单检查是否在URL标签中
      if (beforeMatch.includes('[url') && afterMatch.includes('[/url]')) {
        return match;
      }
      
      // 检查是否在其他标签中
      const openBrackets = (beforeMatch.match(/\[/g) || []).length;
      const closeBrackets = (beforeMatch.match(/\]/g) || []).length;
      
      // 如果在未闭合的标签中，不处理
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
        this.errors.push(`标签 [${tag.name}] 的内容验证失败`);
        return match;
      }
      
      const processedContent = tag.allowNested ? this.parseRecursive(content) : this.escapeHtml(content);
      return tag.renderer(processedContent);
    });
  }

  private processTagWithParam(text: string, tag: BBCodeTag): string {
    // 处理带参数的标签，如 [color=red]text[/color] 或 [quote="author"]text[/quote]
    const patterns = [
      // [tag=param]content[/tag]
      new RegExp(`\\[${tag.name}=([^\\]]+)\\](.*?)\\[\\/${tag.name}\\]`, 'gis'),
      // [tag="param"]content[/tag]
      new RegExp(`\\[${tag.name}="([^"]+)"\\](.*?)\\[\\/${tag.name}\\]`, 'gis'),
    ];
    
    // 如果参数不是必需的，也支持无参数形式
    if (!tag.paramRequired) {
      patterns.push(new RegExp(`\\[${tag.name}\\](.*?)\\[\\/${tag.name}\\]`, 'gis'));
    }
    
    let result = text;
    
    for (const pattern of patterns) {
      result = result.replace(pattern, (match, param, content) => {
        // 如果是无参数匹配，内容在第一个捕获组
        if (!content) {
          content = param;
          param = undefined;
        }
        
        if (tag.validator && !tag.validator(param, content)) {
          this.errors.push(`标签 [${tag.name}] 的参数验证失败: ${param}`);
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

// 创建全局解析器实例
export const bbcodeParser = new BBCodeParser();

// 便捷函数
export function parseBBCode(input: string | any): BBCodeParseResult {
  // 确保输入是字符串
  if (typeof input !== 'string') {
    console.warn('parseBBCode: 输入不是字符串类型，尝试转换', { input, type: typeof input });
    // 尝试转换为字符串
    if (input === null || input === undefined) {
      input = '';
    } else {
      input = String(input);
    }
  }
  
  return bbcodeParser.parse(input);
}