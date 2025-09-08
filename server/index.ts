/**
 * Express server for handling contact form submissions.
 * This server receives form submissions from the client, validates the data,
 * and sends an email using the configured SMTP server.
 *
 * @author Keisuke Ohta 太田啓介
 */

import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import cors from 'cors';
import helmet from 'helmet';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());

/**
 * Escapes HTML special characters in a string.
 * @param {string} s The input string to escape.
 * @returns {string} The escaped string.
 */
function escapeHtml(s: string = ''): string {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Strips carriage return and line feed characters from a string.
 * @param {string} s The input string.
 * @returns {string} The sanitized string.
 */
function stripCRLF(s: string = ''): string {
    return String(s).replace(/\r|\n/g, ' ').trim();
}

/**
 * Health check endpoint.
 * Responds with a simple JSON object indicating the server is running.
 */
app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));

/**
 * Contact form submission endpoint.
 * Validates the incoming data and sends an email.
 * Expects the following fields in the request body:
 * - company (optional) string
 * - subject string (required)
 * - name string (required)
 * - email string (required, valid email format)
 * - message string (required)
 */
app.post('/api/contact', async (req: Request, res: Response) => {
    try {
        const providedKey = (req.get('x-api-key') || '').toString();
        const expectedKey = process.env.API_KEY || '';
        if (!expectedKey || providedKey !== expectedKey) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { company, subject, name, email, message } = req.body || {};
        if (!subject || !name || !email || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Basic server-side sanitization / validation
        const clamp = (s = '', n = 200) => String(s).slice(0, n);
        const sanitizeHeader = (s = '', n = 200) => clamp(stripCRLF(s), n);
        const sanitizeMessage = (s = '') => {
            // allow newlines in message but remove null bytes
            return String(s).replace(/\0/g, '').trim().slice(0, 10000);
        };

        const safeSubjectHeader = sanitizeHeader(subject, 200);
        const safeNameHeader = sanitizeHeader(name, 200);
        const safeEmailHeader = sanitizeHeader(email, 256);
        const safeCompanyHeader = company ? sanitizeHeader(company, 200) : '';
        const safeMessage = sanitizeMessage(message);

        // Basic email validation; reject if invalid
        const emailRe = /^(?:[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}|(?:\d{1,3}\.){3}\d{1,3})(?::\d+)?$/;
        if (!emailRe.test(safeEmailHeader)) return res.status(400).json({ error: 'Invalid email' });

        let transporter: nodemailer.Transporter | null = null;
        let usingTestAccount = false;
        let defaultToEmail: string | undefined = undefined;

        if (process.env.SMTP_HOST) {
            transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT || 587),
                secure: String(process.env.SMTP_PORT).trim() === '465',
                auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
            });
        } else {
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: { user: testAccount.user, pass: testAccount.pass },
            });
            // If no TO_EMAIL configured, keep the test account address locally so previews work.
            defaultToEmail = process.env.TO_EMAIL || testAccount.user;
            usingTestAccount = true;
        }

        const senderInfoHtml = `<strong>${escapeHtml(safeNameHeader)}</strong> &lt;${escapeHtml(safeEmailHeader)}&gt;${safeCompanyHeader ? `<br/><small>会社: ${escapeHtml(safeCompanyHeader)}</small>` : ''}`;

        // Choose destination: prefer configured TO_EMAIL, otherwise fallback to test account or default recipient.
        const toEmail = process.env.TO_EMAIL || defaultToEmail || 'ootkisk@gmail.com';

        // Build nicer subject: include company (if any) and timestamp
        const now = new Date();
        const ts = now.toISOString().replace('T', ' ').replace(/:\d{2}\.\d+Z$/, '');
        const prettyCompany = safeCompanyHeader ? ` (${escapeHtml(safeCompanyHeader)})` : '';
        const subjectLine = `[Web問合せ] ${escapeHtml(safeSubjectHeader)}${prettyCompany} — ${ts}`;

        // Build HTML email with a simple table for metadata and a preformatted message section
        const htmlBody = `<!doctype html>
<html><head><meta charset="utf-8"><style>body{font-family:system-ui,Segoe UI,Helvetica,Arial;padding:18px;color:#072b3a}table{border-collapse:collapse;width:100%;max-width:700px}th,td{padding:8px;border:1px solid #e6eef6;text-align:left}th{background:#f6fbfc}</style></head><body>
    <h2>Webサイトお問い合わせ</h2>
    <table>
        <tr><th>項目</th><th>内容</th></tr>
        <tr><td>日付</td><td>${escapeHtml(now.toISOString())}</td></tr>
        <tr><td>件名</td><td>${escapeHtml(safeSubjectHeader)}</td></tr>
        <tr><td>送信者</td><td>${senderInfoHtml}</td></tr>
    </table>
    <h3>メッセージ</h3>
    <div style="white-space:pre-wrap;border:1px solid #e6eef6;padding:12px;border-radius:6px;max-width:700px">${escapeHtml(safeMessage)}</div>
    <hr/>
    <small>送信元: ${escapeHtml(
            (
                req.ip
                || (req.socket && req.socket.remoteAddress)
                || req.hostname
                || 'unknown'
            ) as string
        )}</small>
</body></html>`;

        const textBody = `日付: ${now.toISOString()}\n件名: ${safeSubjectHeader}\n送信者: ${safeNameHeader} <${safeEmailHeader}>${safeCompanyHeader ? `\n会社: ${safeCompanyHeader}` : ''}\n\n${safeMessage}`;

        // Sanitize HTML body server-side with DOMPurify + jsdom
        try {
            const windowForPurify = new JSDOM('').window as any;
            const DOMPurify = createDOMPurify(windowForPurify as any);
            const sanitizedHtml = DOMPurify.sanitize(htmlBody);

            const mailOptions: nodemailer.SendMailOptions = {
                from: process.env.FROM_EMAIL || toEmail || 'no-reply@example.com',
                to: toEmail,
                subject: subjectLine,
                text: textBody,
                html: sanitizedHtml,
            };

            const info = await transporter.sendMail(mailOptions);
            const previewUrl = usingTestAccount ? nodemailer.getTestMessageUrl(info) : null;
            if (previewUrl) console.log('Preview URL:', previewUrl);

            return res.json({ ok: true, previewUrl });
        } catch (sendErr) {
            console.error('Sanitize/send error:', sendErr);
            return res.status(500).json({ error: 'Failed to sanitize or send email' });
        }
    } catch (err: unknown) {
        console.error('send error:', err);
        return res.status(500).json({ error: 'Failed to send', details: err instanceof Error ? err.message : String(err) });
    }
});

/**
 * Starts the Express server.
 * Listens on the configured port (default 3001).
 */
app.listen(port, () => console.log(`Form server listening on ${port}`));
