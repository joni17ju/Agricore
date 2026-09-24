/**
 * The password reset code email.
 *
 * Written for email clients, not browsers: a table-based layout with every
 * style inline. Outlook renders through Word, Gmail strips <style> blocks and
 * external stylesheets, and none of them can be relied on for flexbox, grid,
 * custom properties or web fonts. So none of the app's own CSS is used here —
 * the palette below is copied from frontend/src/styles/tokens.css by hand and
 * has to be updated by hand if the brand colours change.
 *
 * A plain-text part goes out alongside it for clients that refuse HTML.
 */

/** Copied from the app's design tokens; see the note above. */
const GREEN_900 = '#0b3a22';
const GREEN_800 = '#0e4d2c';
const GREEN_700 = '#0f7a3a';
const GREEN_100 = '#dcf5e4';
const GREEN_50 = '#effaf2';
const INK = '#1b2420';
const MUTED = '#5f6d66';
const BORDER = '#dfe7e2';

/*
 * Arial/Helvetica rather than the app's typeface: web fonts are blocked by
 * most clients, and a font stack that fails renders as Times New Roman.
 */
const FONT = "Arial, 'Helvetica Neue', Helvetica, sans-serif";

/*
 * The digits are spread with letter-spacing rather than by inserting spaces
 * between them. Real spaces are wrap opportunities, and on a narrow phone the
 * code broke across two lines — which for something you read and retype is
 * worse than useless. Letter-spacing cannot wrap, and selecting the code still
 * copies six clean digits with nothing in between.
 */

export function resetCodeSubject(code) {
  // The code in the subject line saves opening the mail on a phone.
  return `${code} is your AgriCore verification code`;
}

export function resetCodeText({ firstName, code, expiryMinutes }) {
  return [
    `Hi ${firstName},`,
    '',
    'Use this verification code to reset your AgriCore password:',
    '',
    `    ${code}`,
    '',
    `This code expires in ${expiryMinutes} minutes and can only be used once.`,
    '',
    'If you did not ask to reset your password, you can ignore this email —',
    'your password stays as it is.',
    '',
    'AgriCore',
    'Principles of Crop Protection I',
  ].join('\n');
}

export function resetCodeHtml({ firstName, code, expiryMinutes }) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Your AgriCore verification code</title>
</head>
<body style="margin:0; padding:0; background-color:${GREEN_50}; font-family:${FONT};">
<!-- Preheader: the grey preview line in the inbox. Hidden in the body itself. -->
<div style="display:none; font-size:1px; color:${GREEN_50}; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
Your verification code is ${code}. It expires in ${expiryMinutes} minutes.
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${GREEN_50}; padding:24px 12px;">
<tr>
<td align="center">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; background-color:#ffffff; border:1px solid ${BORDER}; border-radius:12px; overflow:hidden;">

  <!-- Banner -->
  <tr>
    <td style="background-color:${GREEN_800}; padding:28px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <!-- The sprout mark is drawn with a table cell rather than an image:
               many clients block remote images by default, and an image-only
               logo would leave a broken box at the top of the mail. -->
          <td style="padding-right:12px; vertical-align:middle;">
            <div style="width:36px; height:36px; background-color:${GREEN_700}; border-radius:9px; text-align:center; line-height:36px; font-size:20px;">&#127793;</div>
          </td>
          <td style="vertical-align:middle;">
            <div style="color:#ffffff; font-family:${FONT}; font-size:21px; font-weight:bold; letter-spacing:-0.2px;">AgriCore</div>
            <div style="color:${GREEN_100}; font-family:${FONT}; font-size:12px; padding-top:2px;">Principles of Crop Protection I</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:32px 32px 8px 32px; font-family:${FONT};">
      <h1 style="margin:0 0 14px 0; font-size:20px; line-height:1.3; color:${INK}; font-weight:bold;">Reset your password</h1>
      <p style="margin:0 0 6px 0; font-size:15px; line-height:1.6; color:${INK};">Hi ${firstName},</p>
      <p style="margin:0 0 24px 0; font-size:15px; line-height:1.6; color:${MUTED};">
        Enter this verification code in AgriCore to continue resetting your password.
      </p>
    </td>
  </tr>

  <!-- Code -->
  <tr>
    <td style="padding:0 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${GREEN_50}; border:1px solid ${GREEN_100}; border-radius:10px;">
        <tr>
          <td align="center" style="padding:22px 16px; font-family:${FONT};">
            <div style="font-size:11px; letter-spacing:1.4px; text-transform:uppercase; color:${MUTED}; padding-bottom:10px;">Verification code</div>
            <div style="font-family:'Courier New', Courier, monospace; font-size:34px; font-weight:bold; color:${GREEN_900}; letter-spacing:8px; line-height:1.2; white-space:nowrap;">${code}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Expiry -->
  <tr>
    <td style="padding:20px 32px 0 32px; font-family:${FONT};">
      <p style="margin:0; font-size:14px; line-height:1.6; color:${MUTED};">
        This code expires in <strong style="color:${INK};">${expiryMinutes} minutes</strong> and can only be used once.
      </p>
      <p style="margin:14px 0 0 0; font-size:14px; line-height:1.6; color:${MUTED};">
        Did not request this? You can safely ignore this email — your password will stay as it is.
      </p>
    </td>
  </tr>

  <tr>
    <td style="padding:24px 32px 0 32px;">
      <div style="height:1px; background-color:${BORDER}; line-height:1px; font-size:0;">&nbsp;</div>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding:16px 32px 28px 32px; font-family:${FONT};">
      <p style="margin:0; font-size:12px; line-height:1.6; color:${MUTED};">
        AgriCore &middot; Davao Oriental State University<br />
        This is an automated message, so please do not reply to it.
      </p>
    </td>
  </tr>

</table>

</td>
</tr>
</table>
</body>
</html>`;
}
