import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';
import QRCode from 'qrcode';
import prisma from '../prisma';
import { EmailStatus, Prisma } from '@prisma/client';
import { checkConnectivity } from '../utils/networkHelper';

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

export const sendWelcomeEmail = async (
    email: string,
    fullName: string,
    fellowshipNumber: string,
    qrCodeValue: string
): Promise<boolean> => {
    try {
        // Generate QR code as Data URL (base64 image)
        const qrCodeDataUrl = await QRCode.toDataURL(qrCodeValue, {
            width: 300,
            margin: 2,
            color: {
                dark: '#14b8a6', // Teal color matching brand
                light: '#FFFFFF'
            }
        });

        const subject = '🎉 Welcome to Fellowship Manager!';
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #14b8a6 0%, #0891b2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
                    .welcome-box { background: white; border: 2px solid #14b8a6; border-radius: 8px; padding: 20px; margin: 20px 0; }
                    .credential-item { background: #f1f5f9; padding: 15px; border-radius: 6px; margin: 10px 0; }
                    .credential-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
                    .credential-value { font-size: 18px; font-weight: bold; color: #0f172a; font-family: 'Courier New', monospace; }
                    .qr-container { text-align: center; padding: 20px; background: white; border-radius: 8px; margin: 20px 0; }
                    .info-box { background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px; }
                    .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
                    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
                    .steps-list { padding-left: 20px; }
                    .steps-list li { margin: 10px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1 style="margin: 0; font-size: 28px;">🎉 Welcome to Fellowship!</h1>
                        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your registration was successful</p>
                    </div>
                    <div class="content">
                        <div class="welcome-box">
                            <p style="margin: 0 0 15px 0; font-size: 18px; color: #14b8a6; font-weight: bold;">Hello <strong style="color: #0f172a;">${fullName}</strong>! 👋</p>
                            <p style="margin: 0; color: #64748b;">
                                We're excited to have you as part of our fellowship community. Here are your account credentials and important information to get started.
                            </p>
                        </div>

                        <h3 style="color: #0f172a; margin: 30px 0 15px 0;">📋 Your Account Details</h3>
                        
                        <div class="credential-item">
                            <div class="credential-label">Fellowship Number</div>
                            <div class="credential-value">${fellowshipNumber}</div>
                        </div>

                        <div class="credential-item">
                            <div class="credential-label">Default Password</div>
                            <div class="credential-value">${fellowshipNumber}</div>
                        </div>

                        <div class="credential-item">
                            <div class="credential-label">Email</div>
                            <div class="credential-value" style="font-size: 16px;">${email}</div>
                        </div>

                        <div class="info-box">
                            <strong>ℹ️ First Login:</strong> Your default password is the same as your fellowship number. Please change it after your first login for security purposes.
                        </div>

                        <h3 style="color: #0f172a; margin: 30px 0 15px 0;">📱 Your Personal QR Code</h3>
                        <p style="color: #64748b; margin-bottom: 15px;">Use this QR code for quick check-in at fellowship events:</p>
                        
                        <div class="qr-container">
                            <img src="${qrCodeDataUrl}" alt="Your QR Code" style="max-width: 300px; width: 100%;" />
                            <p style="margin: 15px 0 0 0; color: #64748b; font-size: 14px;">
                                Save this QR code to your device for easy access
                            </p>
                        </div>

                        <div class="warning-box">
                            <strong>🔒 Keep Your QR Code Safe:</strong> This QR code is unique to you. Do not share it with others as it provides access to your fellowship account.
                        </div>

                        <h3 style="color: #0f172a; margin: 30px 0 15px 0;">🚀 Getting Started</h3>
                        <ol class="steps-list" style="color: #64748b;">
                            <li><strong style="color: #0f172a;">Log in</strong> to your account using your fellowship number and password</li>
                            <li><strong style="color: #0f172a;">Update your profile</strong> with additional information if needed</li>
                            <li><strong style="color: #0f172a;">Change your password</strong> for security</li>
                            <li><strong style="color: #0f172a;">Save your QR code</strong> for quick event check-ins</li>
                            <li><strong style="color: #0f172a;">Explore</strong> the fellowship management system</li>
                        </ol>

                        <div class="info-box" style="background: #f0f9ff; border-color: #0891b2;">
                            <strong>💡 Need Help?</strong> Contact your fellowship administrator if you have any questions or need assistance accessing your account.
                        </div>

                        <p style="margin-top: 30px; color: #64748b;">
                            We look forward to seeing you at our events!
                        </p>
                        <p style="margin: 10px 0 0 0;">
                            <strong style="color: #0f172a;">The Fellowship Management Team</strong>
                        </p>
                    </div>
                    <div class="footer">
                        <p>This is an automated welcome message.</p>
                        <p>&copy; ${new Date().getFullYear()} Fellowship Manager. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const text = `
Welcome to Fellowship, ${fullName}!

Your registration was successful. Here are your account details:

Fellowship Number: ${fellowshipNumber}
Default Password: ${fellowshipNumber}
Email: ${email}

Your default password is the same as your fellowship number. Please change it after your first login for security purposes.

Getting Started:
1. Log in to your account using your fellowship number and password
2. Update your profile with additional information if needed
3. Change your password for security
4. Save your QR code for quick event check-ins
5. Explore the fellowship management system

Need Help? Contact your fellowship administrator if you have any questions.

We look forward to seeing you at our events!

The Fellowship Management Team
        `.trim();

        return await sendEmail(email, subject, html, text);
    } catch (error) {
        console.error('[EMAIL] Failed to send welcome email:', error);
        return false;
    }
};


/**

 * Queue an email to be sent later (transactional)
 */
export const queueEmail = async (
    tx: Prisma.TransactionClient,
    to: string,
    subject: string,
    html: string,
    text: string
) => {
    await tx.emailQueue.create({
        data: {
            email: to,
            subject,
            html,
            text,
            status: EmailStatus.PENDING,
        },
    });
    console.log(`[EMAIL] 📥 Queued email for ${to}`);
};

/**
 * Process the email queue
 * - Checks internet connectivity first
 * - Processes pending emails
 * - Handles retries
 */
export const processEmailQueue = async () => {
    // 1. Check connectivity
    const isOnline = await checkConnectivity();
    if (!isOnline) {
        // Silent return if offline - don't log to avoid spamming console
        return;
    }

    try {
        // 2. Fetch pending emails (limit 5 per batch)
        const pendingEmails = await prisma.emailQueue.findMany({
            where: {
                status: EmailStatus.PENDING,
                attempts: { lt: 5 }, // Max 5 attempts
            },
            take: 5,
            orderBy: { createdAt: 'asc' },
        });

        if (pendingEmails.length === 0) return;

        console.log(`[EMAIL QUEUE] Processing ${pendingEmails.length} pending emails...`);

        // 3. Process each email
        for (const email of pendingEmails) {
            // Mark as processing
            await prisma.emailQueue.update({
                where: { id: email.id },
                data: { status: EmailStatus.PROCESSING },
            });

            try {
                // Attempt to send
                const sent = await sendEmail(email.email, email.subject, email.html, email.text);

                if (sent) {
                    // Success
                    await prisma.emailQueue.update({
                        where: { id: email.id },
                        data: {
                            status: EmailStatus.COMPLETED,
                            lastAttempt: new Date(),
                            attempts: { increment: 1 },
                        },
                    });
                    console.log(`[EMAIL QUEUE] ✅ Processed email for ${email.email}`);
                } else {
                    // Start of Selection
                    // Soft failure (SMTP error but connected)
                    throw new Error('SMTP Send Failed');
                }
            } catch (error: any) {
                console.error(`[EMAIL QUEUE] ❌ Failed to process email for ${email.email}:`, error.message);

                // Mark as pending for retry (with exponential backoff visibility in future if needed)
                // For now, simple retry count increment
                await prisma.emailQueue.update({
                    where: { id: email.id },
                    data: {
                        status: email.attempts >= 4 ? EmailStatus.FAILED : EmailStatus.PENDING,
                        lastAttempt: new Date(),
                        attempts: { increment: 1 },
                        error: error.message,
                    },
                });
            }
        }
    } catch (error) {
        console.error('[EMAIL QUEUE] Critical error in processor:', error);
    }
};

// ... (existing exports)

export const queueWelcomeEmail = async (
    tx: Prisma.TransactionClient,
    email: string,
    fullName: string,
    fellowshipNumber: string,
    qrCodeValue: string
) => {
    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(qrCodeValue, {
        width: 300,
        margin: 2,
        color: { dark: '#14b8a6', light: '#FFFFFF' }
    });


    const subject = '🎉 Welcome to Fellowship Manager!';
    const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #14b8a6 0%, #0891b2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
                    .welcome-box { background: white; border: 2px solid #14b8a6; border-radius: 8px; padding: 20px; margin: 20px 0; }
                    .credential-item { background: #f1f5f9; padding: 15px; border-radius: 6px; margin: 10px 0; }
                    .credential-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
                    .credential-value { font-size: 18px; font-weight: bold; color: #0f172a; font-family: 'Courier New', monospace; }
                    .qr-container { text-align: center; padding: 20px; background: white; border-radius: 8px; margin: 20px 0; }
                    .info-box { background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px; }
                    .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
                    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
                    .steps-list { padding-left: 20px; }
                    .steps-list li { margin: 10px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1 style="margin: 0; font-size: 28px;">🎉 Welcome to Fellowship!</h1>
                        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your registration was successful</p>
                    </div>
                    <div class="content">
                        <div class="welcome-box">
                            <p style="margin: 0 0 15px 0; font-size: 18px; color: #14b8a6; font-weight: bold;">Hello <strong style="color: #0f172a;">${fullName}</strong>! 👋</p>
                            <p style="margin: 0; color: #64748b;">
                                We're excited to have you as part of our fellowship community. Here are your account credentials and important information to get started.
                            </p>
                        </div>

                        <h3 style="color: #0f172a; margin: 30px 0 15px 0;">📋 Your Account Details</h3>
                        
                        <div class="credential-item">
                            <div class="credential-label">Fellowship Number</div>
                            <div class="credential-value">${fellowshipNumber}</div>
                        </div>

                        <div class="credential-item">
                            <div class="credential-label">Default Password</div>
                            <div class="credential-value">${fellowshipNumber}</div>
                        </div>

                        <div class="credential-item">
                            <div class="credential-label">Email</div>
                            <div class="credential-value" style="font-size: 16px;">${email}</div>
                        </div>

                        <div class="info-box">
                            <strong>ℹ️ First Login:</strong> Your default password is the same as your fellowship number. Please change it after your first login for security purposes.
                        </div>

                        <h3 style="color: #0f172a; margin: 30px 0 15px 0;">📱 Your Personal QR Code</h3>
                        <p style="color: #64748b; margin-bottom: 15px;">Use this QR code for quick check-in at fellowship events:</p>
                        
                        <div class="qr-container">
                            <img src="${qrCodeDataUrl}" alt="Your QR Code" style="max-width: 300px; width: 100%;" />
                            <p style="margin: 15px 0 0 0; color: #64748b; font-size: 14px;">
                                Save this QR code to your device for easy access
                            </p>
                        </div>

                        <div class="warning-box">
                            <strong>🔒 Keep Your QR Code Safe:</strong> This QR code is unique to you. Do not share it with others as it provides access to your fellowship account.
                        </div>

                        <h3 style="color: #0f172a; margin: 30px 0 15px 0;">🚀 Getting Started</h3>
                        <ol class="steps-list" style="color: #64748b;">
                            <li><strong style="color: #0f172a;">Log in</strong> to your account using your fellowship number and password</li>
                            <li><strong style="color: #0f172a;">Update your profile</strong> with additional information if needed</li>
                            <li><strong style="color: #0f172a;">Change your password</strong> for security</li>
                            <li><strong style="color: #0f172a;">Save your QR code</strong> for quick event check-ins</li>
                            <li><strong style="color: #0f172a;">Explore</strong> the fellowship management system</li>
                        </ol>

                        <div class="info-box" style="background: #f0f9ff; border-color: #0891b2;">
                            <strong>💡 Need Help?</strong> Contact your fellowship administrator if you have any questions or need assistance accessing your account.
                        </div>

                        <p style="margin-top: 30px; color: #64748b;">
                            We look forward to seeing you at our events!
                        </p>
                        <p style="margin: 10px 0 0 0;">
                            <strong style="color: #0f172a;">The Fellowship Management Team</strong>
                        </p>
                    </div>
                    <div class="footer">
                        <p>This is an automated welcome message.</p>
                        <p>&copy; ${new Date().getFullYear()} Fellowship Manager. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `.trim();

    const text = `
Welcome to Fellowship, ${fullName}!

Your registration was successful. Here are your account details:

Fellowship Number: ${fellowshipNumber}
Default Password: ${fellowshipNumber}
Email: ${email}

Your default password is the same as your fellowship number. Please change it after your first login for security purposes.

Getting Started:
1. Log in to your account using your fellowship number and password
2. Update your profile with additional information if needed
3. Change your password for security
4. Save your QR code for quick event check-ins
5. Explore the fellowship management system

Need Help? Contact your fellowship administrator if you have any questions.

We look forward to seeing you at our events!

The Fellowship Management Team
    `.trim();

    await queueEmail(tx, email, subject, html, text);
};

/**
 * Notify a Regional Head that a member in their region has submitted a profile edit request.
 */
export const sendProfileEditRequestNotification = async (
    rhEmail: string,
    rhFullName: string,
    memberFullName: string,
    memberFellowshipNumber: string,
    changes: Array<{ field: string; oldValue: string; newValue: string }>,
    reason: string
): Promise<boolean> => {
    const subject = '📝 Profile Edit Request — Action Required';

    const changesHtml = changes
        .map(
            (c) => `
            <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #0f172a; text-transform: capitalize;">${c.field.replace(/([A-Z])/g, ' $1')}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">${c.oldValue}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #14b8a6; font-weight: 600;">${c.newValue}</td>
            </tr>`
        )
        .join('');

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #48A111 0%, #2d7a08 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
                .info-box { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
                .reason-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
                table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                th { background: #f1f5f9; padding: 8px 12px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase; }
                .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
                .cta { display: inline-block; background: #48A111; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 16px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0;">Profile Edit Request</h1>
                    <p style="margin: 5px 0 0 0; opacity: 0.9;">Action Required</p>
                </div>
                <div class="content">
                    <p>Hello <strong>${rhFullName}</strong>,</p>
                    <p>A member in your region has submitted a profile edit request that requires your review.</p>

                    <div class="info-box">
                        <p style="margin: 0 0 6px 0; font-size: 13px; color: #64748b;">MEMBER</p>
                        <p style="margin: 0; font-size: 18px; font-weight: bold; color: #0f172a;">${memberFullName}</p>
                        <p style="margin: 4px 0 0 0; font-family: monospace; color: #64748b;">${memberFellowshipNumber}</p>
                    </div>

                    <h3 style="color: #0f172a;">Requested Changes</h3>
                    <table>
                        <thead><tr><th>Field</th><th>Current Value</th><th>New Value</th></tr></thead>
                        <tbody>${changesHtml}</tbody>
                    </table>

                    <div class="reason-box">
                        <strong>Member's Reason:</strong><br/>
                        ${reason}
                    </div>

                    <p>Please log in to your Fellowship Manager account to review and approve or reject this request.</p>

                    <p style="margin-top: 30px;">Best regards,<br/><strong>Fellowship Management System</strong></p>
                </div>
                <div class="footer">
                    <p>This is an automated notification. Do not reply to this email.</p>
                    <p>&copy; ${new Date().getFullYear()} Fellowship Manager. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const text = `
Hello ${rhFullName},

A member in your region has submitted a profile edit request.

Member: ${memberFullName} (${memberFellowshipNumber})

Requested Changes:
${changes.map((c) => `  ${c.field}: "${c.oldValue}" → "${c.newValue}"`).join('\n')}

Reason: ${reason}

Please log in to your Fellowship Manager account to review this request.

Fellowship Management System
    `.trim();

    return await sendEmail(rhEmail, subject, html, text);
};

/**
 * Notify a member that their profile edit request has been approved or rejected.
 */
export const sendProfileEditDecisionNotification = async (
    memberEmail: string,
    memberFullName: string,
    decision: 'APPROVED' | 'REJECTED',
    changes: Array<{ field: string; oldValue: string; newValue: string }>,
    reviewNote?: string
): Promise<boolean> => {
    const isApproved = decision === 'APPROVED';
    const subject = isApproved
        ? '✅ Profile Edit Request Approved'
        : '❌ Profile Edit Request Rejected';

    const statusColor = isApproved ? '#16a34a' : '#dc2626';
    const statusBg = isApproved ? '#f0fdf4' : '#fef2f2';
    const statusText = isApproved ? 'APPROVED' : 'REJECTED';

    const changesHtml = changes
        .map(
            (c) => `
            <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #0f172a; text-transform: capitalize;">${c.field.replace(/([A-Z])/g, ' $1')}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">${c.oldValue}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: ${isApproved ? '#14b8a6' : '#64748b'}; ${isApproved ? 'font-weight: 600;' : 'text-decoration: line-through;'}">${c.newValue}</td>
            </tr>`
        )
        .join('');

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, ${isApproved ? '#48A111 0%, #2d7a08' : '#dc2626 0%, #991b1b'} 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
                .status-badge { display: inline-block; background: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusColor}; padding: 8px 20px; border-radius: 999px; font-weight: bold; font-size: 14px; margin: 12px 0; }
                .note-box { background: #f1f5f9; border-left: 4px solid #94a3b8; padding: 15px; margin: 20px 0; border-radius: 4px; }
                table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                th { background: #f1f5f9; padding: 8px 12px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase; }
                .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0;">Profile Edit Request</h1>
                    <p style="margin: 5px 0 0 0; opacity: 0.9;">${isApproved ? 'Your changes have been applied' : 'Your request could not be approved'}</p>
                </div>
                <div class="content">
                    <p>Hello <strong>${memberFullName}</strong>,</p>
                    <p>Your Regional Head has reviewed your profile edit request.</p>

                    <div style="text-align: center; margin: 20px 0;">
                        <span class="status-badge">${statusText}</span>
                    </div>

                    <h3 style="color: #0f172a;">Your Requested Changes</h3>
                    <table>
                        <thead><tr><th>Field</th><th>Old Value</th><th>Requested Value</th></tr></thead>
                        <tbody>${changesHtml}</tbody>
                    </table>

                    ${reviewNote ? `
                    <div class="note-box">
                        <strong>Note from Regional Head:</strong><br/>
                        ${reviewNote}
                    </div>` : ''}

                    ${isApproved
            ? '<p style="color: #16a34a;">✅ Your profile has been updated with the approved changes.</p>'
            : '<p style="color: #64748b;">If you believe this is an error, please speak with your Regional Head directly.</p>'
        }

                    <p style="margin-top: 30px;">Best regards,<br/><strong>Fellowship Management System</strong></p>
                </div>
                <div class="footer">
                    <p>This is an automated notification. Do not reply to this email.</p>
                    <p>&copy; ${new Date().getFullYear()} Fellowship Manager. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const text = `
Hello ${memberFullName},

Your profile edit request has been ${decision}.

${decision === 'APPROVED' ? 'Your profile has been updated with the approved changes.' : 'Your request could not be approved at this time.'}

Requested Changes:
${changes.map((c) => `  ${c.field}: "${c.oldValue}" → "${c.newValue}"`).join('\n')}

${reviewNote ? `Note from Regional Head: ${reviewNote}` : ''}

Fellowship Management System
    `.trim();

    return await sendEmail(memberEmail, subject, html, text);
};
