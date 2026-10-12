import { useState, type CSSProperties, type ReactNode } from 'react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Icon, type IconName } from '../components/ui/Icon';
import { formatIDR } from '../lib/money';
import { PLANS, formatPlanPrice } from '../lib/plans';
import { FEATURED_COVERS } from '../features/home/data';

/**
 * Premium Purple Gaming Commerce — marketing landing page.
 *
 * Dark midnight surfaces, purple ambient light, and game-inspired campaign
 * artwork drive the visual language. Content not yet backed by a verified
 * backend contract is explicitly marked "Preview".
 */
export function HomePage() {
  return (
    <div className="home">
      <Hero />
      <FeaturedStorefront />
      <SellerPreview />
      <DashboardPreview />
      <Features />
      <Onboarding />
      <Pricing />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}

/* ============================ Section shell ============================ */

function Section({
  id,
  eyebrow,
  title,
  lead,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="home__section">
      <div className="home__container">
        <header className="home__section-head">
          {eyebrow && <p className="home__eyebrow">{eyebrow}</p>}
          <h2 className="home__section-title">{title}</h2>
          {lead && <p className="home__section-lead">{lead}</p>}
        </header>
        {children}
      </div>
    </section>
  );
}

/* ============================ Hero ============================ */

function Hero() {
  return (
    <section className="home__hero">
      <div className="home__hero-glow" aria-hidden="true" />
      <div className="home__container home__hero-inner">
        <div className="home__hero-copy">
          <p className="home__eyebrow home__eyebrow--hero">
            <Icon name="zap" size={16} /> Sell game top-ups, white-label ready
          </p>
          <h1 className="home__hero-title">
            Power your gaming store,
            <br />
            <span className="home__hero-title-accent">earn on every top-up.</span>
          </h1>
          <p className="home__hero-lead">
            Launch a premium top-up storefront, route orders across providers,
            grow a reseller network, and read your revenue with AI-assisted
            analytics — on one purple-lit platform built for gamers.
          </p>
          <div className="home__hero-actions">
            <Button asChildLink to="/register" variant="primary" size="lg" endIcon={<Icon name="arrow-right" size={18} />}>
              Start selling free
            </Button>
            <Button asChildLink to="#storefront" variant="secondary" size="lg" startIcon={<Icon name="store" size={18} />}>
              See a live storefront
            </Button>
          </div>
          <ul className="home__hero-points" aria-label="Platform highlights">
            <li><Icon name="check" size={16} /> No setup fees</li>
            <li><Icon name="check" size={16} /> Multi-provider routing</li>
            <li><Icon name="check" size={16} /> Reseller commissions</li>
          </ul>
        </div>

        <div className="home__hero-art" aria-hidden="true">
          <div className="home__hero-art-frame">
            <div className="home__hero-art-card home__hero-art-card--main">
              <span className="home__hero-art-glyph"><Icon name="zap" size={40} /></span>
              <span className="home__hero-art-label">Diamond</span>
              <span className="home__hero-art-value">86</span>
            </div>
            <div className="home__hero-art-card home__hero-art-card--float">
              <span className="home__hero-art-glyph"><Icon name="trending-up" size={24} /></span>
              <span className="home__hero-art-label">Revenue</span>
              <span className="home__hero-art-value">+32%</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================ Dashboard preview ============================ */

function DashboardPreview() {
  const rows = [
    { id: 'ORD-9041', item: 'MLBB 86 💎', qty: 2, total: 24000, status: 'Success' },
    { id: 'ORD-9040', item: 'PUBG 60 UC', qty: 1, total: 10000, status: 'Processing' },
    { id: 'ORD-9039', item: 'FF 100 💎', qty: 3, total: 27000, status: 'Success' },
    { id: 'ORD-9038', item: 'Valorant 475 VP', qty: 1, total: 25000, status: 'Manual review' },
  ];
  const statusTone = (s: string) =>
    s === 'Success' ? 'success' : s === 'Processing' ? 'info' : 'warning';
  return (
    <Section
      eyebrow="Seller dashboard"
      title="Run the whole operation from one screen"
      lead={
        <>
          Orders, catalog, routing and revenue at a glance. <em>Preview — the
          dashboard ships in a later phase.</em>
        </>
      }
    >
      <div className="home__dash">
        <div className="home__dash-sidebar" aria-hidden="true">
          <span className="home__dash-logo"><Icon name="spark" size={16} /> Nova</span>
          <span className="home__dash-link home__dash-link--active"><Icon name="grid" size={16} /> Overview</span>
          <span className="home__dash-link"><Icon name="cart" size={16} /> Orders</span>
          <span className="home__dash-link"><Icon name="box" size={16} /> Catalog</span>
          <span className="home__dash-link"><Icon name="users" size={16} /> Resellers</span>
          <span className="home__dash-link"><Icon name="plug" size={16} /> Providers</span>
          <span className="home__dash-link"><Icon name="chart" size={16} /> Analytics</span>
        </div>
        <div className="home__dash-main">
          <div className="home__dash-stats">
            <Stat label="Revenue today" value={formatIDR(1240000)} delta="+18%" />
            <Stat label="Orders" value="1,284" delta="+6%" />
            <Stat label="Success rate" value="98.2%" delta="+1.4%" />
            <Stat label="Active resellers" value="42" delta="+3" />
          </div>
          <table className="home__dash-table">
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Item</th>
                <th scope="col">Qty</th>
                <th scope="col">Total</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="home__dash-mono">{r.id}</td>
                  <td>{r.item}</td>
                  <td>{r.qty}</td>
                  <td className="home__dash-mono">{formatIDR(r.total)}</td>
                  <td><Badge tone={statusTone(r.status)}>{r.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Section>
  );
}

function Stat({ label, value, delta }: { label: string; value: string; delta: string }) {
  const up = delta.startsWith('+');
  return (
    <div className="home__stat">
      <span className="home__stat-label">{label}</span>
      <span className="home__stat-value">{value}</span>
      <span className={`home__stat-delta${up ? ' home__stat-delta--up' : ''}`}>
        <Icon name="trending-up" size={14} /> {delta}
      </span>
    </div>
  );
}


/* ============================ Featured storefront ============================ */

function FeaturedStorefront() {
  return (
    <Section
      id="storefront"
      eyebrow="Featured storefront"
      title="A catalog that feels like a game lobby"
      lead={
        <>
          Rich cover cards, instant denominations, and checkout that respects
          the gamer's flow. <em>Preview catalog — illustrative titles only.</em>
        </>
      }
    >
      <div className="home__covers">
        {FEATURED_COVERS.map((c) => (
          <GameCoverCard key={c.title} cover={c} />
        ))}
      </div>
    </Section>
  );
}

function GameCoverCard({ cover }: { cover: (typeof FEATURED_COVERS)[number] }) {
  return (
    <article className="home__cover">
      <div className="home__cover-art" style={{ background: cover.gradient }}>
        <Icon name={cover.glyph as IconName} size={40} />
        <span className="home__cover-status">{cover.status}</span>
      </div>
      <div className="home__cover-body">
        <h3 className="home__cover-title">{cover.title}</h3>
        <p className="home__cover-tagline">{cover.tagline}</p>
        <div className="home__cover-meta">
          <span className="home__cover-denom">{cover.denom}</span>
          <span className="home__cover-price">{formatIDR(cover.priceMinor)}</span>
        </div>
      </div>
    </article>
  );
}

/* ============================ Seller preview ============================ */

function SellerPreview() {
  const [qty, setQty] = useState(1);
  const [accent, setAccent] = useState(0);
  const accents = ['#8057f5', '#00c2a8', '#f97316', '#3d5af1'];
  const current = accents[accent];

  return (
    <Section
      eyebrow="Interactive preview"
      title="Your storefront, your brand"
      lead="Flip the accent to see white-label theming in action. A tenant's brand never leaks beyond its own storefront."
    >
      <div className="home__seller">
        <div className="home__seller-config">
          <p className="home__seller-config-label">Brand accent</p>
          <div className="home__seller-swatches" role="group" aria-label="Choose brand accent">
            {accents.map((c, i) => (
              <button
                key={c}
                type="button"
                className={`home__swatch${i === accent ? ' home__swatch--active' : ''}`}
                style={{ background: c }}
                aria-label={`Accent ${i + 1}`}
                aria-pressed={i === accent}
                onClick={() => setAccent(i)}
              />
            ))}
          </div>
          <p className="home__seller-config-hint">
            <Icon name="palette" size={16} /> Scoped via sanitized CSS custom
            properties — see <code>TenantTheme</code>.
          </p>
        </div>

        <div
          className="home__seller-window"
          style={{ '--store-accent': current } as CSSProperties}
        >
          <div className="home__seller-bar">
            <span className="home__seller-brand">
              <Icon name="spark" size={18} /> Nova Top-Up
            </span>
            <span className="home__seller-nav">
              <span>Home</span><span>Top-up</span><span>Vouchers</span>
            </span>
          </div>
          <div className="home__seller-product">
            <div
              className="home__seller-art"
              style={{ background: 'linear-gradient(135deg, #3b227d 0%, #6f3fe0 60%, #9877ff 100%)' }}
              aria-hidden="true"
            >
              <Icon name="zap" size={32} />
            </div>
            <div className="home__seller-detail">
              <h3 className="home__seller-name">Mobile Legends — 86 Diamonds</h3>
              <p className="home__seller-price">{formatIDR(12000)}</p>
              <div className="home__seller-buy">
                <div className="home__qty" aria-label="Quantity">
                  <button type="button" onClick={() => setQty((v) => Math.max(1, v - 1))} aria-label="Decrease quantity">−</button>
                  <span aria-live="polite">{qty}</span>
                  <button type="button" onClick={() => setQty((v) => v + 1)} aria-label="Increase quantity">+</button>
                </div>
                <Button variant="primary" size="md" startIcon={<Icon name="cart" size={16} />}>
                  Add to cart
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ============================ Features ============================ */

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  { icon: 'cart', title: 'Orders', body: 'Idempotent order creation, status tracking, and instant fulfillment across providers.' },
  { icon: 'plug', title: 'Providers', body: 'Connect multiple top-up providers with health scoring and automatic failover routing.' },
  { icon: 'credit-card', title: 'Payments', body: 'Payment attempt tracking and reconciliation — mock gateway until credentials land.' },
  { icon: 'users', title: 'Reseller', body: 'Multi-level commissions with cycle and depth limits, plus per-reseller analytics.' },
  { icon: 'cpu', title: 'AI & automation', body: 'AI-assisted analytics, support and provider mapping workflows — mock-only today.' },
  { icon: 'trending-up', title: 'Analytics', body: 'Revenue, margin and product performance with evidence-linked order IDs.' },
];

function Features() {
  return (
    <Section
      id="features"
      eyebrow="Platform features"
      title="Everything a top-up business needs"
      lead="Orders, providers, payments, resellers, AI and analytics — connected and tenant-isolated."
    >
      <div className="home__features">
        {FEATURES.map((f) => (
          <article className="home__feature" key={f.title}>
            <span className="home__feature-icon"><Icon name={f.icon} size={22} /></span>
            <h3 className="home__feature-title">{f.title}</h3>
            <p className="home__feature-body">{f.body}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}

/* ============================ Onboarding ============================ */

const STEPS = [
  { n: '01', title: 'Create your store', body: 'Register in seconds and get a branded storefront with a unique slug.' },
  { n: '02', title: 'Add products', body: 'Map master-catalog games to your store and set your markup or manual price.' },
  { n: '03', title: 'Sell & scale', body: 'Take orders, route to providers, recruit resellers, and watch revenue grow.' },
];

function Onboarding() {
  return (
    <Section
      eyebrow="How it works"
      title="Live in three steps"
      lead="No engineering required. Go from signup to first top-up in minutes."
    >
      <ol className="home__steps">
        {STEPS.map((s) => (
          <li className="home__step" key={s.n}>
            <span className="home__step-num">{s.n}</span>
            <h3 className="home__step-title">{s.title}</h3>
            <p className="home__step-body">{s.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/* ============================ Pricing ============================ */

function Pricing() {
  return (
    <Section
      id="pricing"
      eyebrow="Pricing"
      title="Plans that scale with you"
      lead={
        <>
          Prices mirror the verified backend subscription seed. Feature lists
          are <em>illustrative</em> — plan entitlements aren't seeded yet.
        </>
      }
    >
      <div className="home__pricing">
        {PLANS.map((p) => (
          <article
            key={p.id}
            className={`home__plan${p.featured ? ' home__plan--featured' : ''}`}
          >
            {p.featured && <span className="home__plan-flag">Most popular</span>}
            <h3 className="home__plan-name">{p.name}</h3>
            <p className="home__plan-blurb">{p.blurb}</p>
            <div className="home__plan-price">
              <span className="home__plan-amount">{formatPlanPrice(p.monthlyPriceMinor)}</span>
              {p.monthlyPriceMinor > 0 && <span className="home__plan-period">/ month</span>}
            </div>
            <ul className="home__plan-list">
              {p.highlights.map((h) => (
                <li key={h}><Icon name="check" size={16} /> {h}</li>
              ))}
            </ul>
            <Button
              asChildLink
              to="/register"
              variant={p.featured ? 'primary' : 'secondary'}
              fullWidth
            >
              {p.monthlyPriceMinor === 0 ? 'Start free' : 'Start selling'}
            </Button>
          </article>
        ))}
      </div>
    </Section>
  );
}

/* ============================ FAQ ============================ */

const FAQS = [
  {
    q: 'Is there a setup fee?',
    a: 'No. The Free plan lets you launch a storefront and take your first orders at no cost. Paid plans add reseller, routing and analytics capabilities.',
  },
  {
    q: 'Which payment methods do you support?',
    a: 'Payments are currently served by a mock gateway for development. Live payment rails will be wired once official credentials are provided.',
  },
  {
    q: 'Can I use my own domain?',
    a: 'Custom-domain white-labeling is on the roadmap. Storefronts are addressable by a unique slug today, with tenant-scoped branding already supported.',
  },
  {
    q: 'How does reseller commission work?',
    a: 'Resellers earn commission per order at a rate you configure, with multi-level cycles and depth limits. Commission states flow from pending through settled.',
  },
  {
    q: 'Is the AI really live?',
    a: 'AI features are mock-only for now and clearly labeled. The workflows, quotas and approvals are modeled end-to-end but not yet backed by a production model.',
  },
  {
    q: 'How do providers and routing work?',
    a: 'You connect providers, and the platform scores their health (availability, reliability, cost, latency) to route each order to the best available provider with automatic failover.',
  },
];

function Faq() {
  return (
    <Section
      id="faq"
      eyebrow="FAQ"
      title="Answers, no fluff"
      lead="The details that matter before you launch."
    >
      <div className="home__faq">
        {FAQS.map((f) => (
          <FaqItem key={f.q} q={f.q} a={f.a} />
        ))}
      </div>
    </Section>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const panelId = `faq-${q.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
  return (
    <div className="home__faq-item">
      <button
        type="button"
        className="home__faq-q"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{q}</span>
        <Icon name="chevron-down" size={18} className={open ? 'home__faq-chevron--open' : ''} />
      </button>
      <div id={panelId} className="home__faq-a" hidden={!open}>
        <p>{a}</p>
      </div>
    </div>
  );
}

/* ============================ Final CTA ============================ */

function FinalCta() {
  return (
    <section className="home__cta">
      <div className="home__cta-glow" aria-hidden="true" />
      <div className="home__container home__cta-inner">
        <h2 className="home__cta-title">Ready to open your gaming store?</h2>
        <p className="home__cta-lead">
          Join now and take your first top-up order today. Free to start, scale
          when you're ready.
        </p>
        <div className="home__cta-actions">
          <Button asChildLink to="/register" variant="primary" size="lg" endIcon={<Icon name="arrow-right" size={18} />}>
            Create your store
          </Button>
          <Button asChildLink to="/login" variant="ghost" size="lg">
            I already have an account
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ============================ Footer ============================ */

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="home__footer">
      <div className="home__container home__footer-inner">
        <div className="home__footer-brand">
          <span className="home__footer-logo">
            <Icon name="spark" size={20} /> Topup
          </span>
          <p className="home__footer-tagline">
            Premium gaming commerce, white-label ready.
          </p>
        </div>

        <nav className="home__footer-col" aria-label="Product">
          <h3 className="home__footer-heading">Product</h3>
          <a href="#storefront">Storefront</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
        </nav>

        <nav className="home__footer-col" aria-label="Resources">
          <h3 className="home__footer-heading">Resources</h3>
          <a href="#faq">FAQ</a>
          <a href="/showcase">Design system</a>
        </nav>

        <nav className="home__footer-col" aria-label="Company">
          <h3 className="home__footer-heading">Company</h3>
          <a href="#storefront">About</a>
          <a href="mailto:support@example.com">Support</a>
        </nav>

        <nav className="home__footer-col" aria-label="Legal">
          <h3 className="home__footer-heading">Legal</h3>
          <a href="#privacy">Privacy</a>
          <a href="#terms">Terms</a>
        </nav>
      </div>
      <div className="home__container home__footer-bottom">
        <p>© {year} Topup. All rights reserved.</p>
        <p className="home__footer-mono">Rp prices shown in Indonesian Rupiah.</p>
      </div>
    </footer>
  );
}


