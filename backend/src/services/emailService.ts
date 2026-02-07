import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid if API key is available
if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    console.log('[EMAIL SERVICE] SendGrid configured as primary email provider');
} else {
    console.warn('[EMAIL SERVICE] SendGrid API key not found, will use SMTP fallback only');
}

// Create SMTP transporter as fallback
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
    family: 4, // Force IPv4
} as nodemailer.TransportOptions);

// Verify SMTP transporter configuration
transporter.verify((error: Error | null) => {
    if (error) {
        console.error('[EMAIL SERVICE] SMTP Configuration error:', error);
    } else {
        console.log('[EMAIL SERVICE] SMTP fallback ready');
    }
});

/**
 * Send email using SendGrid (primary) with SMTP fallback
 * @param to Recipient email
 * @param subject Email subject
 * @param html HTML content
 * @param text Plain text content
 * @returns Promise<boolean> true if email sent successfully
 */
const sendEmail = async (
    to: string,
    subject: string,
    html: string,
    text: string
): Promise<boolean> => {
    const from = process.env.SENDGRID_FROM_EMAIL || process.env.GMAIL_USER!;

    // Try SendGrid first if API key is available
    if (process.env.SENDGRID_API_KEY) {
        try {
            await sgMail.send({
                to,
                from,
                subject,
                html,
                text,
            });
            console.log(`[EMAIL] ✅ Sent via SendGrid to ${to}`);
            return true;
        } catch (sendgridError) {
            console.error('[EMAIL] ❌ SendGrid failed:', sendgridError);
            console.log('[EMAIL] 🔄 Attempting SMTP fallback...');
        }
    }

    // Fallback to SMTP
    try {
        await transporter.sendMail({
            from: {
                name: 'Fellowship Manager',
                address: process.env.GMAIL_USER!,
            },
            to,
            subject,
            html,
            text,
        });
        console.log(`[EMAIL] ✅ Sent via SMTP fallback to ${to}`);
        return true;
    } catch (smtpError) {
        console.error('[EMAIL] ❌ SMTP fallback also failed:', smtpError);
        return false;
    }
};

export const sendOTPEmail = async (
    email: string,
    fullName: string,
    otp: string
): Promise<boolean> => {
    const subject = 'Your Login Verification Code';
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #14b8a6 0%, #0891b2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
                .otp-box { background: white; border: 2px solid #14b8a6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
                .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #14b8a6; font-family: 'Courier New', monospace; }
                .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
                .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0;">Fellowship Manager</h1>
                    <p style="margin: 5px 0 0 0;">Login Verification</p>
                </div>
                <div class="content">
                    <p>Hello <strong>${fullName}</strong>,</p>
                    <p>A login attempt was made to your Fellowship Manager account. To complete the login process, please use the verification code below:</p>
                    
                    <div class="otp-box">
                        <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">Your Verification Code</p>
                        <div class="otp-code">${otp}</div>
                        <p style="margin: 10px 0 0 0; color: #64748b; font-size: 12px;">Valid for 5 minutes</p>
                    </div>
                    
                    <div class="warning">
                        <strong>⚠️ Security Notice:</strong> Never share this code with anyone. Fellowship staff will never ask for your verification code.
                    </div>
                    
                    <p><strong>Didn't request this code?</strong></p>
                    <p>If you didn't attempt to log in, please ignore this email. Your account remains secure. For security concerns, contact your fellowship administrator.</p>
                    
                    <p style="margin-top: 30px;">Best regards,<br><strong>Fellowship Management Team</strong></p>
                </div>
                <div class="footer">
                    <p>This is an automated message. Please do not reply to this email.</p>
                    <p>&copy; ${new Date().getFullYear()} Fellowship Manager. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const text = `
Hello ${fullName},

A login attempt was made to your Fellowship Manager account.

Your Verification Code: ${otp}
Valid for 5 minutes

Enter this code to complete your login.

Security Notice: Never share this code with anyone. If you didn't request this code, please ignore this email.

Best regards,
Fellowship Management Team
    `.trim();

    return await sendEmail(email, subject, html, text);
};

export const sendAccountLockedEmail = async (
    email: string,
    fullName: string,
    unlockTime: Date
): Promise<void> => {
    const subject = '🔒 Account Temporarily Locked - Security Alert';
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-  sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
                .alert-box { background: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 20px; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0;">🔒 Account Locked</h1>
                    <p style="margin: 5px 0 0 0;">Security Alert</p>
                </div>
                <div class="content">
                    <p>Hello <strong>${fullName}</strong>,</p>
                    
                    <div class="alert-box">
                        <p><strong>Your account has been temporarily locked due to multiple failed login attempts.</strong></p>
                        <p style="margin: 15px 0;">
                            <strong>Unlock Time:</strong> ${unlockTime.toLocaleString()}<br>
                            <strong>Duration:</strong> 30 minutes from last failed attempt
                        </p>
                    </div>
                    
                    <p><strong>What happened?</strong></p>
                    <p>We detected 5 consecutive failed login attempts on your account. As a security measure, your account has been temporarily locked.</p>
                    
                    <p><strong>What should you do?</strong></p>
                    <ul>
                        <li>Wait for the lockout period to expire (30 minutes)</li>
                        <li>If you forgot your password, contact your fellowship administrator</li>
                        <li>If you didn't attempt to log in, your account may be compromised - contact support immediately</li>
                    </ul>
                    
                    <p style="margin-top: 30px;">Stay secure,<br><strong>Fellowship Security Team</strong></p>
                </div>
                <div class="footer">
                    <p>This is an automated security message.</p>
                    <p>&copy; ${new Date().getFullYear()} Fellowship Manager. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    await sendEmail(email, subject, html, '');
};

export default { sendOTPEmail, sendAccountLockedEmail };
