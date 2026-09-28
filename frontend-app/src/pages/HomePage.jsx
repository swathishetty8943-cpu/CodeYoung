import { Link } from 'react-router-dom';
import { Target, Globe, GraduationCap, Mail, Clock } from 'lucide-react';
import Navbar from '../components/Navbar';

const FEATURES = [
  {
    icon: Target,
    title: 'Free trial classes, on us',
    desc: 'Every family gets complimentary trial classes to start — no card, no catch.',
  },
  {
    icon: Globe,
    title: 'Timezone-smart scheduling',
    desc: 'Slots are always shown in your local time, and DST transitions are handled automatically.',
  },
  {
    icon: GraduationCap,
    title: 'Instant, fair matching',
    desc: 'A booking is paired with an available mentor the moment you confirm it — no waiting on approval.',
  },
  {
    icon: Mail,
    title: 'Reminders that just work',
    desc: 'Confirmation and reminder emails land in your inbox, in your own local time.',
  },
];

export default function HomePage() {
  return (
    <div>
      <Navbar />

      <section className="hero">
        <div className="container">
          <div className="hero-copy">
            <div className="eyebrow">Coding mentorship for curious kids</div>
            <h1>Give your child a real head start in coding</h1>
            <p>
              CodeYoung matches kids with expert coding mentors for a free trial class —
              no pressure, no commitment, just a genuine taste of what learning to code feels like.
            </p>
            <div className="hero-ctas">
              <Link to="/signup" className="btn btn-primary">Book Your Free Trial</Link>
              <Link to="/login" className="btn btn-secondary">Log In</Link>
            </div>

            <div className="trust-row">
              <span><GraduationCap size={16} /> Vetted coding mentors</span>
              <span><Clock size={16} /> Sessions matched to your time zone</span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-mock-card">
              <div className="mock-dots"><span /><span /><span /></div>
              <div className="mock-title">Trial class confirmed</div>
              <div className="hero-mock-row">
                <span className="mock-label">Mentor</span>
                <span className="mock-value">Priya S.</span>
              </div>
              <div className="hero-mock-row">
                <span className="mock-label">Your time</span>
                <span className="mock-value">Sat, 9:00 AM EDT</span>
              </div>
              <div className="hero-mock-row">
                <span className="mock-label">Mentor's time</span>
                <span className="mock-value">Sat, 6:30 PM IST</span>
              </div>
              <div className="mock-cta">Join Class</div>
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        <div className="section-heading">
          <h2>How it works</h2>
        </div>
        <p className="section-subheading">Three simple steps between "curious" and "coding".</p>

        <div className="steps">
          <div className="step card">
            <div className="step-num">01</div>
            <h3>Pick a slot</h3>
            <p>Choose a day and time that works for you, shown in your own local time.</p>
          </div>
          <div className="step card">
            <div className="step-num">02</div>
            <h3>Get matched</h3>
            <p>We instantly pair you with an available, qualified mentor — and adjust automatically if your exact time isn't free.</p>
          </div>
          <div className="step card">
            <div className="step-num">03</div>
            <h3>Join your trial class</h3>
            <p>You'll get a confirmation email with a link — and a reminder before it starts.</p>
          </div>
        </div>

        <div className="section-heading">
          <h2>Why parents pick CodeYoung</h2>
        </div>

        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div className="feature-card card" key={f.title}>
              <div className="feature-icon">
                <f.icon size={20} />
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="cta-banner">
          <div>
            <h2>Ready when you are</h2>
            <p>It takes less than two minutes to book your child's free trial class.</p>
          </div>
          <Link to="/signup" className="btn btn-primary">Get Started — It's Free</Link>
        </div>
      </div>

      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="brand">CodeYoung</div>
            <div className="footer-links">
              <Link to="/login">Log In</Link>
              <Link to="/signup">Sign Up</Link>
              <a href="mailto:hello@codeyoung.example">Contact</a>
            </div>
          </div>
          <div className="footer-bottom">© {new Date().getFullYear()} CodeYoung. Built for young coders.</div>
        </div>
      </footer>
    </div>
  );
}
