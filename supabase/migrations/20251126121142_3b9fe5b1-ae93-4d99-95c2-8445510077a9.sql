-- Create group events table for study sessions and meetings
CREATE TABLE IF NOT EXISTS public.group_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  meeting_link TEXT,
  recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT, -- 'daily', 'weekly', 'biweekly', 'monthly'
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create event attendees table for RSVPs
CREATE TABLE IF NOT EXISTS public.event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.group_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'attending', -- 'attending', 'maybe', 'not_attending'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Create group invitations table
CREATE TABLE IF NOT EXISTS public.group_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL,
  invitee_id UUID NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(group_id, invitee_id)
);

-- Enable RLS on new tables
ALTER TABLE public.group_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for group_events
CREATE POLICY "Group members can view events"
  ON public.group_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_events.group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can create events"
  ON public.group_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_events.group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Event creator and moderators can update events"
  ON public.group_events FOR UPDATE
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_events.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.role IN ('owner', 'moderator')
    )
  );

CREATE POLICY "Event creator and moderators can delete events"
  ON public.group_events FOR DELETE
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_events.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.role IN ('owner', 'moderator')
    )
  );

-- RLS policies for event_attendees
CREATE POLICY "Group members can view attendees"
  ON public.event_attendees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_events
      JOIN public.group_members ON group_members.group_id = group_events.group_id
      WHERE group_events.id = event_attendees.event_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own RSVPs"
  ON public.event_attendees FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS policies for group_invitations
CREATE POLICY "Users can view own invitations"
  ON public.group_invitations FOR SELECT
  USING (invitee_id = auth.uid() OR inviter_id = auth.uid());

CREATE POLICY "Group members can create invitations"
  ON public.group_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_invitations.group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Invitees can update invitation status"
  ON public.group_invitations FOR UPDATE
  USING (invitee_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_events_group_id ON public.group_events(group_id);
CREATE INDEX IF NOT EXISTS idx_group_events_scheduled_at ON public.group_events(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON public.event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user_id ON public.event_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_invitee_id ON public.group_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_status ON public.group_invitations(status);

-- Enable realtime for group_chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_chat_messages;