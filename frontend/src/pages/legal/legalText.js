/**
 * Terms of Use and Privacy Notice for AgriCore.
 *
 * Plain language on purpose: the readers are first-year students. Bump
 * TERMS_VERSION whenever the wording changes in substance; the version a
 * student agreed to is stored on their account at registration.
 *
 * Replace "[contact email of the researchers]" with the real address before
 * the study begins.
 */
export const TERMS_VERSION = '2026-11-26';
export const LAST_UPDATED = '26 November 2026';
export const CONTACT = '[contact email of the researchers]';

export const TERMS = {
  title: 'Terms and Conditions',
  intro:
    'These terms explain how you may use AgriCore. Please read them before you create an account. They are written to be clear, not to replace advice from the University or a lawyer.',
  sections: [
    {
      heading: 'What AgriCore is',
      body: [
        'AgriCore is a gamified learning app for Principles of Crop Protection I at Davao Oriental State University (DOrSU). It was built as a capstone study by students of the University, and it is used in class under the guidance of your instructor.',
        'It is a study project, not a commercial product. It may change, pause or end when the study or the course ends.',
      ],
    },
    {
      heading: 'Your account',
      body: [
        'Register with your own name, school email, school ID and section. Your instructor checks and approves new accounts before you can sign in.',
        'Keep your password to yourself. You are responsible for what is done with your account. If you think someone else has used it, change your password and tell your instructor.',
        'One account per student. Do not sign in as someone else or let others play missions for you.',
      ],
    },
    {
      heading: 'Fair play',
      body: [
        'Play missions yourself, honestly. Do not try to get XP, badges or ranks you have not earned — for example by opening the same mission in several tabs, sending made-up results, or using scripts.',
        'Do not try to read other students’ information, break the app, or slow it down for others.',
        'Attempts that break these rules may be removed, and the account may be paused, by your instructor.',
      ],
    },
    {
      heading: 'Content',
      body: [
        'The lessons and missions are for learning in this course. You may use them for your own study; please do not copy or republish them elsewhere.',
        'Your score and XP in AgriCore are for learning and motivation. How they count toward your class standing, if at all, is decided by your instructor, not by these terms.',
      ],
    },
    {
      heading: 'Availability',
      body: [
        'We try to keep AgriCore working, but it runs on free hosting and may sometimes be slow or unavailable. Your saved progress is kept when that happens.',
      ],
    },
    {
      heading: 'The research study is separate',
      body: [
        'Agreeing to these terms lets you use the app. It is not the same as agreeing to take part in the research study. Taking part in the study’s evaluation is asked separately, on the Informed Consent Form, and you may decline it and still use AgriCore for your course.',
      ],
    },
    {
      heading: 'Changes and questions',
      body: [
        'If these terms change in an important way, we will tell you in the app. For questions, contact the researchers at ' + CONTACT + ' or ask your instructor.',
      ],
    },
  ],
};

export const PRIVACY = {
  title: 'Privacy Notice',
  intro:
    'This notice explains what information AgriCore collects about you, why, who can see it and what you can ask us to do with it. We follow the Data Privacy Act of 2012 (Republic Act No. 10173) and handle your information as confidential.',
  sections: [
    {
      heading: 'What we collect',
      body: [
        'Account details: your name, school email, school ID number, section and password (stored only in scrambled, hashed form — nobody can read it).',
        'Learning activity: which lessons you open, your mission answers and scores, the time you spend on a mission, your XP, level, badges and progress through the modules.',
        'A profile picture, only if you choose to upload one.',
      ],
    },
    {
      heading: 'Why we collect it',
      body: [
        'To run the app for your course: signing you in, saving your progress, unlocking the next topics, and showing your XP, badges and ranking.',
        'So your instructor can follow how the class is doing and help students who are falling behind.',
        'For the capstone study, to see how well the app supports learning. Results are reported as summaries; your name and school ID are never published. Using your information as part of the study’s evaluation depends on the separate Informed Consent Form.',
      ],
    },
    {
      heading: 'Who can see it',
      body: [
        'You can see all of your own information.',
        'Your instructor can see the accounts, progress and mission results of the students in the sections they teach.',
        'Classmates in your own section can see your name, profile picture, XP, badge count and rank on the section leaderboard. Students in other sections cannot. Nobody but you and your instructor can see your email or school ID.',
        'The researchers, for the study, under the conditions of the Informed Consent Form.',
        'We do not sell or share your information with anyone else, and we do not use it for advertising.',
      ],
    },
    {
      heading: 'How we keep it safe',
      body: [
        'Your information is stored in a secured cloud database and sent over encrypted connections. Only signed-in users can reach it, and each person can see only what this notice allows. Passwords are stored hashed.',
      ],
    },
    {
      heading: 'How long we keep it',
      body: [
        'We keep your account and learning records for as long as the course and the capstone study need them. After the study ends, the records are deleted or made anonymous so they no longer identify you, unless the University requires them to be kept longer.',
      ],
    },
    {
      heading: 'Your rights',
      body: [
        'Under the Data Privacy Act you may ask to see the information we hold about you, have it corrected if it is wrong, and ask for it to be removed or for its use to stop. You may also object to how it is used, and you may complain to the National Privacy Commission.',
        'To make any of these requests, contact the researchers at ' + CONTACT + ' or ask your instructor. Your instructor can correct your account details directly.',
      ],
    },
    {
      heading: 'This notice and the study',
      body: [
        'This notice is about using the app. It is separate from the Informed Consent Form for the research evaluation: agreeing to use AgriCore does not mean you have agreed to take part in the study.',
      ],
    },
  ],
};
