import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import nodemailer from 'nodemailer';
import { findUserByEmail } from './data.js';
import { SessionPayload } from './types.js';

const SECRET = process.env.JWT_SECRET || 'veno-dev-secret';

// Initialize email transporter (Brevo SMTP)
const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
  port: Number(process.env.BREVO_SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER || '',
    pass: process.env.BREVO_SMTP_PASS || ''
  }
});

export function signToken(email: string, plan: string) {
  return jwt.sign({ email, plan }, SECRET, { expiresIn: '7d' });
}

export function authMiddleware(req: Request & { user?: SessionPayload }, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'missing token' });
  const token = header.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, SECRET) as SessionPayload;
    const user = findUserByEmail(decoded.email);
    if (!user) throw new Error('not found');
    req.user = { email: decoded.email, plan: user.plan };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

export async function sendCode(email: string, code: string) {
  if (!process.env.EMAIL_FROM) {
    throw new Error('EMAIL_FROM not configured. Set EMAIL_FROM in .env');
  }

  try {
    console.log(`[email] sending code to ${email} from ${process.env.EMAIL_FROM}`);
    const sent = await sendBrevoApi(email, code);
    if (!sent) {
      await sendBrevoSmtp(email, code);
    }
  } catch (err) {
    const details = err instanceof Error ? err.message : String(err);
    console.error(`[email] send failed for ${email}: ${details}`);
    throw new Error(`Failed to send email to ${email}`);
  }
}

async function sendBrevoApi(email: string, code: string): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return false;
  const from = process.env.EMAIL_FROM || '';
  const fromMatch = from.match(/^(.*)<(.+)>$/);
  const senderName = fromMatch ? fromMatch[1].trim().replace(/^"|"$/g, '') : 'Venoai.com';
  const senderEmail = fromMatch ? fromMatch[2].trim() : from.trim();
  if (!senderEmail) throw new Error('EMAIL_FROM must include a sender email');

  const payload = {
    sender: { name: senderName || 'Venoai.com', email: senderEmail },
    to: [{ email }],
    subject: 'VenoAI Verification Code',
    htmlContent: buildEmailHtml(code)
  };

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Brevo API failed: ${res.status} ${detail}`);
  }
  return true;
}

async function sendBrevoSmtp(email: string, code: string): Promise<void> {
  if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_PASS) {
    throw new Error('Brevo SMTP not configured. Set BREVO_SMTP_USER and BREVO_SMTP_PASS in .env');
  }
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'VenoAI Verification Code',
    html: buildEmailHtml(code)
  });
}

function buildEmailHtml(code: string): string {
  return `
    <div style="font-family: Arial, sans-serif; background: #05060a; color: #e8ecf3; padding: 20px;">
      <div style="max-width: 500px; margin: 0 auto; background: rgba(255,255,255,0.06); border-radius: 12px; padding: 30px; border: 1px solid rgba(255,255,255,0.08);">
        <h1 style="margin: 0 0 10px 0; color: #7cf5ff;">VenoAI Verification</h1>
        <p style="margin: 0 0 20px 0; color: #95a2c2;">Your 6-digit verification code:</p>
        <div style="background: linear-gradient(120deg, #7cf5ff, #ff8ed4); padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; color: #05060a; letter-spacing: 8px;">${code}</span>
        </div>
        <p style="margin: 0; color: #95a2c2; font-size: 14px;">This code expires in 10 minutes. Do not share it with anyone.</p>
      </div>
    </div>
  `;
}
