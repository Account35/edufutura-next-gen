import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate HTML certificate
function generateCertificateHTML(data: any): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4 landscape; margin: 0; }
    body { 
      margin: 0; 
      padding: 40px;
      font-family: 'Georgia', serif;
      background: linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%);
      color: #1B4332;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .certificate {
      background: white;
      padding: 60px;
      border: 20px solid #D4AF37;
      border-radius: 10px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 900px;
      text-align: center;
    }
    .header { font-size: 48px; color: #1B4332; margin-bottom: 20px; font-weight: bold; }
    .subtitle { font-size: 24px; color: #800020; margin-bottom: 40px; }
    .recipient { font-size: 36px; color: #1B4332; margin: 30px 0; font-style: italic; border-bottom: 2px solid #D4AF37; display: inline-block; padding-bottom: 10px; }
    .achievement { font-size: 20px; margin: 30px 0; line-height: 1.8; }
    .details { margin: 40px 0; font-size: 16px; color: #666; }
    .signature { margin-top: 60px; display: flex; justify-content: space-around; }
    .signature div { text-align: center; }
    .signature .line { border-top: 2px solid #1B4332; width: 200px; margin: 10px auto; }
    .verification { margin-top: 40px; font-size: 14px; color: #666; }
    .qr-code { margin: 20px auto; width: 120px; height: 120px; }
    .gold { color: #D4AF37; }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="header">EduFutura</div>
    <div class="subtitle">Certificate of Achievement</div>
    
    <p style="font-size: 18px; margin: 20px 0;">This is to certify that</p>
    
    <div class="recipient">${data.student_name}</div>
    
    <div class="achievement">
      has successfully completed <span class="gold">${data.achievement_title}</span><br>
      with an outstanding performance of <span class="gold">${data.average_score}%</span>
    </div>
    
    <div class="details">
      <strong>Grade Level:</strong> ${data.grade_level} | 
      <strong>School:</strong> ${data.school_name || 'N/A'}<br>
      <strong>Issue Date:</strong> ${new Date(data.issue_date).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}
    </div>
    
    <div class="signature">
      <div>
        <div class="line"></div>
        <div>Platform Director</div>
      </div>
      <div>
        <div class="line"></div>
        <div>Academic Coordinator</div>
      </div>
    </div>
    
    <div class="verification">
      <img src="${data.qr_code_url}" alt="QR Code" class="qr-code" />
      <div>Verification Code: <strong>${data.verification_code}</strong></div>
      <div style="margin-top: 10px; font-size: 12px;">
        Verify at edufutura.app/verify/${data.verification_code}
      </div>
    </div>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: { user } } = await supabaseClient.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    );
    if (!user) throw new Error('Unauthorized');

    const { user_id, achievement_type, achievement_data } = await req.json();

    // Get user information
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('full_name, grade_level, school_id, schools(school_name)')
      .eq('id', user_id)
      .single();

    if (userError || !userData) {
      throw new Error('User not found');
    }

    // Generate unique verification code
    const verificationCode = crypto.randomUUID().substring(0, 12).toUpperCase();

    // Generate QR code (simple data URL for now - in production use QR library)
    const qrData = `https://edufutura.app/verify/${verificationCode}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

    // Prepare certificate data
    const schoolData = Array.isArray(userData.schools) ? userData.schools[0] : userData.schools;
    const certificateData = {
      student_name: userData.full_name,
      grade_level: userData.grade_level || 10,
      school_name: schoolData?.school_name || 'N/A',
      achievement_title: achievement_data.subject_name ? `${achievement_data.subject_name} Mastery` : 'Academic Excellence',
      average_score: achievement_data.average_score || 0,
      issue_date: new Date().toISOString(),
      verification_code: verificationCode,
      qr_code_url: qrCodeUrl,
    };

    // Generate HTML certificate
    const certificateHTML = generateCertificateHTML(certificateData);
    
    // Convert HTML to PDF using external service (since Puppeteer doesn't work in Edge Functions)
    // In production, use a PDF generation service or library
    const htmlBlob = new Blob([certificateHTML], { type: 'text/html' });
    
    // Upload HTML to storage (simplified - in production generate actual PDF)
    const fileName = `${user_id}/${verificationCode}.html`;
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('certificates')
      .upload(fileName, htmlBlob, {
        contentType: 'text/html',
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      throw new Error('Failed to upload certificate');
    }

    const { data: { publicUrl } } = supabaseClient.storage
      .from('certificates')
      .getPublicUrl(fileName);

    // Insert certificate record
    const { data: certificate, error: certError } = await supabaseClient
      .from('achievements')
      .insert({
        user_id,
        badge_id: verificationCode,
        badge_name: certificateData.achievement_title,
        badge_type: achievement_type || 'certificate',
        badge_description: `Earned with ${certificateData.average_score}% average`,
        subject_name: achievement_data.subject_name || null,
      })
      .select()
      .single();

    if (certError) {
      throw new Error('Failed to create certificate record');
    }

    // Log activity
    await supabaseClient
      .from('activity_log')
      .insert({
        user_id,
        activity_type: 'certificate_earned',
        activity_description: `Earned certificate: ${certificateData.achievement_title}`,
        subject_name: achievement_data.subject_name || null,
        metadata: { verification_code: verificationCode },
      })
      .then(() => {}, () => {});

    return new Response(
      JSON.stringify({
        success: true,
        certificate_id: certificate.id,
        certificate_url: publicUrl,
        verification_code: verificationCode,
        qr_code_url: qrCodeUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Certificate generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const status = errorMessage.includes('Unauthorized') ? 401 : 500;
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage 
      }),
      { 
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
