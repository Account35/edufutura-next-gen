-- ============================================
-- PHASE 9: SECURITY FIXES - SIMPLIFIED
-- ============================================

-- Fix search_path for all trigger functions (already done, just documenting)

-- RLS POLICY FOR USER AUDIT LOG
ALTER TABLE user_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs"
  ON user_audit_log FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own audit logs"
  ON user_audit_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);