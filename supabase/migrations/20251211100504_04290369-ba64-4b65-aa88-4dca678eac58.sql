-- Support Tickets table
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number SERIAL,
  user_id UUID NOT NULL,
  assigned_to UUID,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'open', 'in_progress', 'waiting_on_user', 'resolved', 'closed')),
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('technical', 'account', 'payment', 'content', 'general')),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  first_response_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  satisfaction_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ticket Messages table
CREATE TABLE public.ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message_content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ticket Assignment History
CREATE TABLE public.ticket_assignment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  assigned_from UUID,
  assigned_to UUID NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Canned Responses
CREATE TABLE public.canned_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_shared BOOLEAN DEFAULT true,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- SLA Rules
CREATE TABLE public.sla_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  priority TEXT NOT NULL UNIQUE,
  first_response_minutes INTEGER NOT NULL,
  resolution_minutes INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- SLA Breaches Log
CREATE TABLE public.sla_breaches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  breach_type TEXT NOT NULL CHECK (breach_type IN ('first_response', 'resolution')),
  breached_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  escalated_to UUID,
  notes TEXT
);

-- Knowledge Base Articles
CREATE TABLE public.knowledge_base_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_assignment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canned_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_breaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base_articles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets
CREATE POLICY "Users can view own tickets" ON public.support_tickets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all tickets" ON public.support_tickets
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for ticket_messages
CREATE POLICY "Users can view own ticket messages" ON public.ticket_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM support_tickets WHERE id = ticket_id AND user_id = auth.uid())
    AND is_internal = false
  );

CREATE POLICY "Users can create messages on own tickets" ON public.ticket_messages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM support_tickets WHERE id = ticket_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all messages" ON public.ticket_messages
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for assignment history
CREATE POLICY "Admins can manage assignment history" ON public.ticket_assignment_history
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for canned responses
CREATE POLICY "Admins can view canned responses" ON public.canned_responses
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage canned responses" ON public.canned_responses
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for SLA rules
CREATE POLICY "Admins can manage SLA rules" ON public.sla_rules
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for SLA breaches
CREATE POLICY "Admins can manage SLA breaches" ON public.sla_breaches
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for knowledge base
CREATE POLICY "Anyone can view published articles" ON public.knowledge_base_articles
  FOR SELECT USING (is_published = true);

CREATE POLICY "Admins can manage all articles" ON public.knowledge_base_articles
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default SLA rules
INSERT INTO public.sla_rules (priority, first_response_minutes, resolution_minutes) VALUES
  ('urgent', 60, 240),
  ('high', 240, 1440),
  ('medium', 1440, 4320),
  ('low', 2880, 10080);

-- Indexes for performance
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON public.support_tickets(priority);
CREATE INDEX idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);
CREATE INDEX idx_knowledge_base_category ON public.knowledge_base_articles(category);