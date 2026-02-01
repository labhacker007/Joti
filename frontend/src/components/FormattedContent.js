import React from 'react';
import { Typography, Divider } from 'antd';
import './FormattedContent.css';

const { Title, Text, Paragraph } = Typography;

/**
 * FormattedContent - A reusable component for rendering markdown-style content
 * Properly formats headings, lists, paragraphs, code blocks, and more
 * Compatible with Word, PDF export formats and HTML browser viewing
 */
const FormattedContent = ({ content, className = '' }) => {
  if (!content) {
    return <Text type="secondary">No content available.</Text>;
  }

  // Parse and render content with proper formatting
  const renderContent = (text) => {
    const lines = text.split('\n');
    const elements = [];
    let listItems = [];
    let listType = null; // 'ul' or 'ol'
    let codeBlock = [];
    let inCodeBlock = false;
    let codeLanguage = '';

    const flushList = () => {
      if (listItems.length > 0) {
        if (listType === 'ol') {
          elements.push(
            <ol key={`ol-${elements.length}`} className="formatted-list ordered">
              {listItems.map((item, i) => (
                <li key={i}>{renderInlineFormatting(item)}</li>
              ))}
            </ol>
          );
        } else {
          elements.push(
            <ul key={`ul-${elements.length}`} className="formatted-list unordered">
              {listItems.map((item, i) => (
                <li key={i}>{renderInlineFormatting(item)}</li>
              ))}
            </ul>
          );
        }
        listItems = [];
        listType = null;
      }
    };

    const flushCodeBlock = () => {
      if (codeBlock.length > 0) {
        elements.push(
          <pre key={`code-${elements.length}`} className="formatted-code-block">
            <code className={codeLanguage ? `language-${codeLanguage}` : ''}>
              {codeBlock.join('\n')}
            </code>
          </pre>
        );
        codeBlock = [];
        codeLanguage = '';
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Handle code blocks
      if (trimmedLine.startsWith('```')) {
        if (inCodeBlock) {
          flushCodeBlock();
          inCodeBlock = false;
        } else {
          flushList();
          inCodeBlock = true;
          codeLanguage = trimmedLine.slice(3).trim();
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlock.push(line);
        continue;
      }

      // Handle horizontal rules
      if (trimmedLine === '---' || trimmedLine === '***' || trimmedLine === '___') {
        flushList();
        elements.push(<Divider key={`divider-${i}`} />);
        continue;
      }

      // Handle headings
      if (trimmedLine.startsWith('# ')) {
        flushList();
        elements.push(
          <Title key={`h1-${i}`} level={2} className="formatted-heading h1">
            {renderInlineFormatting(trimmedLine.slice(2))}
          </Title>
        );
        continue;
      }
      if (trimmedLine.startsWith('## ')) {
        flushList();
        elements.push(
          <Title key={`h2-${i}`} level={3} className="formatted-heading h2">
            {renderInlineFormatting(trimmedLine.slice(3))}
          </Title>
        );
        continue;
      }
      if (trimmedLine.startsWith('### ')) {
        flushList();
        elements.push(
          <Title key={`h3-${i}`} level={4} className="formatted-heading h3">
            {renderInlineFormatting(trimmedLine.slice(4))}
          </Title>
        );
        continue;
      }
      if (trimmedLine.startsWith('#### ')) {
        flushList();
        elements.push(
          <Title key={`h4-${i}`} level={5} className="formatted-heading h4">
            {renderInlineFormatting(trimmedLine.slice(5))}
          </Title>
        );
        continue;
      }

      // Handle unordered list items
      if (trimmedLine.match(/^[-*+]\s+/)) {
        if (listType === 'ol') {
          flushList();
        }
        listType = 'ul';
        listItems.push(trimmedLine.replace(/^[-*+]\s+/, ''));
        continue;
      }

      // Handle ordered list items
      if (trimmedLine.match(/^\d+\.\s+/)) {
        if (listType === 'ul') {
          flushList();
        }
        listType = 'ol';
        listItems.push(trimmedLine.replace(/^\d+\.\s+/, ''));
        continue;
      }

      // Handle blockquotes
      if (trimmedLine.startsWith('> ')) {
        flushList();
        elements.push(
          <blockquote key={`quote-${i}`} className="formatted-blockquote">
            {renderInlineFormatting(trimmedLine.slice(2))}
          </blockquote>
        );
        continue;
      }

      // Handle empty lines
      if (trimmedLine === '') {
        flushList();
        continue;
      }

      // Handle regular paragraphs
      flushList();
      elements.push(
        <Paragraph key={`p-${i}`} className="formatted-paragraph">
          {renderInlineFormatting(trimmedLine)}
        </Paragraph>
      );
    }

    // Flush any remaining items
    flushList();
    if (inCodeBlock) {
      flushCodeBlock();
    }

    return elements;
  };

  // Handle inline formatting (bold, italic, code, links)
  const renderInlineFormatting = (text) => {
    if (!text) return text;

    // Process inline elements
    const parts = [];
    let remaining = text;
    let key = 0;

    // Regular expressions for inline formatting
    const patterns = [
      { regex: /\*\*([^*]+)\*\*/g, render: (match, p1) => <strong key={key++}>{p1}</strong> },
      { regex: /\*([^*]+)\*/g, render: (match, p1) => <em key={key++}>{p1}</em> },
      { regex: /__([^_]+)__/g, render: (match, p1) => <strong key={key++}>{p1}</strong> },
      { regex: /_([^_]+)_/g, render: (match, p1) => <em key={key++}>{p1}</em> },
      { regex: /`([^`]+)`/g, render: (match, p1) => <code key={key++} className="formatted-inline-code">{p1}</code> },
      { regex: /\[([^\]]+)\]\(([^)]+)\)/g, render: (match, p1, p2) => <a key={key++} href={p2} target="_blank" rel="noopener noreferrer">{p1}</a> },
    ];

    // Simple approach: replace patterns one at a time
    let processedText = text;
    const replacements = [];

    // Find all matches first
    patterns.forEach(({ regex, render }) => {
      let match;
      const re = new RegExp(regex.source, 'g');
      while ((match = re.exec(text)) !== null) {
        replacements.push({
          start: match.index,
          end: match.index + match[0].length,
          original: match[0],
          element: render(match[0], match[1], match[2]),
        });
      }
    });

    // Sort by position
    replacements.sort((a, b) => a.start - b.start);

    // Build result
    const result = [];
    let lastEnd = 0;

    replacements.forEach((r) => {
      if (r.start >= lastEnd) {
        if (r.start > lastEnd) {
          result.push(text.slice(lastEnd, r.start));
        }
        result.push(r.element);
        lastEnd = r.end;
      }
    });

    if (lastEnd < text.length) {
      result.push(text.slice(lastEnd));
    }

    return result.length > 0 ? result : text;
  };

  return (
    <div className={`formatted-content ${className}`}>
      {renderContent(content)}
    </div>
  );
};

/**
 * Generate HTML string from content for export/browser viewing
 */
export const generateHTML = (content, title = 'Report') => {
  if (!content) return '';

  const processContent = (text) => {
    let html = text;

    // Escape HTML entities first
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Process line by line
    const lines = html.split('\n');
    const processedLines = [];
    let inList = false;
    let listType = '';
    let inCodeBlock = false;

    lines.forEach((line) => {
      const trimmed = line.trim();

      // Code blocks
      if (trimmed.startsWith('```')) {
        if (inCodeBlock) {
          processedLines.push('</code></pre>');
          inCodeBlock = false;
        } else {
          if (inList) {
            processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
            inList = false;
          }
          processedLines.push('<pre class="code-block"><code>');
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        processedLines.push(line);
        return;
      }

      // Horizontal rules
      if (trimmed === '---' || trimmed === '***') {
        if (inList) {
          processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
          inList = false;
        }
        processedLines.push('<hr />');
        return;
      }

      // Headings
      if (trimmed.startsWith('#### ')) {
        if (inList) { processedLines.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
        processedLines.push(`<h4>${processInline(trimmed.slice(5))}</h4>`);
        return;
      }
      if (trimmed.startsWith('### ')) {
        if (inList) { processedLines.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
        processedLines.push(`<h3>${processInline(trimmed.slice(4))}</h3>`);
        return;
      }
      if (trimmed.startsWith('## ')) {
        if (inList) { processedLines.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
        processedLines.push(`<h2>${processInline(trimmed.slice(3))}</h2>`);
        return;
      }
      if (trimmed.startsWith('# ')) {
        if (inList) { processedLines.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
        processedLines.push(`<h1>${processInline(trimmed.slice(2))}</h1>`);
        return;
      }

      // Lists
      if (trimmed.match(/^[-*+]\s+/)) {
        if (!inList || listType !== 'ul') {
          if (inList) processedLines.push('</ol>');
          processedLines.push('<ul>');
          inList = true;
          listType = 'ul';
        }
        processedLines.push(`<li>${processInline(trimmed.replace(/^[-*+]\s+/, ''))}</li>`);
        return;
      }
      if (trimmed.match(/^\d+\.\s+/)) {
        if (!inList || listType !== 'ol') {
          if (inList) processedLines.push('</ul>');
          processedLines.push('<ol>');
          inList = true;
          listType = 'ol';
        }
        processedLines.push(`<li>${processInline(trimmed.replace(/^\d+\.\s+/, ''))}</li>`);
        return;
      }

      // Blockquotes
      if (trimmed.startsWith('&gt; ')) {
        if (inList) { processedLines.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
        processedLines.push(`<blockquote>${processInline(trimmed.slice(5))}</blockquote>`);
        return;
      }

      // Empty lines
      if (trimmed === '') {
        if (inList) {
          processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
          inList = false;
        }
        return;
      }

      // Regular paragraphs
      if (inList) {
        processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
        inList = false;
      }
      processedLines.push(`<p>${processInline(trimmed)}</p>`);
    });

    if (inList) {
      processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
    }

    return processedLines.join('\n');
  };

  const processInline = (text) => {
    return text
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      .replace(/_([^_]+)_/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #fafafa;
    }
    .report-container {
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 {
      color: #1a1a2e;
      font-size: 28px;
      border-bottom: 3px solid #1890ff;
      padding-bottom: 12px;
      margin-bottom: 24px;
    }
    h2 {
      color: #16213e;
      font-size: 22px;
      margin-top: 32px;
      margin-bottom: 16px;
      border-bottom: 1px solid #e8e8e8;
      padding-bottom: 8px;
    }
    h3 {
      color: #0f3460;
      font-size: 18px;
      margin-top: 24px;
      margin-bottom: 12px;
    }
    h4 {
      color: #333;
      font-size: 16px;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    p {
      margin-bottom: 12px;
      text-align: justify;
    }
    ul, ol {
      margin: 12px 0;
      padding-left: 24px;
    }
    li {
      margin-bottom: 6px;
    }
    blockquote {
      border-left: 4px solid #1890ff;
      margin: 16px 0;
      padding: 12px 20px;
      background: #f6f8fa;
      color: #555;
      font-style: italic;
    }
    code {
      background: #f0f0f0;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 0.9em;
      color: #d63384;
    }
    .code-block {
      background: #282c34;
      color: #abb2bf;
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 16px 0;
    }
    .code-block code {
      background: transparent;
      color: inherit;
      padding: 0;
    }
    hr {
      border: none;
      border-top: 1px solid #e8e8e8;
      margin: 24px 0;
    }
    a {
      color: #1890ff;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    strong {
      color: #1a1a2e;
    }
    .meta-info {
      background: #f6f8fa;
      padding: 16px;
      border-radius: 6px;
      margin-bottom: 24px;
      font-size: 14px;
      color: #666;
    }
    .meta-info span {
      margin-right: 24px;
    }
    .meta-info strong {
      color: #333;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .report-container {
        box-shadow: none;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <h1>${title}</h1>
    <div class="meta-info">
      <span><strong>Generated:</strong> ${new Date().toLocaleString()}</span>
    </div>
    ${processContent(content)}
  </div>
</body>
</html>`;
};

export default FormattedContent;
