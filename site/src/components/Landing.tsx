import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "framer-motion";
import { useRef, useState, type ReactNode } from "react";

const links = [
  { href: "#experience", label: "Experience" },
  { href: "#how", label: "How it works" },
  { href: "#mobile", label: "Mobile" },
];

const files = [
  { name: "Home" },
  { name: "Projects" },
  { name: "Web Serve launch", active: true },
  { name: "Research" },
  { name: "Daily notes" },
  { name: "Canvas map" },
];

const features = [
  {
    title: "Obsidian-native rendering",
    text: "Callouts, embeds, Mermaid, and syntax highlighting look like they do in your vault — because they use Obsidian’s own renderer.",
  },
  {
    title: "Live reload on the LAN",
    text: "Create, edit, rename, or delete a note and every connected browser refreshes over WebSocket. No redeploy. No sync dance.",
  },
  {
    title: "Excalidraw & Canvas",
    text: "Read-only viewers with pan, zoom, and clickable links — so sketches and boards travel with the rest of your vault.",
  },
  {
    title: "Export when you need it",
    text: "Download Markdown or generate a PDF of the current note, images and sizing included.",
  },
  {
    title: "Optional lock on the door",
    text: "Username/password auth via Passport when you want the network open but the vault private.",
  },
];

const steps = [
  {
    title: "Enable in Obsidian",
    text: "Install Web Serve, flip it on, and keep working in your vault like usual.",
  },
  {
    title: "Start the server",
    text: "Hit Start — a QR code appears with your local URL for instant phone access.",
  },
  {
    title: "Browse anywhere nearby",
    text: "Open the link on any device on the same network. Same notes. Same theme energy.",
  },
];

const phones = [
  {
    title: "Sidebar + search",
    body: "Tree navigation, filter, and collapsible folders sized for thumbs.",
  },
  {
    title: "Swipe the chrome",
    body: "Hamburger, swipe gestures, and 44px+ targets built for real phones.",
  },
  {
    title: "Theme that travels",
    body: "Mirrors Obsidian light/dark — viewers can toggle independently.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.12 + i * 0.09,
      duration: 0.85,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 24));

  return (
    <>
      <header className={`nav${scrolled ? " scrolled" : ""}`}>
        <div className="nav-inner">
          <a className="brand" href="#top">
            <span className="brand-mark" aria-hidden>
              <span />
            </span>
            Web Serve
          </a>
          <nav className="nav-links" aria-label="Primary">
            {links.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
            <a
              className="btn btn-primary"
              href="#get"
              style={{ minHeight: "2.6rem", padding: "0.55rem 1.1rem" }}
            >
              Get the plugin
            </a>
          </nav>
          <button
            className={`nav-toggle${open ? " open" : ""}`}
            aria-expanded={open}
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
          >
            <i />
            <i />
          </button>
        </div>
      </header>
      <AnimatePresence>
        {open && (
          <motion.nav
            className="mobile-drawer"
            aria-label="Mobile"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {links.map((link, i) => (
              <motion.a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
              >
                {link.label}
              </motion.a>
            ))}
            <a
              className="btn btn-primary"
              href="#get"
              onClick={() => setOpen(false)}
              style={{ marginTop: "0.75rem" }}
            >
              Get the plugin
            </a>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}

function ProductStage() {
  return (
    <motion.div
      className="product-shell"
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.45 }}
    >
      <div className="product-chrome">
        <span className="dot" />
        <span className="dot" />
        <span className="dot live" />
        <div className="product-url">
          http://192.168.1.42:8080/Web%20Serve%20launch
        </div>
      </div>
      <div className="product-body">
        <aside className="product-sidebar" aria-hidden>
          <div className="side-search">Filter notes…</div>
          {files.map((file, i) => (
            <motion.div
              key={file.name}
              className={`file-row${file.active ? " active" : ""}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.85 + i * 0.06 }}
            >
              <span className="file-ico" />
              {file.name}
            </motion.div>
          ))}
        </aside>
        <div className="product-main">
          <div className="crumbs">
            <span>Home</span>
            <span>/</span>
            <span>Projects</span>
            <span>/</span>
            <span style={{ color: "var(--ivory)" }}>Web Serve launch</span>
          </div>
          <motion.h3
            className="note-title"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.7 }}
          >
            Your vault, live on the network.
          </motion.h3>
          <div className="note-block">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className={`line${i === 2 ? " short" : ""}`}
                initial={{ scaleX: 0, originX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 1.1 + i * 0.1, duration: 0.7 }}
              />
            ))}
            <motion.div
              className="callout"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4, duration: 0.6 }}
            >
              Obsidian rendering. Live reload. Phone, tablet, or laptop — same
              vault, same look.
            </motion.div>
          </div>
          <motion.div
            className="live-chip"
            animate={{ opacity: [0.65, 1, 0.65] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 99,
                background: "var(--signal)",
                display: "inline-block",
              }}
            />
            Live reload connected
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const stageY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const stageScale = useTransform(scrollYProgress, [0, 1], [1, 0.94]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0.2]);

  return (
    <section className="hero" id="top" ref={ref}>
      <motion.div className="hero-copy" style={{ opacity: copyOpacity }}>
        <motion.div
          className="eyebrow"
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="show"
        >
          Obsidian plugin · Local network
        </motion.div>
        <motion.h1
          className="brand-hero"
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="show"
        >
          Web Serve
        </motion.h1>
        <motion.p
          className="hero-headline"
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="show"
        >
          Your vault, on every screen in the house.
        </motion.p>
        <motion.p
          className="hero-support"
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="show"
        >
          Spin up a read-only site from Obsidian. Browse notes from your phone,
          tablet, or any laptop on the same network.
        </motion.p>
        <motion.div
          className="cta-row"
          custom={4}
          variants={fadeUp}
          initial="hidden"
          animate="show"
        >
          <a className="btn btn-primary" href="#get">
            Start serving <span aria-hidden>→</span>
          </a>
          <a className="btn btn-ghost" href="#experience">
            See the experience
          </a>
        </motion.div>
      </motion.div>
      <motion.div className="hero-stage" style={{ y: stageY, scale: stageScale }}>
        <div className="hero-stage-inner">
          <ProductStage />
        </div>
      </motion.div>
    </section>
  );
}

function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export default function Landing() {
  const [booting, setBooting] = useState(true);

  return (
    <div className="site">
      <AnimatePresence>
        {booting && (
          <motion.div
            className="loader"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={() => {
              window.setTimeout(() => setBooting(false), 700);
            }}
          >
            <motion.div
              className="loader-mark"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Web Serve
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Nav />
      <Hero />

      <section className="section" id="experience">
        <div className="container">
          <Reveal>
            <h2 className="section-head">Built for reading the vault aloud.</h2>
            <p className="section-copy">
              Not a sync product. A local HTTP server inside Obsidian — with the
              chrome you actually want when you open a note on another device.
            </p>
          </Reveal>
          <div className="feature-rail">
            {features.map((feature, i) => (
              <motion.article
                key={feature.title}
                className="feature-item"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{
                  delay: i * 0.06,
                  duration: 0.7,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <div className="feature-index">0{i + 1}</div>
                <div>
                  <h3 className="feature-title">{feature.title}</h3>
                  <p className="feature-text">{feature.text}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="how">
        <div className="container">
          <Reveal>
            <h2 className="section-head">Three moves. You’re live.</h2>
            <p className="section-copy">
              Same network only — by design. Port forward if you must; turn on
              auth if you do.
            </p>
          </Reveal>
          <div className="how-grid">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                className="how-step"
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{
                  delay: i * 0.1,
                  duration: 0.75,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <div className="how-num">0{i + 1}</div>
                <h3 className="how-title">{step.title}</h3>
                <p className="how-text">{step.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="mobile">
        <div className="container">
          <Reveal>
            <h2 className="section-head">Mobile is not an afterthought.</h2>
            <p className="section-copy">
              Responsive layout, swipe-friendly sidebar, and a QR on start so
              your phone is one scan away from the vault.
            </p>
          </Reveal>
          <div className="phone-track">
            {phones.map((phone, i) => (
              <motion.div
                key={phone.title}
                className="phone"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{
                  delay: i * 0.08,
                  duration: 0.8,
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={{ y: -6 }}
              >
                <div className="phone-screen">
                  <div className="phone-bar">
                    <span>9:41</span>
                    <span style={{ color: "var(--signal)" }}>● Live</span>
                  </div>
                  <h3 className="phone-title">{phone.title}</h3>
                  <p className="muted" style={{ margin: "0 0 1rem", fontSize: "0.9rem" }}>
                    {phone.body}
                  </p>
                  <div className="phone-lines">
                    <div className="line" />
                    <div className="line" />
                    <div className="line short" />
                  </div>
                  <h4>Breadcrumbs stay readable</h4>
                  <div className="phone-lines">
                    <div className="line" />
                    <div className="line short" />
                  </div>
                  <div className="callout" style={{ marginTop: "1rem" }}>
                    Prev / next notes float when you want them pinned.
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="finale" id="get">
        <div className="container">
          <Reveal>
            <div className="eyebrow">Desktop Obsidian · GPL 3.0</div>
            <h2 className="finale-title">Serve the vault. Keep the peace.</h2>
            <p className="finale-copy">
              Build from source, drop it into your plugins folder, and start the
              server when you need the house to read along.
            </p>
            <div className="cta-row">
              <a
                className="btn btn-primary"
                href="https://github.com/dmeim/obsidian-web-serve"
                target="_blank"
                rel="noreferrer"
              >
                View on GitHub <span aria-hidden>→</span>
              </a>
              <a className="btn btn-ghost" href="#top">
                Back to top
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="footer container">
        <span>Web Serve — local vault, browser-ready.</span>
        <span>Desktop only · Obsidian 0.15.0+</span>
      </footer>
    </div>
  );
}
