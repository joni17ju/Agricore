import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AuthModal, { AUTH_VIEWS } from '../components/auth/AuthModal.jsx';
import Button from '../components/common/Button.jsx';
import Icon from '../components/common/Icon.jsx';
import BrandLockup from '../components/common/BrandLockup.jsx';
import ScrollToTopButton from '../components/common/ScrollToTopButton.jsx';
import { ROLE_HOME } from '../constants/roles.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useActiveSection } from '../hooks/useActiveSection.js';
import { useCountUp } from '../hooks/useCountUp.js';
import { useInView } from '../hooks/useInView.js';
import { usePageVisible } from '../hooks/usePageVisible.js';

/**
 * Public landing page at "/".
 *
 * Signing in and registering open as a dialog over this page. The same split
 * panel is also served at /login and /register as standalone pages, so direct
 * links and the route guards' redirects still work.
 *
 * This page is not behind RedirectIfSignedIn — a marketing page should stay
 * readable when you happen to be signed in, so the navbar offers the dashboard
 * instead of a login button in that case.
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

/**
 * Wraps a section so its contents animate in the first time it is reached.
 * Children may be a function of whether the section has been seen yet.
 */
function Section({ id, className = '', children }) {
  const [ref, isInView] = useInView();
  return (
    <section id={id} ref={ref} className={`landing-section ${className} ${isInView ? 'is-visible' : ''}`}>
      {typeof children === 'function' ? children(isInView) : children}
    </section>
  );
}

/**
 * A headline number that counts up the first time its section is seen.
 * The moving digits are hidden from assistive tech, which gets the final value.
 */
function LandingStat({ value, label, isActive }) {
  const shown = useCountUp(isActive ? value : 0, { duration: 1400 });
  return (
    <div className="landing-stat">
      <strong>
        <span aria-hidden="true">{shown}</span>
        <span className="visually-hidden">{value}</span>
      </strong>
      <span>{label}</span>
    </div>
  );
}

/** Soft, slow-moving shapes behind the hero text. Purely decorative. */
function HeroBackdrop() {
  return (
    <div className="landing-hero__backdrop" aria-hidden="true">
      <span className="landing-blob landing-blob--1" />
      <span className="landing-blob landing-blob--2" />
      <span className="landing-blob landing-blob--3" />
      <span className="landing-leaf landing-leaf--1"><Icon name="leaf" size={34} /></span>
      <span className="landing-leaf landing-leaf--2"><Icon name="leaf" size={24} /></span>
      <span className="landing-leaf landing-leaf--3"><Icon name="sprout" size={28} /></span>
    </div>
  );
}

function LandingNav() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const activeSection = useActiveSection(NAV_LINKS.map((link) => link.id));

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
        <BrandLockup href="#home" onNavigate={close} className="landing-nav__brandgroup" />

        <nav className={`landing-nav__links ${isOpen ? 'is-open' : ''}`} aria-label="Page sections">
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              className={`landing-nav__link ${activeSection === link.id ? 'is-active' : ''}`}
              aria-current={activeSection === link.id ? 'location' : undefined}
              onClick={close}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Register and Login live in the hero and the closing call to action;
            a signed-in visitor still gets a way back to their dashboard here. */}
        <div className="landing-nav__actions">
          {user && <Button to={ROLE_HOME[user.role]} size="sm" iconRight="arrow-right">Go to dashboard</Button>}
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
          {/* Above the fold, so it loads straight away; the other two are lazy. */}
          <img
            src="/images/landing/app-dashboard.webp"
            alt="The AgriCore student dashboard, showing XP, current module and achievements."
            width="1400"
            height="766"
            fetchPriority="high"
            decoding="async"
          />
        </div>
        <span className="device__base" aria-hidden="true" />
      </div>

      <div className="device device--tablet">
        <div className="device__screen">
          <img src="/images/landing/app-achievements.webp" alt="The achievements screen, showing earned badges and personal records." width="700" height="918" loading="lazy" decoding="async" />
        </div>
      </div>

      <div className="device device--phone">
        <div className="device__screen">
          <img src="/images/landing/app-mission.webp" alt="A mission screen on a phone, ready to play." width="480" height="1029" loading="lazy" decoding="async" />
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { user } = useAuth();
  useDocumentTitle('AgriCore — gamified learning for Principles of Crop Protection I');
  /*
   * Which auth view is showing, or null for none. Plain state rather than the
   * URL: /login and /register are real pages of their own, so there is nothing
   * this dialog needs to be addressable for.
   */
  const [authView, setAuthView] = useState(null);
  // Looping background motion stops while the tab is hidden.
  const isPageVisible = usePageVisible();

  const openAuth = (view) => setAuthView(view);

  return (
    <div className={`landing ${isPageVisible ? '' : 'is-paused'}`}>
      <LandingNav />

      <main>
        {/* ── Hero ── */}
        <Section id="home" className="landing-hero">
          <HeroBackdrop />
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
            {!user && (
              <div className="landing-hero__actions anim-fade-up" style={{ '--i': 3 }}>
                <Button size="lg" iconRight="arrow-right" onClick={() => openAuth(AUTH_VIEWS.REGISTER)}>Register</Button>
                <Button variant="secondary" size="lg" onClick={() => openAuth(AUTH_VIEWS.LOGIN)}>Login</Button>
              </div>
            )}
          </div>

          <div className="landing-hero__visual anim-fade-up" style={{ '--i': 4 }}>
            <DeviceMockup />
          </div>
        </Section>

        {/* ── About ── */}
        <Section id="about" className="landing-about">
          {(isInView) => (
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
              <LandingStat value={5} label="course modules" isActive={isInView} />
              <div className="landing-stat">
                <strong>XP</strong>
                <span>for every attempt</span>
              </div>
              <LandingStat value={10} label="badges to earn" isActive={isInView} />
            </div>
          </div>
          )}
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
              <Button size="lg" iconRight="arrow-right" className="btn--shine" onClick={() => openAuth(AUTH_VIEWS.REGISTER)}>
                Register
              </Button>
              <Button variant="secondary" size="lg" onClick={() => openAuth(AUTH_VIEWS.LOGIN)}>Login</Button>
            </div>
          </div>
        </Section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer__inner">
          <BrandLockup className="landing-footer__brand" />
          <p>
            Davao Oriental State University · Principles of Crop Protection I
          </p>
          <nav className="landing-footer__legal" aria-label="Legal">
            <Link to="/terms">Terms and Conditions</Link>
            <span aria-hidden="true">·</span>
            <Link to="/privacy">Privacy Notice</Link>
          </nav>
          <p className="landing-footer__meta">© {new Date().getFullYear()} AgriCore</p>
        </div>
      </footer>

      <ScrollToTopButton />

      <AuthModal view={authView} onChangeView={setAuthView} onClose={() => setAuthView(null)} />
    </div>
  );
}
