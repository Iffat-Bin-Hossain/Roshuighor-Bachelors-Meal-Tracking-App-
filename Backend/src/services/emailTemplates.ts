import { LOGO_CID, MailMessage } from './mailer.js';
import { env } from '../config/env.js';

export type MailLang = 'bn' | 'en';

const BRAND = {
  green: '#0E3D2F',
  terracotta: '#C84B23',
  ivory: '#FAF7F2',
  cream: '#F5EFE6',
  border: '#E8E1D5',
  text: '#14241F',
  muted: '#566861'
};

const FONT = `'Hind Siliguri','Noto Sans Bengali','Segoe UI',Roboto,Helvetica,Arial,sans-serif`;

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const normLang = (lang?: string): MailLang => (lang === 'en' ? 'en' : 'bn');

const FOOTER = {
  bn: {
    tagline: 'রসুইঘর — ব্যাচেলর মিল ট্র্যাকার',
    auto: 'এটি একটি স্বয়ংক্রিয় ইমেইল। অনুগ্রহ করে এর উত্তর দেবেন না।'
  },
  en: {
    tagline: 'রসুইঘর (Rosuighor) — Bachelor Meal Tracker',
    auto: 'This is an automated email. Please do not reply.'
  }
};

interface LayoutOpts {
  lang: MailLang;
  preheader: string;
  heading: string;
  bodyHtml: string;
}

const layout = ({ lang, preheader, heading, bodyHtml }: LayoutOpts): string => {
  const f = FOOTER[lang];
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.ivory};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.ivory};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr>
          <td align="center" style="padding:0 0 20px;">
            <img src="cid:${LOGO_CID}" width="180" alt="রসুইঘর" style="display:block;width:180px;max-width:60%;height:auto;border:0;">
          </td>
        </tr>
        <tr>
          <td style="background:#FFFFFF;border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="height:6px;line-height:6px;font-size:0;background:${BRAND.green};">&nbsp;</td></tr>
              <tr>
                <td style="padding:32px 36px 12px;font-family:${FONT};">
                  <h1 style="margin:0 0 16px;font-size:22px;line-height:1.4;color:${BRAND.green};font-weight:700;">${escapeHtml(heading)}</h1>
                  ${bodyHtml}
                </td>
              </tr>
              <tr><td style="padding:0 36px 32px;"></td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:20px 24px 0;font-family:${FONT};font-size:12px;line-height:1.7;color:${BRAND.muted};">
            <strong style="color:${BRAND.green};">${f.tagline}</strong><br>
            ${f.auto}<br>
            © ${year} রসুইঘর
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
};

const p = (html: string) =>
  `<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:${BRAND.text};">${html}</p>`;

const note = (html: string) =>
  `<p style="margin:18px 0 0;padding:12px 14px;background:${BRAND.cream};border-radius:10px;font-size:13px;line-height:1.6;color:${BRAND.muted};">${html}</p>`;

const codeBlock = (code: string, label: string) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 18px;">
  <tr>
    <td align="center" style="padding:20px 12px;background:${BRAND.cream};border:2px dashed ${BRAND.terracotta};border-radius:12px;">
      <div style="font-family:${FONT};font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${BRAND.muted};margin-bottom:6px;">${label}</div>
      <div style="font-family:'Courier New',Courier,monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:${BRAND.green};">${code}</div>
    </td>
  </tr>
</table>`;

const button = (href: string, label: string) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 4px;">
  <tr>
    <td style="border-radius:10px;background:${BRAND.green};">
      <a href="${href}" style="display:inline-block;padding:12px 26px;font-family:${FONT};font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:10px;">${label}</a>
    </td>
  </tr>
</table>`;

const toBnDigits = (s: string | number) => String(s).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]);

/* ───────────────────────── Verification code ───────────────────────── */

export const verificationEmail = (opts: { to: string; name: string; code: string; minutes: number; lang?: string }): MailMessage => {
  const lang = normLang(opts.lang);
  const name = escapeHtml(opts.name);
  const { code, minutes } = opts;

  if (lang === 'bn') {
    return {
      to: opts.to,
      subject: `${code} — রসুইঘর ইমেইল যাচাইকরণ কোড`,
      html: layout({
        lang,
        preheader: `আপনার যাচাইকরণ কোড ${code}। ${toBnDigits(minutes)} মিনিটের মধ্যে ব্যবহার করুন।`,
        heading: 'আপনার ইমেইল যাচাই করুন',
        bodyHtml:
          p(`প্রিয় <strong>${name}</strong>,`) +
          p('রসুইঘরে অ্যাকাউন্ট খোলার জন্য ধন্যবাদ! অ্যাকাউন্ট চালু করতে নিচের ৬ সংখ্যার কোডটি অ্যাপে লিখুন:') +
          codeBlock(code, 'যাচাইকরণ কোড') +
          p(`কোডটি <strong>${toBnDigits(minutes)} মিনিট</strong> পর্যন্ত কার্যকর থাকবে।`) +
          note('আপনি যদি রসুইঘরে অ্যাকাউন্ট না খুলে থাকেন, তাহলে এই ইমেইলটি উপেক্ষা করুন। কোডটি কখনো কারো সাথে শেয়ার করবেন না।')
      }),
      text:
        `প্রিয় ${opts.name},\n\nরসুইঘরে অ্যাকাউন্ট খোলার জন্য ধন্যবাদ!\n\n` +
        `আপনার যাচাইকরণ কোড: ${code}\n\nকোডটি ${toBnDigits(minutes)} মিনিট পর্যন্ত কার্যকর থাকবে।\n\n` +
        `আপনি যদি অ্যাকাউন্ট না খুলে থাকেন, এই ইমেইলটি উপেক্ষা করুন।\n\n— রসুইঘর`
    };
  }

  return {
    to: opts.to,
    subject: `${code} is your Rosuighor verification code`,
    html: layout({
      lang,
      preheader: `Your verification code is ${code}. It expires in ${minutes} minutes.`,
      heading: 'Verify your email address',
      bodyHtml:
        p(`Hi <strong>${name}</strong>,`) +
        p('Thanks for signing up for রসুইঘর (Rosuighor)! Enter the 6-digit code below in the app to activate your account:') +
        codeBlock(code, 'Verification code') +
        p(`This code expires in <strong>${minutes} minutes</strong>.`) +
        note("If you didn't create a Rosuighor account, you can safely ignore this email. Never share this code with anyone.")
    }),
    text:
      `Hi ${opts.name},\n\nThanks for signing up for Rosuighor!\n\n` +
      `Your verification code: ${code}\n\nThis code expires in ${minutes} minutes.\n\n` +
      `If you didn't create an account, ignore this email.\n\n— Rosuighor`
  };
};

/* ───────────────────────── Password reset code ───────────────────────── */

export const passwordResetEmail = (opts: { to: string; name: string; code: string; minutes: number; lang?: string }): MailMessage => {
  const lang = normLang(opts.lang);
  const name = escapeHtml(opts.name);
  const { code, minutes } = opts;

  if (lang === 'bn') {
    return {
      to: opts.to,
      subject: `${code} — রসুইঘর পাসওয়ার্ড রিসেট কোড`,
      html: layout({
        lang,
        preheader: `পাসওয়ার্ড রিসেট কোড ${code}। ${toBnDigits(minutes)} মিনিটের মধ্যে ব্যবহার করুন।`,
        heading: 'পাসওয়ার্ড রিসেট করুন',
        bodyHtml:
          p(`প্রিয় <strong>${name}</strong>,`) +
          p('আপনার রসুইঘর অ্যাকাউন্টের পাসওয়ার্ড রিসেট করার অনুরোধ পেয়েছি। নতুন পাসওয়ার্ড সেট করতে নিচের কোডটি অ্যাপে লিখুন:') +
          codeBlock(code, 'রিসেট কোড') +
          p(`কোডটি <strong>${toBnDigits(minutes)} মিনিট</strong> পর্যন্ত কার্যকর থাকবে।`) +
          note('আপনি যদি পাসওয়ার্ড রিসেটের অনুরোধ না করে থাকেন, তাহলে এই ইমেইলটি উপেক্ষা করুন — আপনার পাসওয়ার্ড অপরিবর্তিত থাকবে।')
      }),
      text:
        `প্রিয় ${opts.name},\n\nআপনার রসুইঘর অ্যাকাউন্টের পাসওয়ার্ড রিসেট করার অনুরোধ পেয়েছি।\n\n` +
        `আপনার রিসেট কোড: ${code}\n\nকোডটি ${toBnDigits(minutes)} মিনিট পর্যন্ত কার্যকর থাকবে।\n\n` +
        `আপনি অনুরোধ না করে থাকলে এই ইমেইলটি উপেক্ষা করুন।\n\n— রসুইঘর`
    };
  }

  return {
    to: opts.to,
    subject: `${code} is your Rosuighor password reset code`,
    html: layout({
      lang,
      preheader: `Your password reset code is ${code}. It expires in ${minutes} minutes.`,
      heading: 'Reset your password',
      bodyHtml:
        p(`Hi <strong>${name}</strong>,`) +
        p('We received a request to reset the password for your Rosuighor account. Enter the code below in the app to choose a new password:') +
        codeBlock(code, 'Reset code') +
        p(`This code expires in <strong>${minutes} minutes</strong>.`) +
        note("If you didn't request a password reset, ignore this email — your password will stay the same.")
    }),
    text:
      `Hi ${opts.name},\n\nWe received a request to reset your Rosuighor password.\n\n` +
      `Your reset code: ${code}\n\nThis code expires in ${minutes} minutes.\n\n` +
      `If you didn't request this, ignore this email.\n\n— Rosuighor`
  };
};

/* ───────────────────────── Welcome (after verification) ───────────────────────── */

export const welcomeEmail = (opts: { to: string; name: string; lang?: string }): MailMessage => {
  const lang = normLang(opts.lang);
  const name = escapeHtml(opts.name);
  const url = env.clientUrl;

  if (lang === 'bn') {
    return {
      to: opts.to,
      subject: 'রসুইঘরে স্বাগতম! 🍛',
      html: layout({
        lang,
        preheader: 'আপনার অ্যাকাউন্ট চালু হয়েছে। এখনই আপনার ঘর তৈরি করুন।',
        heading: 'রসুইঘরে স্বাগতম!',
        bodyHtml:
          p(`প্রিয় <strong>${name}</strong>,`) +
          p('আপনার ইমেইল সফলভাবে যাচাই হয়েছে এবং অ্যাকাউন্ট চালু হয়েছে। শুরু করতে:') +
          `<ol style="margin:0 0 18px;padding-left:22px;font-size:15px;line-height:1.9;color:${BRAND.text};">
            <li>নতুন ঘর তৈরি করুন অথবা ইনভাইট লিংক দিয়ে যুক্ত হোন</li>
            <li>মেস সাইকেল চালু করুন (ডিফল্ট ১০ দিন)</li>
            <li>প্রতিদিনের মিল, বাজার ও জমা আপডেট করুন</li>
          </ol>` +
          button(url, 'রসুইঘর খুলুন')
      }),
      text:
        `প্রিয় ${opts.name},\n\nআপনার ইমেইল যাচাই হয়েছে এবং অ্যাকাউন্ট চালু হয়েছে।\n\n` +
        `১. নতুন ঘর তৈরি করুন অথবা ইনভাইট লিংক দিয়ে যুক্ত হোন\n২. মেস সাইকেল চালু করুন\n৩. প্রতিদিনের মিল, বাজার ও জমা আপডেট করুন\n\n${url}\n\n— রসুইঘর`
    };
  }

  return {
    to: opts.to,
    subject: 'Welcome to রসুইঘর (Rosuighor)! 🍛',
    html: layout({
      lang,
      preheader: 'Your account is active. Create your home and start tracking meals.',
      heading: 'Welcome to Rosuighor!',
      bodyHtml:
        p(`Hi <strong>${name}</strong>,`) +
        p('Your email has been verified and your account is now active. To get started:') +
        `<ol style="margin:0 0 18px;padding-left:22px;font-size:15px;line-height:1.9;color:${BRAND.text};">
          <li>Create a new home, or join one with an invite link</li>
          <li>Start a mess cycle (10 days by default)</li>
          <li>Update daily meals, bazaar costs and deposits</li>
        </ol>` +
        button(url, 'Open Rosuighor')
    }),
    text:
      `Hi ${opts.name},\n\nYour email is verified and your account is active.\n\n` +
      `1. Create a new home, or join one with an invite link\n2. Start a mess cycle\n3. Update daily meals, bazaar costs and deposits\n\n${url}\n\n— Rosuighor`
  };
};

/* ───────────────────────── Password changed notice ───────────────────────── */

export const passwordChangedEmail = (opts: { to: string; name: string; lang?: string }): MailMessage => {
  const lang = normLang(opts.lang);
  const name = escapeHtml(opts.name);
  const when = new Date().toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-GB', {
    timeZone: 'Asia/Dhaka',
    dateStyle: 'long',
    timeStyle: 'short'
  });

  if (lang === 'bn') {
    return {
      to: opts.to,
      subject: 'আপনার রসুইঘর পাসওয়ার্ড পরিবর্তন হয়েছে',
      html: layout({
        lang,
        preheader: 'আপনার অ্যাকাউন্টের পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।',
        heading: 'পাসওয়ার্ড পরিবর্তন হয়েছে',
        bodyHtml:
          p(`প্রিয় <strong>${name}</strong>,`) +
          p(`আপনার রসুইঘর অ্যাকাউন্টের পাসওয়ার্ড <strong>${escapeHtml(when)}</strong> (বাংলাদেশ সময়) পরিবর্তন করা হয়েছে। নিরাপত্তার জন্য অন্যান্য সব ডিভাইস থেকে লগআউট করা হয়েছে।`) +
          note('আপনি নিজে এই পরিবর্তন না করে থাকলে, এখনই অ্যাপে গিয়ে "পাসওয়ার্ড ভুলে গেছেন?" অপশন ব্যবহার করে পাসওয়ার্ড রিসেট করুন।')
      }),
      text:
        `প্রিয় ${opts.name},\n\nআপনার রসুইঘর পাসওয়ার্ড ${when} (বাংলাদেশ সময়) পরিবর্তন করা হয়েছে।\n\n` +
        `আপনি নিজে এটি না করে থাকলে, এখনই "পাসওয়ার্ড ভুলে গেছেন?" ব্যবহার করে পাসওয়ার্ড রিসেট করুন।\n\n— রসুইঘর`
    };
  }

  return {
    to: opts.to,
    subject: 'Your Rosuighor password was changed',
    html: layout({
      lang,
      preheader: 'The password for your account was just changed.',
      heading: 'Password changed',
      bodyHtml:
        p(`Hi <strong>${name}</strong>,`) +
        p(`The password for your Rosuighor account was changed on <strong>${escapeHtml(when)}</strong> (Bangladesh time). For your security, all other devices have been signed out.`) +
        note('If you didn\'t make this change, reset your password right away using "Forgot password?" in the app.')
    }),
    text:
      `Hi ${opts.name},\n\nYour Rosuighor password was changed on ${when} (Bangladesh time).\n\n` +
      `If you didn't do this, reset your password right away using "Forgot password?".\n\n— Rosuighor`
  };
};
