import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import DOMPurify from 'dompurify';

interface ChapterContentRendererProps {
  content: string;
  isMarkdown?: boolean;
}

export const ChapterContentRenderer = ({ 
  content, 
  isMarkdown = false 
}: ChapterContentRendererProps) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentRef.current) return;

    // Add IDs to headings for TOC linking
    const headings = contentRef.current.querySelectorAll('h2, h3, h4');
    headings.forEach((heading, index) => {
      heading.id = `heading-${index}`;
    });
  }, [content]);

  if (isMarkdown) {
    return (
      <div ref={contentRef} className="prose prose-lg max-w-none">
        <ReactMarkdown
          components={{
            h2: ({ children }) => (
              <h2 className="font-serif text-3xl font-bold text-primary mb-4 mt-8">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="font-serif text-2xl font-bold text-primary mb-3 mt-6">
                {children}
              </h3>
            ),
            h4: ({ children }) => (
              <h4 className="font-serif text-xl font-bold text-primary mb-2 mt-4">
                {children}
              </h4>
            ),
            p: ({ children }) => (
              <p className="text-lg leading-relaxed text-foreground mb-4">
                {children}
              </p>
            ),
            ul: ({ children }) => (
              <ul className="space-y-2 mb-4 list-disc list-inside marker:text-secondary">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="space-y-2 mb-4 list-decimal list-inside marker:text-secondary">
                {children}
              </ol>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-secondary bg-muted p-4 italic my-4">
                {children}
              </blockquote>
            ),
            img: ({ src, alt }) => (
              <img
                src={src}
                alt={alt}
                className="max-w-full h-auto rounded-lg shadow-md my-4"
                loading="lazy"
              />
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  }

  // Render as HTML with sanitization
  const sanitizedContent = DOMPurify.sanitize(content, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'],
  });

  return (
    <div
      ref={contentRef}
      className="prose prose-lg max-w-none
        prose-headings:font-serif prose-headings:text-primary
        prose-h2:text-3xl prose-h2:mb-4 prose-h2:mt-8
        prose-h3:text-2xl prose-h3:mb-3 prose-h3:mt-6
        prose-h4:text-xl prose-h4:mb-2 prose-h4:mt-4
        prose-p:text-lg prose-p:leading-relaxed prose-p:text-foreground prose-p:mb-4
        prose-ul:marker:text-secondary prose-ol:marker:text-secondary
        prose-blockquote:border-l-4 prose-blockquote:border-secondary
        prose-blockquote:bg-muted prose-blockquote:p-4 prose-blockquote:italic
        prose-img:rounded-lg prose-img:shadow-md prose-img:max-w-full"
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
};
