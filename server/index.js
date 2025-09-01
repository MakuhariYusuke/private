import express from 'express';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import cors from 'cors';
import helmet from 'helmet';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Basic health
app.get('/health', (req, res) => res.json({ ok: true }));

app.post('/api/contact', async (req, res) => {
  try {
    // simple API key check
    const providedKey = req.get('x-api-key') || '';
    if (!process.env.API_KEY || providedKey !== process.env.API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subject, name, email, message } = req.body || {};
    if (!subject || !name || !email || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: process.env.FROM_EMAIL || 'no-reply@example.com',
      to: process.env.TO_EMAIL,
      subject: `[Web問合せ] ${subject}`,
      text: `送信者: ${name} <${email}>\n\n${message}`,
      html: `<p>送信者: <strong>${name}</strong> &lt;${email}&gt;</p><hr/><p>${message.replace(/\n/g,'<br/>')}</p>`,
    };

    await transporter.sendMail(mailOptions);

    return res.json({ ok: true });
  } catch (err) {
    console.error('send error', err);
    return res.status(500).json({ error: 'Failed to send' });
  }
});

app.listen(port, () => console.log(`Form server listening on ${port}`));
