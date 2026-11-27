/**
 * Terms and Conditions and Privacy Notice for AgriCore — the wording lives
 * here, in one place; LegalPage.jsx lays out both documents the same way.
 *
 * Each section is { id, heading, blocks }, where a block is a paragraph
 * string or { list: [...] } for a bulleted list. Section ids are the anchors
 * the table of contents links to (e.g. /privacy#your-rights).
 *
 * Placeholders to replace before going live:
 *   CONTACT_EMAIL   — the address people should write to
 *   CONTACT_ADDRESS — the postal address
 *
 * When the wording changes in substance, update LAST_UPDATED and bump
 * TERMS_VERSION: the version a student agreed to is saved on their account
 * when they register.
 */
export const TERMS_VERSION = '2026-11-27';
export const LAST_UPDATED = '27 November 2026';

export const CONTACT_EMAIL = 'support@agricore.edu.ph';
export const CONTACT_ADDRESS = 'Davao Oriental State University, Mati City, Davao Oriental, Philippines';

export const TERMS = {
  slug: 'terms',
  title: 'Terms and Conditions',
  summary:
    'These Terms and Conditions govern your use of AgriCore, the learning platform for Principles of Crop Protection I at Davao Oriental State University. They explain what you can expect from AgriCore and what AgriCore expects from you. Please read them carefully before creating an account.',
  sections: [
    {
      id: 'acceptance',
      heading: 'Acceptance of Terms',
      blocks: [
        'By creating an account, signing in or otherwise using AgriCore (the "Platform"), you agree to these Terms and Conditions and to the Privacy Notice. If you do not agree, please do not use the Platform.',
        'If you use the Platform on behalf of a class or as an instructor, you also agree to these Terms in that role.',
      ],
    },
    {
      id: 'about',
      heading: 'About AgriCore',
      blocks: [
        'AgriCore is an online learning platform for the course Principles of Crop Protection I at Davao Oriental State University. It provides lessons, interactive missions, progress tracking, experience points (XP), badges and section leaderboards.',
        'AgriCore supports, and does not replace, the instruction, assessment and policies of the course and of the University.',
      ],
    },
    {
      id: 'accounts',
      heading: 'Eligibility and Accounts',
      blocks: [
        'Student accounts are for students enrolled in the course. When you register, you must give accurate information: your real name, a valid email address, your school ID number and your section.',
        'New student accounts must be approved by an instructor before they can be used. AgriCore may decline or remove a registration that appears to be inaccurate or that does not belong to an enrolled student.',
        {
          list: [
            'Keep your password private and do not share your account with anyone.',
            'You are responsible for all activity that takes place under your account.',
            'If you think someone else has used your account, change your password and tell your instructor straight away.',
            'Each person may have only one student account.',
          ],
        },
      ],
    },
    {
      id: 'acceptable-use',
      heading: 'User Responsibilities and Acceptable Use',
      blocks: [
        'You agree to use the Platform only for learning in the course and in a way that is lawful, honest and respectful. In particular, you agree not to:',
        {
          list: [
            'sign in as another person or let another person use your account;',
            'try to access accounts, records or parts of the Platform that you are not permitted to see;',
            'interfere with the Platform, overload it, or try to bypass its security or its limits;',
            'use automated tools, scripts or bots to use the Platform;',
            'upload a profile picture or any content that is unlawful, offensive or that you do not have the right to use;',
            'copy, scrape or collect information about other users.',
          ],
        },
      ],
    },
    {
      id: 'content',
      heading: 'Learning Content and Intellectual Property',
      blocks: [
        'The lessons, missions, illustrations, text, software and design of AgriCore belong to AgriCore, its course instructors or their licensors, and are protected by intellectual property laws.',
        'You may view and use the learning content for your own learning in the course. You may not copy, republish, sell or distribute it, or use it outside the course, without written permission.',
        'Lessons may include videos from third-party services such as YouTube or Vimeo. Those videos remain the property of their owners and are subject to the terms of the service that hosts them.',
      ],
    },
    {
      id: 'missions',
      heading: 'Missions, XP, Badges and Leaderboards',
      blocks: [
        'Mission scores, XP, levels, badges and leaderboard ranks are calculated automatically by the Platform from your mission attempts. Replaying a mission adds XP only when you improve on your previous best result.',
        'Leaderboards show students within the same class section. Other students in your section can see your name, profile picture, XP, badge count and rank.',
        'To keep results fair, you agree not to:',
        {
          list: [
            'share mission answers, or use answers shared by others;',
            'open the same mission in several tabs or devices to gain an advantage;',
            'submit altered or fabricated results, or exploit errors in the Platform.',
          ],
        },
        'AgriCore may correct scores, remove attempts, or reset XP and badges that were obtained in breach of these Terms or because of a system error. How results count toward your course grade, if at all, is decided by your instructor.',
      ],
    },
    {
      id: 'suspension',
      heading: 'Account Suspension or Termination',
      blocks: [
        'Instructors may deactivate or delete a student account, for example when a student is no longer enrolled or has breached these Terms. A deactivated account cannot be used to sign in.',
        'You may ask to close your account at any time by contacting your instructor or AgriCore (see Contact Us).',
      ],
    },
    {
      id: 'availability',
      heading: 'Availability and Changes to the Service',
      blocks: [
        'AgriCore aims to keep the Platform available and working well, but it may sometimes be slow, interrupted or unavailable, for example during maintenance or because of problems with hosting providers. Your saved progress is kept when this happens.',
        'AgriCore may add, change or remove features, lessons and missions at any time.',
      ],
    },
    {
      id: 'liability',
      heading: 'Disclaimer and Limitation of Liability',
      blocks: [
        'The Platform and its content are provided "as is" and "as available" for educational purposes. AgriCore makes reasonable efforts to keep the content accurate, but does not guarantee that it is complete, error-free or suitable for every purpose. Crop protection content is for learning and should not replace professional or official agricultural advice.',
        'To the extent permitted by law, AgriCore is not liable for any indirect or consequential loss arising from the use of, or the inability to use, the Platform.',
      ],
    },
    {
      id: 'changes',
      heading: 'Changes to These Terms',
      blocks: [
        'AgriCore may update these Terms from time to time. The "Last updated" date at the top of this page shows when they last changed. If a change is significant, AgriCore will let users know on the Platform. Continuing to use the Platform after a change means you accept the updated Terms.',
      ],
    },
    {
      id: 'governing-law',
      heading: 'Governing Law',
      blocks: [
        'These Terms are governed by the laws of the Republic of the Philippines. Any dispute will first be addressed through the course and the University, and otherwise by the appropriate courts of the Philippines.',
      ],
    },
    {
      id: 'contact',
      heading: 'Contact Us',
      blocks: ['If you have a question about these Terms, please contact us:', { contact: true }],
    },
  ],
};

export const PRIVACY = {
  slug: 'privacy',
  title: 'Privacy Notice',
  summary:
    'This Privacy Notice explains what personal information AgriCore collects, how it is used and protected, who can see it, and the rights you have over it. AgriCore processes personal information in line with the Data Privacy Act of 2012 (Republic Act No. 10173).',
  sections: [
    {
      id: 'introduction',
      heading: 'Introduction',
      blocks: [
        'AgriCore is the learning platform for Principles of Crop Protection I at Davao Oriental State University. In this notice, "AgriCore", "we" and "us" refer to the Platform and the team that operates it, and "you" refers to anyone who uses it.',
        'We collect only the information the Platform needs to work and to support your learning in the course.',
      ],
    },
    {
      id: 'information-we-collect',
      heading: 'Information We Collect',
      blocks: [
        'Account details you give us when you register:',
        {
          list: [
            'your first and last name, email address, school ID number and class section;',
            'your password, which is stored only in hashed form (see Data Storage and Security);',
            'the date and version of the Terms and Privacy Notice you agreed to.',
          ],
        },
        'Learning activity created as you use the Platform:',
        {
          list: [
            'the lessons you open and complete;',
            'your mission attempts, with the score, whether you passed, the XP earned, the time spent and the date;',
            'your total XP, level and the badges you earn;',
            'notifications sent to you within the Platform.',
          ],
        },
        'A profile picture, only if you choose to upload one.',
        'Basic technical data: when you use the Platform, your device sends standard technical information such as your IP address and browser type. AgriCore uses it only to deliver the service and to protect it from abuse (for example, limiting repeated requests); it is not added to your account. Our hosting providers may keep it in standard server logs for a short period.',
        'If you reset a forgotten password, we temporarily keep a hashed copy of the one-time code we email to you, until it is used or expires.',
      ],
    },
    {
      id: 'how-we-use',
      heading: 'How We Use Your Information',
      blocks: [
        'We use your information to:',
        {
          list: [
            'create and manage your account, including instructor approval;',
            'sign you in and keep your account secure;',
            'save your progress, unlock lessons and missions, and calculate scores, XP, levels and badges;',
            'show section leaderboards;',
            'let your instructors follow progress and support students who need help;',
            'send you notifications on the Platform and, when you ask for one, a password reset email;',
            'keep the Platform working, fix problems and prevent misuse.',
          ],
        },
        'We do not use your information for advertising, and we do not make decisions about you based solely on automated processing.',
      ],
    },
    {
      id: 'legal-basis',
      heading: 'Legal Basis and Consent',
      blocks: [
        'We process personal information in accordance with the Data Privacy Act of 2012 (Republic Act No. 10173), its Implementing Rules and Regulations, and the issuances of the National Privacy Commission.',
        'When you register, you consent to the processing described in this notice. We also process information where it is necessary to provide the service you signed up for and to support the legitimate educational purposes of the course. You may withdraw your consent at any time (see Your Rights); this may mean you can no longer use the Platform.',
      ],
    },
    {
      id: 'sharing',
      heading: 'Sharing and Disclosure',
      blocks: [
        'We never sell or rent your personal information. We share it only as follows:',
        {
          list: [
            'Instructors of the course can see student accounts, progress, mission results and performance, so that they can approve accounts, manage classes and support students.',
            'Classmates in your section can see your name, profile picture, XP, badge count and rank on the section leaderboard. They cannot see your email address or school ID.',
            'Service providers that run the Platform for us: Vercel (website hosting), Render (application hosting), MongoDB Atlas (database hosting) and Brevo (delivery of password reset emails). They process information only to provide their services to AgriCore.',
            'Authorities, when we are required to by law.',
          ],
        },
        'Lessons may include videos embedded from YouTube (in its privacy-enhanced mode) or Vimeo. When you play such a video, that service receives information from your browser under its own privacy policy.',
      ],
    },
    {
      id: 'security',
      heading: 'Data Storage and Security',
      blocks: [
        'Your information is stored in a cloud database (MongoDB Atlas) and is sent between your device and AgriCore over encrypted (HTTPS) connections.',
        {
          list: [
            'Passwords are stored only as secure hashes and cannot be read by anyone, including AgriCore staff.',
            'Password reset codes are hashed, expire after a short time and are limited in how often they can be requested.',
            'Access controls limit each person to what their role allows: students see their own records and their section leaderboard; instructors see the classes they manage.',
            'Only signed-in users can reach learning records.',
          ],
        },
        'No system is completely secure, but we take reasonable organisational and technical measures to protect your information.',
      ],
    },
    {
      id: 'retention',
      heading: 'Data Retention',
      blocks: [
        'We keep your account and learning records for as long as your account exists and as needed for the course. When an account is deleted, or when you ask us to delete your information, we delete or anonymise it unless we are required to keep it by law or University policy.',
      ],
    },
    {
      id: 'your-rights',
      heading: 'Your Rights',
      blocks: [
        'Under the Data Privacy Act of 2012 you have the right to:',
        {
          list: [
            'be informed about how your personal information is processed;',
            'access the personal information we hold about you;',
            'have inaccurate or incomplete information corrected;',
            'have your information deleted or blocked, and object to its processing;',
            'receive a copy of your information in a commonly used electronic format (data portability);',
            'file a complaint with the National Privacy Commission (privacy.gov.ph).',
          ],
        },
        'To use any of these rights, contact us (see Contact Us) or ask your instructor. We may need to confirm your identity before acting on a request.',
      ],
    },
    {
      id: 'cookies',
      heading: 'Cookies and Local Storage',
      blocks: [
        'AgriCore does not use cookies for tracking or advertising, and it does not use analytics services.',
        'To keep you signed in, the Platform stores a sign-in token in your browser\'s local storage. It also remembers a few display preferences on your device, such as whether the sidebar is collapsed and which badge unlock animations you have already seen. You can clear this data at any time in your browser settings; you will then need to sign in again.',
        'Embedded lesson videos from YouTube or Vimeo may set their own cookies when played, as described in their privacy policies.',
      ],
    },
    {
      id: 'children',
      heading: "Children's Privacy",
      blocks: [
        'AgriCore is intended for university students and is not directed at children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has given us personal information, please contact us and we will delete it.',
      ],
    },
    {
      id: 'changes',
      heading: 'Changes to This Notice',
      blocks: [
        'We may update this Privacy Notice from time to time. The "Last updated" date at the top of this page shows when it last changed. If a change is significant, we will let users know on the Platform.',
      ],
    },
    {
      id: 'contact',
      heading: 'Contact Us',
      blocks: ['If you have a question about this notice or want to use your privacy rights, please contact us:', { contact: true }],
    },
  ],
};

export const LEGAL_DOCUMENTS = { terms: TERMS, privacy: PRIVACY };
