-- Phase 11: Comprehensive Notification System
-- Create notifications table for storing all notification records

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  icon_name TEXT DEFAULT 'bell',
  priority_level TEXT NOT NULL DEFAULT 'normal' CHECK (priority_level IN ('low', 'normal', 'high', 'urgent')),
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  delivery_channels TEXT[] DEFAULT ARRAY['in_app'],
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  delivery_status JSONB DEFAULT '{"in_app_delivered": true}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_sent_at ON notifications(sent_at DESC);
CREATE INDEX idx_notifications_expires ON notifications(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_notifications_user_sent ON notifications(user_id, sent_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Create user_notification_preferences table for granular control
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  channels TEXT[] DEFAULT ARRAY['in_app', 'email'],
  quiet_hours JSONB DEFAULT '{"enabled": false, "start": "22:00", "end": "07:00"}'::jsonb,
  digest_frequency TEXT DEFAULT 'real-time' CHECK (digest_frequency IN ('real-time', 'hourly', 'daily', 'weekly', 'never')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, notification_type)
);

CREATE INDEX idx_user_notif_prefs_user ON user_notification_preferences(user_id);

ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notification preferences" ON user_notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Create push_subscriptions table for web push notifications
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL,
  browser TEXT,
  device_type TEXT,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_push_subs_user ON push_subscriptions(user_id);
CREATE INDEX idx_push_subs_active ON push_subscriptions(is_active) WHERE is_active = true;

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push subscriptions" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Create email_templates table for branded email content
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL UNIQUE,
  subject_line TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  from_email TEXT DEFAULT 'notifications@edufutura.app',
  from_name TEXT DEFAULT 'EduFutura',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active templates" ON email_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage templates" ON email_templates
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create notification_analytics table for tracking effectiveness
CREATE TABLE IF NOT EXISTS notification_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('sent', 'delivered', 'opened', 'clicked', 'dismissed', 'unsubscribed')),
  event_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_notif_analytics_type ON notification_analytics(notification_type, event_type);
CREATE INDEX idx_notif_analytics_channel ON notification_analytics(channel, event_type);
CREATE INDEX idx_notif_analytics_date ON notification_analytics(event_at);

ALTER TABLE notification_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can insert analytics" ON notification_analytics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view analytics" ON notification_analytics
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Insert default email templates
INSERT INTO email_templates (template_name, subject_line, html_body, text_body) VALUES
('achievement', '🏆 Congratulations! You earned a new badge on EduFutura', 
'<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;background-color:#FAF6F1;padding:20px}.container{max-width:600px;margin:0 auto;background:white;border-radius:10px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1)}.header{background:linear-gradient(135deg,#1B4332 0%,#2D6A4F 100%);color:white;padding:30px;text-align:center}.content{padding:30px;line-height:1.6;color:#333}.button{display:inline-block;background:#D4AF37;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;margin:20px 0}.footer{background:#f5f5f5;padding:20px;text-align:center;font-size:12px;color:#666}</style></head><body><div class="container"><div class="header"><h1>🎓 EduFutura</h1></div><div class="content"><h2>🏆 {{title}}</h2><p>{{message}}</p><a href="{{action_url}}" class="button">View Your Achievement</a></div><div class="footer"><p>© 2024 EduFutura - South African CAPS Curriculum Platform</p><p><a href="{{unsubscribe_url}}">Manage notification preferences</a></p></div></div></body></html>',
'{{title}} - {{message}} View at: {{action_url}}'),
('quiz_reminder', '📚 Quiz Reminder from EduFutura', 
'<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;background-color:#FAF6F1;padding:20px}.container{max-width:600px;margin:0 auto;background:white;border-radius:10px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1)}.header{background:linear-gradient(135deg,#1B4332 0%,#2D6A4F 100%);color:white;padding:30px;text-align:center}.content{padding:30px;line-height:1.6;color:#333}.button{display:inline-block;background:#D4AF37;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;margin:20px 0}.footer{background:#f5f5f5;padding:20px;text-align:center;font-size:12px;color:#666}</style></head><body><div class="container"><div class="header"><h1>🎓 EduFutura</h1></div><div class="content"><h2>📚 {{title}}</h2><p>{{message}}</p><a href="{{action_url}}" class="button">Start Quiz Now</a></div><div class="footer"><p>© 2024 EduFutura - South African CAPS Curriculum Platform</p><p><a href="{{unsubscribe_url}}">Manage notification preferences</a></p></div></div></body></html>',
'{{title}} - {{message}} Start quiz at: {{action_url}}'),
('forum_reply', '💬 New reply to your post on EduFutura', 
'<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;background-color:#FAF6F1;padding:20px}.container{max-width:600px;margin:0 auto;background:white;border-radius:10px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1)}.header{background:linear-gradient(135deg,#1B4332 0%,#2D6A4F 100%);color:white;padding:30px;text-align:center}.content{padding:30px;line-height:1.6;color:#333}.button{display:inline-block;background:#D4AF37;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;margin:20px 0}.footer{background:#f5f5f5;padding:20px;text-align:center;font-size:12px;color:#666}</style></head><body><div class="container"><div class="header"><h1>🎓 EduFutura</h1></div><div class="content"><h2>💬 {{title}}</h2><p>{{message}}</p><a href="{{action_url}}" class="button">View Reply</a></div><div class="footer"><p>© 2024 EduFutura - South African CAPS Curriculum Platform</p><p><a href="{{unsubscribe_url}}">Manage notification preferences</a></p></div></div></body></html>',
'{{title}} - {{message}} View at: {{action_url}}'),
('study_streak', '🔥 Keep your streak alive on EduFutura!', 
'<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;background-color:#FAF6F1;padding:20px}.container{max-width:600px;margin:0 auto;background:white;border-radius:10px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1)}.header{background:linear-gradient(135deg,#1B4332 0%,#2D6A4F 100%);color:white;padding:30px;text-align:center}.content{padding:30px;line-height:1.6;color:#333}.button{display:inline-block;background:#D4AF37;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;margin:20px 0}.footer{background:#f5f5f5;padding:20px;text-align:center;font-size:12px;color:#666}</style></head><body><div class="container"><div class="header"><h1>🎓 EduFutura</h1></div><div class="content"><h2>🔥 {{title}}</h2><p>{{message}}</p><a href="{{action_url}}" class="button">Continue Learning</a></div><div class="footer"><p>© 2024 EduFutura - South African CAPS Curriculum Platform</p><p><a href="{{unsubscribe_url}}">Manage notification preferences</a></p></div></div></body></html>',
'{{title}} - {{message}} Continue at: {{action_url}}')
ON CONFLICT (template_name) DO NOTHING;

-- Function to cleanup expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications
  WHERE expires_at IS NOT NULL AND expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;