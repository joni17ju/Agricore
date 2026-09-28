import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import { Logo } from '../components/common/Display.jsx';
import Icon from '../components/common/Icon.jsx';
import ScrollToTopButton from '../components/common/ScrollToTopButton.jsx';
import { ROLE_HOME } from '../constants/roles.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useInView } from '../hooks/useInView.js';

/**
 * Public landing page at "/".
 *
 * Sits in front of the app rather than replacing any of it: the login and
 * register pages are untouched and still reached by their own routes. Unlike
 * those two this page is not behind RedirectIfSignedIn — a marketing page
 * should stay readable when you happen to be signed in, so the navbar offers
 * the dashboard instead of a login button in that case.
 */

const NAV_LINKS = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'features', label: 'Features' },
];

const FEATURES = [
  {
    icon: 'book',
    title: 'Lessons with practice built in',
    body: 'Every lesson is paired with interactive activities that put the idea to work straight away, instead of leaving it on the page.',
  },
  {
    icon: 'sparkles',
    title: 'Earn XP as you go',
    body: 'Finish an activity and earn XP. Improve on an earlier attempt and earn the difference — so coming back to something is always worth it.',
  },
  {
    icon: 'medal',
    title: 'Badges worth chasing',
    body: 'Milestones for consistency, accuracy and curiosity, unlocked as you work through the course.',
  },
  {
    icon: 'trend-up',
    title: 'See your progress clearly',
    body: 'Track completion across every module, and see exactly which topics you have nailed and which are worth another pass.',
  },
  {
    icon: 'trophy',
    title: 'Friendly competition',
    body: 'Section leaderboards show where you stand among your classmates — motivating, not intimidating.',
  },
  {
    icon: 'leaf',
    title: 'Made for this course',
    body: 'Five modules built around the real syllabus, with content your instructor manages directly.',
  },
];

/** Wraps a section so its contents animate in the first time it is reached. */
function Section({ id, className = '', children }) {
  const [ref, isInView] = useInView();
  return (
    <section id={id} ref={ref} className={`landing-section ${className} ${isInView ? 'is-visible' : ''}`}>
      {children}
    </section>
  );
}

function LandingNav() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /*
   * Anchors do the scrolling, not JavaScript: CSS scroll-behavior handles the
   * animation and scroll-margin-top on each section keeps the fixed bar from
   * covering the heading. Clicking one only needs to shut the mobile panel.
   */
  const close = () => setIsOpen(false);

  return (
    <header className={`landing-nav ${isScrolled ? 'is-scrolled' : ''}`}>
      <div className="landing-nav__inner">
        <a href="#home" className="landing-nav__brand" onClick={close}>
          <Logo />
        </a>

        <nav className={`landing-nav__links ${isOpen ? 'is-open' : ''}`} aria-label="Page sections">
          {NAV_LINKS.map((link) => (
            <a key={link.id} href={`#${link.id}`} className="landing-nav__link" onClick={close}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="landing-nav__actions">
          {user ? (
            <Button to={ROLE_HOME[user.role]} size="sm" iconRight="arrow-right">Go to dashboard</Button>
          ) : (
            <Button to="/login" size="sm">Login</Button>
          )}
          <button
            type="button"
            className="landing-nav__toggle"
            aria-expanded={isOpen}
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setIsOpen((open) => !open)}
          >
            <Icon name={isOpen ? 'x' : 'menu'} size={22} />
          </button>
        </div>
      </div>
    </header>
  );
}

/** Laptop, tablet and phone frames holding real screenshots of the app. */
function DeviceMockup() {
  return (
    <div className="device-stack" aria-label="AgriCore running on a laptop, tablet and phone">
      <div className="device device--laptop">
        <div className="device__screen">
          <img src="/images/landing/app-dashboard.png" alt="The AgriCore student dashboard, showing XP, current module and achievements." loading="lazy" />
        </div>
        <span className="device__base" aria-hidden="true" />
      </div>

      <div className="device device--tablet">
        <div className="device__screen">
          <img src="/images/landing/app-achievements.png" alt="The achievements screen, showing earned badges and personal records." loading="lazy" />
        </div>
      </div>

      <div className="device device--phone">
        <div className="device__screen">
          <img src="/images/landing/app-mission.png" alt="A mission screen on a phone, ready to play." loading="lazy" />
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  useDocumentTitle('AgriCore — gamified learning for Principles of Crop Protection I');

  return (
    <div className="landing">
      <LandingNav />

      <main>
        {/* ── Hero ── */}
        <Section id="home" className="landing-hero">
          <div className="landing-hero__text">
            <span className="landing-eyebrow anim-fade-up" style={{ '--i': 0 }}>
              <Icon name="sprout" size={15} /> Principles of Crop Protection I
            </span>
            <h1 className="anim-fade-up" style={{ '--i': 1 }}>
              Crop protection you learn by <span>doing</span>.
            </h1>
            <p className="anim-fade-up" style={{ '--i': 2 }}>
              AgriCore turns Principles of Crop Protection I into hands-on practice. Work through interactive
              missions, make real calls on pests, diseases and weeds, and watch your progress build lesson by lesson.
            </p>
            <div className="landing-hero__actions anim-fade-up" style={{ '--i': 3 }}>
              <Button to="/login" size="lg" iconRight="arrow-right">Get started</Button>
              <a href="#features" className="btn btn--secondary btn--lg">See how it works</a>
            </div>
          </div>

          <div className="landing-hero__visual anim-fade-up" style={{ '--i': 4 }}>
            <DeviceMockup />
          </div>
        </Section>

        {/* ── About ── */}
        <Section id="about" className="landing-about">
          <div className="landing-about__card">
            <span className="landing-about__glow" aria-hidden="true" />
            <div className="landing-about__text">
              <h2 className="anim-fade-up" style={{ '--i': 0 }}>Study smarter. Play sharper.</h2>
              <p className="anim-fade-up" style={{ '--i': 1 }}>
                AgriCore turns Principles of Crop Protection I into a game you actually want to play. Missions, XP,
                and progress you can watch grow, all built around real crop protection skills.
              </p>
            </div>
            <div className="landing-about__stats anim-fade-up" style={{ '--i': 2 }}>
              <div className="landing-stat">
                <strong>5</strong>
                <span>course modules</span>
              </div>
              <div className="landing-stat">
                <strong>XP</strong>
                <span>for every attempt</span>
              </div>
              <div className="landing-stat">
                <strong>10</strong>
                <span>badges to earn</span>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Features ── */}
        <Section id="features" className="landing-features">
          <header className="landing-section__head">
            <span className="landing-eyebrow anim-fade-up" style={{ '--i': 0 }}>
              <Icon name="target" size={15} /> What you get
            </span>
            <h2 className="anim-fade-up" style={{ '--i': 1 }}>Built to keep you coming back</h2>
            <p className="anim-fade-up" style={{ '--i': 2 }}>
              Reading about crop protection only takes you so far. AgriCore is built around doing it — and keeping
              track of how far you have come.
            </p>
          </header>

          <div className="landing-feature-grid">
            {FEATURES.map((feature, index) => (
              <article key={feature.title} className="landing-feature anim-fade-up" style={{ '--i': index + 3 }}>
                <span className="landing-feature__icon">
                  <Icon name={feature.icon} size={22} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </Section>

        {/* ── Get started ── */}
        <Section id="get-started" className="landing-cta">
          <div className="landing-cta__card">
            <span className="landing-cta__sprout" aria-hidden="true">
              <Icon name="sprout" size={30} />
            </span>
            <h2 className="anim-fade-up" style={{ '--i': 0 }}>Ready to get started?</h2>
            <p className="anim-fade-up" style={{ '--i': 1 }}>
              Sign in with your student account, or create one in about a minute.
            </p>
            <div className="landing-cta__actions anim-fade-up" style={{ '--i': 2 }}>
              <Button to="/register" size="lg">Create account</Button>
              <Button to="/login" variant="secondary" size="lg">Sign in</Button>
            </div>
          </div>
        </Section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer__inner">
          <Logo />
          <p>
            Davao Oriental State University · Principles of Crop Protection I
          </p>
          <p className="landing-footer__meta">
            © {new Date().getFullYear()} AgriCore · <Link to="/login">Sign in</Link> · <Link to="/register">Create account</Link>
          </p>
        </div>
      </footer>

      <ScrollToTopButton />
    </div>
  );
}
