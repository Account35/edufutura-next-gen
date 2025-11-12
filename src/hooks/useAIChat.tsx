import { useState } from 'react';

interface ChatContext {
  subjectName?: string;
  chapterTitle?: string;
  chapterNumber?: number;
  grade?: number;
}

export const useAIChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState<ChatContext>({});

  const openChat = (newContext?: ChatContext) => {
    if (newContext) {
      setContext(newContext);
    }
    setIsOpen(true);
  };

  const closeChat = () => {
    setIsOpen(false);
  };

  return {
    isOpen,
    context,
    openChat,
    closeChat,
  };
};
