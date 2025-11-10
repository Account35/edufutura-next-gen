import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface ChapterSidebarProps {
  content: string;
}

export const ChapterSidebar = ({ content }: ChapterSidebarProps) => {
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    // Parse headings from content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    const headings = tempDiv.querySelectorAll('h2, h3, h4');
    const tocItems: TocItem[] = [];
    
    headings.forEach((heading, index) => {
      const id = `heading-${index}`;
      const text = heading.textContent || '';
      const level = parseInt(heading.tagName.substring(1));
      
      tocItems.push({ id, text, level });
    });
    
    setToc(tocItems);
  }, [content]);

  useEffect(() => {
    // Intersection observer for active section
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );

    // Observe all headings in the content
    const headings = document.querySelectorAll('[id^="heading-"]');
    headings.forEach((heading) => observer.observe(heading));

    return () => observer.disconnect();
  }, [toc]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (toc.length === 0) return null;

  return (
    <aside className="hidden lg:block sticky top-24 w-64 max-h-[80vh] overflow-y-auto">
      <div className="bg-background rounded-xl border border-border p-6">
        <h3 className="font-semibold text-base text-primary mb-4">Contents</h3>
        <nav>
          <ul className="space-y-2">
            {toc.map((item) => (
              <li
                key={item.id}
                style={{ paddingLeft: `${(item.level - 2) * 12}px` }}
              >
                <button
                  onClick={() => scrollToSection(item.id)}
                  className={cn(
                    'text-sm text-left hover:text-secondary transition-colors w-full',
                    activeId === item.id ? 'text-secondary font-medium' : 'text-muted-foreground'
                  )}
                >
                  {item.text}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
};
