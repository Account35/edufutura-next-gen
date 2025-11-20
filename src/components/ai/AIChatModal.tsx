import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Mic, ArrowDown, Crown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useCareerContext } from '@/hooks/useCareerContext';

interface AIChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  context?: {
    subjectName?: string;
    chapterTitle?: string;
    chapterNumber?: number;
    grade?: number;
  };
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export const AIChatModal = ({ isOpen, onClose, context }: AIChatModalProps) => {
  const { user, userProfile } = useAuth();
  const { isPremium } = useSubscription();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [questionsToday, setQuestionsToday] = useState(0);
  const [voiceMode, setVoiceMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: careerContext } = useCareerContext(user?.id);

  const DAILY_FREE_LIMIT = 3;

  // Load conversation history and today's question count
  useEffect(() => {
    if (isOpen && user) {
      loadConversationHistory();
      loadTodayQuestionCount();
    }
  }, [isOpen, user]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Handle scroll position for scroll-to-bottom button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const loadConversationHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select(`
          id,
          ai_messages (
            id,
            role,
            message_text,
            created_at
          )
        `)
        .eq('user_id', user?.id)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && data.ai_messages && Array.isArray(data.ai_messages)) {
        const loadedMessages = data.ai_messages
          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .slice(-10) // Last 10 messages
          .map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            content: msg.message_text,
            timestamp: new Date(msg.created_at),
          }));
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const loadTodayQuestionCount = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('ai_messages')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'user')
        .gte('created_at', today.toISOString());

      setQuestionsToday(count || 0);
    } catch (error) {
      console.error('Error loading question count:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  const analyzeQueryComplexity = (query: string): 'quick' | 'detailed' => {
    const wordCount = query.trim().split(/\s+/).length;
    const lowercaseQuery = query.toLowerCase();

    // Keywords indicating complex queries
    const complexKeywords = [
      'explain', 'why', 'how does', 'step by step',
      'don\'t understand', 'confused', 'detail', 'struggling'
    ];

    // Quick query patterns
    const quickPatterns = [
      /^what is/i, /^define/i, /^who is/i, /^when/i,
      /^calculate/i, /^solve.*\d+/i
    ];

    // Check for quick patterns
    if (quickPatterns.some(pattern => pattern.test(query)) && wordCount < 15) {
      return 'quick';
    }

    // Check for complex keywords or long queries
    if (complexKeywords.some(keyword => lowercaseQuery.includes(keyword)) || wordCount > 20) {
      return 'detailed';
    }

    // Default to quick for short queries
    return wordCount < 15 ? 'quick' : 'detailed';
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // Check free user limits
    if (!isPremium && questionsToday >= DAILY_FREE_LIMIT) {
      toast({
        title: 'Daily Limit Reached',
        description: 'Upgrade to Premium for unlimited questions',
        variant: 'destructive',
      });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      // Analyze query complexity
      const complexity = analyzeQueryComplexity(userMessage.content);

      // Route to appropriate AI model
      const response = await routeAIQuery(userMessage.content, complexity);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Save to database
      await saveConversation(userMessage, assistantMessage, complexity);
      
      // Update question count
      setQuestionsToday(prev => prev + 1);

    } catch (error) {
      console.error('AI Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to get AI response. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const routeAIQuery = async (query: string, complexity: 'quick' | 'detailed'): Promise<string> => {
    // Build context-aware system prompt
    const systemPrompt = buildSystemPrompt(complexity);

    // Route to Cerebras for quick queries, GPT-4 for detailed
    if (complexity === 'quick') {
      return await callCerebras(query, systemPrompt);
    } else {
      return await callGPT4(query, systemPrompt);
    }
  };

  const buildSystemPrompt = (complexity: 'quick' | 'detailed'): string => {
    const baseContext = {
      grade: userProfile?.grade_level || context?.grade || 10,
      subject: context?.subjectName || 'General',
      chapter: context?.chapterTitle || 'General Topic',
    };

    if (complexity === 'quick') {
      return `You are EduFutura AI Tutor, a helpful assistant for South African high school students (Grades 6-12). Provide clear, concise answers aligned with CAPS curriculum. Be encouraging and supportive. Keep responses under 100 words for quick questions. Current context: Grade ${baseContext.grade}, Subject ${baseContext.subject}, Chapter ${baseContext.chapter}.`;
    } else {
      return `You are EduFutura AI Tutor, an expert educational assistant for South African students studying CAPS curriculum. Provide detailed, step-by-step explanations tailored to Grade ${baseContext.grade} level. Use analogies and examples relevant to South African context. Be patient, encouraging, and never just give answers - guide students to understanding. Current context: ${baseContext.chapter} in ${baseContext.subject}.`;
    }
  };

  const callCerebras = async (query: string, systemPrompt: string): Promise<string> => {
    // This will be implemented via edge function
    const { data, error } = await supabase.functions.invoke('ai-cerebras', {
      body: { 
        query, 
        systemPrompt, 
        userId: user?.id,
        careerContext: careerContext || null
      }
    });

    if (error) throw error;
    return data.response;
  };

  const callGPT4 = async (query: string, systemPrompt: string): Promise<string> => {
    // This will be implemented via edge function
    const { data, error } = await supabase.functions.invoke('ai-gpt4', {
      body: { 
        query, 
        systemPrompt, 
        userId: user?.id,
        careerContext: careerContext || null
      }
    });

    if (error) throw error;
    return data.response;
  };

  const saveConversation = async (userMsg: Message, aiMsg: Message, model: string) => {
    try {
      // Create or get conversation
      let conversationId;
      const { data: existingConv } = await supabase
        .from('ai_conversations')
        .select('id')
        .eq('user_id', user?.id)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingConv) {
        conversationId = existingConv.id;
        
        // Update last_message_at and message_count
        await supabase
          .from('ai_conversations')
          .update({
            last_message_at: new Date().toISOString(),
            message_count: (existingConv as any).message_count ? (existingConv as any).message_count + 2 : 2,
          })
          .eq('id', conversationId);
      } else {
        const { data: newConv } = await supabase
          .from('ai_conversations')
          .insert({
            user_id: user?.id,
            subject_name: context?.subjectName,
            chapter_id: null, // Will be populated when on chapter page
            message_count: 2,
            started_at: new Date().toISOString(),
            last_message_at: new Date().toISOString(),
          })
          .select()
          .single();
        conversationId = newConv?.id;
      }

      // Save messages
      await supabase.from('ai_messages').insert([
        {
          conversation_id: conversationId,
          role: 'user',
          message_text: userMsg.content,
        },
        {
          conversation_id: conversationId,
          role: 'assistant',
          message_text: aiMsg.content,
        }
      ]);
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  const remainingQuestions = isPremium ? Infinity : Math.max(0, DAILY_FREE_LIMIT - questionsToday);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal Panel */}
          <motion.div
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[85vh] lg:max-h-[600px]"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-4 border-b border-gray-200">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-secondary" />
                  <h2 className="text-lg font-semibold text-primary">EduFutura AI Tutor</h2>
                  {isPremium && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-secondary/20 rounded-full">
                      <Crown className="w-3 h-3 text-secondary" />
                      <span className="text-xs font-medium text-secondary">Premium</span>
                    </div>
                  )}
                </div>
                {context?.chapterTitle && (
                  <p className="text-sm text-gray-600 mt-1">
                    Help with Chapter {context.chapterNumber}: {context.chapterTitle} - Grade {context.grade} {context.subjectName}
                  </p>
                )}
              </div>

              {/* Voice Mode Toggle (Premium Only) */}
              {isPremium && (
                <button
                  onClick={() => setVoiceMode(!voiceMode)}
                  className={`p-2 rounded-lg transition ${
                    voiceMode ? 'bg-secondary text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                  title="Voice Mode"
                >
                  <Mic className="w-4 h-4" />
                </button>
              )}

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition ml-2"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Messages Area */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
            >
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <Sparkles className="w-12 h-12 text-secondary mb-4" />
                  <h3 className="text-lg font-semibold text-primary mb-2">
                    How can I help you today?
                  </h3>
                  <p className="text-sm text-gray-600">
                    Ask me anything about your studies. I'm here to help you understand concepts, solve problems, and succeed!
                  </p>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center mr-2">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[80%] rounded-2xl p-3 ${
                      message.role === 'user'
                        ? 'bg-secondary/20 text-primary rounded-br-md ml-auto'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
                    }`}
                  >
                    <p className="text-base whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDistanceToNow(message.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center mr-2">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md p-3">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">AI is thinking...</p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Scroll to Bottom Button */}
            {showScrollButton && (
              <button
                onClick={scrollToBottom}
                className="absolute bottom-32 right-8 p-2 bg-white border border-gray-200 rounded-full shadow-lg hover:bg-gray-50 transition"
              >
                <ArrowDown className="w-5 h-5 text-gray-600" />
              </button>
            )}

            {/* Input Area */}
            <div className="border-t border-gray-200 bg-white p-4">
              {/* Free User Counter */}
              {!isPremium && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">
                      {remainingQuestions > 0
                        ? `${remainingQuestions}/${DAILY_FREE_LIMIT} free questions today`
                        : 'Daily limit reached'}
                    </span>
                    {remainingQuestions === 1 && (
                      <span className="text-xs text-orange-600 font-medium">
                        1 question remaining
                      </span>
                    )}
                  </div>
                  <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-secondary transition-all duration-300"
                      style={{ width: `${(questionsToday / DAILY_FREE_LIMIT) * 100}%` }}
                    />
                  </div>
                  {remainingQuestions === 0 && (
                    <p className="text-xs text-gray-600 mt-2">
                      Upgrade to Premium for unlimited questions - R60/month
                    </p>
                  )}
                </div>
              )}

              {/* Input Container */}
              <div className="flex items-end gap-2">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about your studies..."
                  className="flex-1 resize-none border-gray-300 rounded-lg focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                  rows={2}
                  disabled={isLoading || (!isPremium && remainingQuestions === 0)}
                />
                
                {/* Voice Button (Premium Only) */}
                {isPremium && voiceMode && (
                  <Button
                    type="button"
                    size="icon"
                    className="bg-red-500 hover:bg-red-600"
                    title="Record voice message"
                  >
                    <Mic className="w-5 h-5 animate-pulse" />
                  </Button>
                )}

                {/* Send Button */}
                <Button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading || (!isPremium && remainingQuestions === 0)}
                  className="bg-secondary hover:bg-secondary/90 text-white"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
