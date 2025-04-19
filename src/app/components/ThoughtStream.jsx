import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FiCopy, FiX } from 'react-icons/fi';

/**
 * ThoughtStream component displays the expanded content from a selected card
 * Enhanced for browser usage
 */
const ThoughtStream = ({
  section,
  content,
  isLoading,
  onClose,
  onCopy,
  persona
}) => {
  const [disableAutoScroll, setDisableAutoScroll] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [lastScrollTop, setLastScrollTop] = useState(0);
  const contentRef = useRef(null);
  const headerRef = useRef(null);

  const getTitle = () => {
    switch (section) {
      case 'expansion': return 'Expansion';
      case 'contrarian': return 'Contrarian Take';
      case 'synapse': return 'Synapse Link';
      case 'deeper': return 'Deeper Analysis';
      default: return 'Thought Stream';
    }
  };

  // Handle scroll events
  const handleScroll = () => {
    if (contentRef.current) {
      // Disable auto-scroll on manual scroll during loading/streaming
      if (isLoading && !disableAutoScroll) {
         const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
         if (scrollHeight - scrollTop > clientHeight + 50) {
            console.log("Manual scroll detected during streaming, disabling auto-scroll.");
            setDisableAutoScroll(true);
         }
      }

      // Handle sticky header visibility
      const st = contentRef.current.scrollTop;
      const threshold = 10;
      if (Math.abs(st - lastScrollTop) > threshold) {
        setHeaderVisible(st < lastScrollTop || st < 50);
        setLastScrollTop(st);
      }
    }
  };

  // Auto-scroll to bottom for streaming content
  useEffect(() => {
    // Reset auto-scroll disabling when loading starts
    if (isLoading) {
        setDisableAutoScroll(false);
    }
  }, [isLoading]);

  useEffect(() => {
    if (contentRef.current && isLoading && !disableAutoScroll) {
      // Keep scrolling to bottom only if loading and auto-scroll is enabled
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, isLoading, disableAutoScroll]);

  // Custom renderers for markdown
  const renderersConfig = {
    h1: ({ node, ...props }) => <h1 className="markdown-h1" {...props} />,
    h2: ({ node, ...props }) => <h2 className="markdown-h2" {...props} />,
    h3: ({ node, ...props }) => <h3 className="markdown-h3" {...props} />,
    h4: ({ node, ...props }) => <h4 className="markdown-h4" {...props} />,
    p: ({ node, ...props }) => <p className="markdown-p" {...props} />,
    ul: ({ node, ...props }) => <ul className="markdown-ul" {...props} />,
    ol: ({ node, ...props }) => <ol className="markdown-ol" {...props} />,
    li: ({ node, ...props }) => <li className="markdown-li" {...props} />,
    blockquote: ({ node, ...props }) => <blockquote className="markdown-blockquote" {...props} />,
    code: ({ node, inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      return !inline ? (
        <div className="markdown-code-block">
          <pre className={match ? `language-${match[1]}` : ''}>
            <code className={className} {...props}>
              {children}
            </code>
          </pre>
        </div>
      ) : (
        <code className="markdown-inline-code" {...props}>
          {children}
        </code>
      );
    },
    table: ({ node, ...props }) => <table className="markdown-table" {...props} />,
    thead: ({ node, ...props }) => <thead className="markdown-thead" {...props} />,
    tbody: ({ node, ...props }) => <tbody className="markdown-tbody" {...props} />,
    tr: ({ node, ...props }) => <tr className="markdown-tr" {...props} />,
    th: ({ node, ...props }) => <th className="markdown-th" {...props} />,
    td: ({ node, ...props }) => <td className="markdown-td" {...props} />
  };

  return (
    <>
      {/* Sticky header */}
      <div
        ref={headerRef}
        className={`stream-header ${headerVisible ? 'sticky-visible' : 'sticky-hidden'}`}
      >
        <h3>
          {persona && <span className="persona-icon">{persona.icon}</span>}
          {getTitle()}
        </h3>
        <div className="stream-actions">
          <button className="copy-button" onClick={() => onCopy(content)} aria-label="Copy content" title="Copy content">
            <FiCopy size="16"/>
          </button>
          <button className="close-button" onClick={onClose} aria-label="Close expanded view" title="Close view">
            <FiX size="16"/>
          </button>
        </div>
      </div>

      <div
        className="stream-content markdown-content"
        ref={contentRef}
        onScroll={handleScroll}
      >
        {/* Display content or loading indicator */}
        {(content || isLoading) ? (
            <div className="markdown-wrapper">
                <ReactMarkdown
                    children={content || ''}
                    remarkPlugins={[remarkGfm]}
                    components={renderersConfig}
                />
                {/* Blinking cursor shown only during loading */}
                {isLoading && <span className="blinking-cursor"></span>}
            </div>
        ) : (
             <div className="loading-indicator">
                 <p>No content available.</p>
             </div>
        )}
      </div>
    </>
  );
};

export default ThoughtStream;