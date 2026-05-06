const axios = require("axios");
const config = require("../config");

// ── Round-robin sender: tries each configured key in order; errors only when all exhausted ──
function getSenders() {
  return [
    config.RESEND1_API_KEY ? { apiKey: config.RESEND1_API_KEY, domain: config.RESEND1_DOMAIN } : null,
    config.RESEND2_API_KEY ? { apiKey: config.RESEND2_API_KEY, domain: config.RESEND2_DOMAIN } : null,
    config.RESEND3_API_KEY ? { apiKey: config.RESEND3_API_KEY, domain: config.RESEND3_DOMAIN } : null,
    config.RESEND4_API_KEY ? { apiKey: config.RESEND4_API_KEY, domain: config.RESEND4_DOMAIN } : null,
    config.RESEND5_API_KEY ? { apiKey: config.RESEND5_API_KEY, domain: config.RESEND5_DOMAIN } : null,
  ].filter(Boolean);
}

async function sendMail({ to, subject, html, text }) {
  const senders = getSenders();
  if (!senders.length) {
    console.warn(`⚠️  Email not configured — skipped: ${subject}`);
    return;
  }

  // Always start from sender #1; only fall through to the next on rate-limit / quota errors
  const order = [...senders];

  let lastError = null;
  for (const sender of order) {
    const from = `${config.EMAIL_FROM_NAME} <no-reply@${sender.domain}>`;
    try {
      await axios.post(
        "https://api.resend.com/emails",
        { from, to, subject, html, text },
        { headers: { Authorization: `Bearer ${sender.apiKey}`, "Content-Type": "application/json" }, timeout: 12000 }
      );
      console.log(`📧 Email [${subject}] → ${to} via ${sender.domain}`);
      return; // success
    } catch (err) {
      lastError = err?.response?.data || err.message;
      const status = err?.response?.status;
      // Only continue to next sender for rate-limit / quota errors; fail fast on bad auth/config
      const retryable = !status || status === 429 || status >= 500;
      if (!retryable) break;
      console.warn(`⚠️  Sender ${sender.domain} failed (${status}), trying next…`);
    }
  }

  console.error("⚠️  All email senders failed:", JSON.stringify(lastError));
  throw new Error("Email delivery failed on all configured senders");
}

function logo() {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px">
      <tr>
        <td align="center">
          <img src="https://files.obedtech.top/image/u2wvoimage.jpg"
               alt="OBEDTECH MONITOR" width="56" height="56"
               style="border-radius:50%;display:block;border:2px solid #10b981;margin:0 auto 10px;object-fit:cover" />
          <p style="margin:0;font-size:17px;font-weight:700;font-family:Arial,sans-serif">
            <span style="color:#10b981">OBED</span><span style="color:#111">TECH MONITOR</span>
          </p>
        </td>
      </tr>
    </table>`;
}

function emailWrapper(content) {
  const year = new Date().getFullYear();
  const yearStr = year > 2026 ? `2026\u2013${year}` : '2026';
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e5e7eb">
      <tr><td>
        ${logo()}
        ${content}
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;border-top:1px solid #e5e7eb;padding-top:20px">
          <tr>
            <td style="font-size:12px;color:#9ca3af;text-align:center">
              &copy; ${yearStr} OBEDTECH MONITOR &middot; <a href="https://monitor.obedtech.top" style="color:#10b981;text-decoration:none">monitor.obedtech.top</a><br>
              You are receiving this because you have an account with OBEDTECH MONITOR.
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

async function sendVerificationLink(to, purpose, link) {
  const isReset = purpose === "reset";
  const isEmailChange = purpose === "email_change";
  const subject = isReset
    ? "Reset your OBEDTECH MONITOR password"
    : isEmailChange
    ? "Confirm your new email address — OBEDTECH MONITOR"
    : "Verify your OBEDTECH MONITOR account";
  const heading = isReset ? "Reset Your Password" : isEmailChange ? "Confirm Email Change" : "Verify Your Account";
  const bodyText = isReset
    ? "Click the button below to reset your password. This link expires in <strong>30 minutes</strong>."
    : isEmailChange
    ? "Click the button below to confirm your new email address. This link expires in <strong>30 minutes</strong>."
    : "Click the button below to verify your email address and activate your account. This link expires in <strong>30 minutes</strong>.";
  const btnLabel = isReset ? "Reset Password" : isEmailChange ? "Confirm New Email" : "Verify Account";
  const html = emailWrapper(`
    <h2 style="font-size:20px;font-weight:700;color:#111;margin:0 0 8px">${heading}</h2>
    <p style="color:#6b7280;margin:0 0 20px;font-size:14px;line-height:1.6">${bodyText}</p>
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:20px">
      <tr>
        <td align="center">
          <a href="${link}" style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px">${btnLabel}</a>
        </td>
      </tr>
    </table>
    <p style="color:#9ca3af;font-size:12px;margin:0 0 8px">Button not working? Copy and paste this link into your browser:</p>
    <p style="color:#10b981;font-size:12px;word-break:break-all;margin:0"><a href="${link}" style="color:#10b981">${link}</a></p>
    <p style="color:#9ca3af;font-size:12px;margin:16px 0 0">If you did not request this, you can safely ignore this email.</p>
  `);
  const text = `${heading}\n\n${btnLabel}: ${link}\n\nThis link expires in 30 minutes. If you did not request this, ignore this email.`;
  await sendMail({ to, subject, html, text });
}

async function sendMonitorCreated(to, userName, monitorName, url, intervalMins) {
  const html = emailWrapper(`
    <h2 style="font-size:20px;font-weight:700;color:#10b981;margin:0 0 8px">Monitor Created</h2>
    <p style="color:#6b7280;margin:0 0 20px;font-size:14px">Hi ${userName},</p>
    <p style="color:#6b7280;margin:0 0 16px;font-size:14px">Your monitor <strong style="color:#111">${monitorName}</strong> is now active and watching your service.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;margin-bottom:20px">
      <tr style="border-bottom:1px solid #e5e7eb">
        <td style="padding:12px 16px;color:#6b7280;font-size:13px;width:130px">URL</td>
        <td style="padding:12px 16px;font-weight:600;color:#111;font-size:13px;word-break:break-all">${url}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;color:#6b7280;font-size:13px">Check interval</td>
        <td style="padding:12px 16px;font-weight:600;color:#111;font-size:13px">Every ${intervalMins} minute${intervalMins !== 1 ? "s" : ""}</td>
      </tr>
    </table>
    <p style="color:#6b7280;font-size:13px;margin:0">You will receive an email alert if your service goes down. You can manage your monitors at <a href="${config.FRONTEND_URL}/monitors" style="color:#10b981;text-decoration:none">your dashboard</a>.</p>
  `);
  const text = `Monitor Created: ${monitorName}\n\nURL: ${url}\nInterval: every ${intervalMins} min(s)\n\nManage: ${config.FRONTEND_URL}/monitors`;
  await sendMail({ to, subject: `Monitor created: ${monitorName}`, html, text });
}

async function sendSiteDown(to, userName, monitorName, url, error, timeDetected) {
  const html = emailWrapper(`
    <table cellpadding="0" cellspacing="0" border="0" style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px 16px;margin-bottom:20px;width:100%">
      <tr>
        <td style="font-size:22px;width:36px;vertical-align:top;padding-right:10px">🔴</td>
        <td>
          <p style="margin:0;font-weight:700;color:#991b1b;font-size:15px">Site Down Alert</p>
          <p style="margin:4px 0 0;color:#b91c1c;font-size:13px">${monitorName} is not responding</p>
        </td>
      </tr>
    </table>
    <p style="color:#6b7280;margin:0 0 16px;font-size:14px">Hi ${userName}, we detected that <strong style="color:#111">${monitorName}</strong> is currently down.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;margin-bottom:20px">
      <tr style="border-bottom:1px solid #e5e7eb">
        <td style="padding:12px 16px;color:#6b7280;font-size:13px;width:130px">URL</td>
        <td style="padding:12px 16px;font-weight:600;color:#111;font-size:13px;word-break:break-all">${url}</td>
      </tr>
      <tr style="border-bottom:1px solid #e5e7eb">
        <td style="padding:12px 16px;color:#6b7280;font-size:13px">Error</td>
        <td style="padding:12px 16px;font-weight:600;color:#dc2626;font-size:13px">${error}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;color:#6b7280;font-size:13px">Detected at</td>
        <td style="padding:12px 16px;font-weight:600;color:#111;font-size:13px">${timeDetected}</td>
      </tr>
    </table>
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:16px">
      <tr>
        <td align="center">
          <a href="${config.FRONTEND_URL}/monitors" style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px">View Monitors</a>
        </td>
      </tr>
    </table>
    <p style="color:#9ca3af;font-size:12px;margin:0">You will receive another email when your service recovers.</p>
  `);
  const text = `🔴 DOWN: ${monitorName}\nURL: ${url}\nError: ${error}\nDetected: ${timeDetected}\n\nView: ${config.FRONTEND_URL}/monitors`;
  await sendMail({ to, subject: `🔴 DOWN: ${monitorName} is not responding`, html, text });
}

async function sendSiteRecovered(to, userName, monitorName, url, responseTime, downtimeDuration) {
  const html = emailWrapper(`
    <table cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 16px;margin-bottom:20px;width:100%">
      <tr>
        <td style="font-size:22px;width:36px;vertical-align:top;padding-right:10px">✅</td>
        <td>
          <p style="margin:0;font-weight:700;color:#166534;font-size:15px">Site Recovered</p>
          <p style="margin:4px 0 0;color:#15803d;font-size:13px">${monitorName} is back online</p>
        </td>
      </tr>
    </table>
    <p style="color:#6b7280;margin:0 0 16px;font-size:14px">Hi ${userName}, <strong style="color:#111">${monitorName}</strong> is back online and responding normally.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;margin-bottom:20px">
      <tr style="border-bottom:1px solid #e5e7eb">
        <td style="padding:12px 16px;color:#6b7280;font-size:13px;width:130px">URL</td>
        <td style="padding:12px 16px;font-weight:600;color:#111;font-size:13px;word-break:break-all">${url}</td>
      </tr>
      <tr style="border-bottom:1px solid #e5e7eb">
        <td style="padding:12px 16px;color:#6b7280;font-size:13px">Response time</td>
        <td style="padding:12px 16px;font-weight:600;color:#10b981;font-size:13px">${responseTime}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;color:#6b7280;font-size:13px">Was down for</td>
        <td style="padding:12px 16px;font-weight:600;color:#111;font-size:13px">${downtimeDuration}</td>
      </tr>
    </table>
    <p style="color:#9ca3af;font-size:12px;margin:0">We continue monitoring your service and will alert you if it goes down again.</p>
  `);
  const text = `✅ RECOVERED: ${monitorName}\nURL: ${url}\nResponse time: ${responseTime}\nWas down for: ${downtimeDuration}`;
  await sendMail({ to, subject: `✅ RECOVERED: ${monitorName} is back online`, html, text });
}

async function sendWelcome(to, userName) {
  const html = emailWrapper(`
    <h2 style="font-size:20px;font-weight:700;color:#111;margin:0 0 8px">Welcome to OBEDTECH MONITOR! 🎉</h2>
    <p style="color:#6b7280;margin:0 0 16px;font-size:14px">Hi ${userName}, your account is verified and ready to use.</p>
    <p style="color:#6b7280;margin:0 0 20px;font-size:14px">Get started by adding your first monitor — it takes less than a minute.</p>
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:16px">
      <tr>
        <td align="center">
          <a href="${config.FRONTEND_URL}/monitors/new" style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px">Add Your First Monitor</a>
        </td>
      </tr>
    </table>
    <p style="color:#9ca3af;font-size:12px;margin:0">Need help? Reply to this email or visit our <a href="${config.FRONTEND_URL}/contact" style="color:#10b981;text-decoration:none">contact page</a>.</p>
  `);
  const text = `Welcome to OBEDTECH MONITOR, ${userName}!\n\nYour account is ready. Add your first monitor: ${config.FRONTEND_URL}/monitors/new`;
  await sendMail({ to, subject: "Welcome to OBEDTECH MONITOR — you're all set!", html, text });
}

function formatDuration(ms) {
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function formatTime(date) {
  return new Date(date).toLocaleString("en-KE", { timeZone: config.TIMEZONE, hour12: false });
}

module.exports = { sendVerificationLink, sendWelcome, sendMonitorCreated, sendSiteDown, sendSiteRecovered, formatDuration, formatTime };
