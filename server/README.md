# Form server (Express + nodemailer)

This is a minimal example server to receive contact form submissions and forward them via SMTP.

Setup

1. Copy `.env.example` to `.env` and fill the SMTP settings and target email.

2. Install dependencies and start:

```bash
cd server
npm install
npm start
```

Usage

POST JSON to `/api/contact` with fields: `subject`, `name`, `email`, `message`.

Security

This is a demo. For production you MUST:
- Use TLS and secure email credentials.
- Add authentication or CAPTCHA to prevent abuse.
- Rate-limit requests and validate inputs server-side.
- Sanitize content before sending.
