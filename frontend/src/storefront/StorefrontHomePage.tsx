import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStorefront } from '../storefront/StorefrontContext';
import { formatIDR } from '../lib/money';
import { listedPriceMinor } from '../api/storefront';
import { Icon } from '../components/ui/Icon';
import { Input } from '../components/ui/Input';

/**
 * Storefront homepage: hero, categories, search, and product listing.
 * Categories are derived from the master product name heuristics since the
 * backend exposes no category dimension on /storefront/:slug/products.
 * Prices are the server-provided `manualPriceMinor` / `costMinor + markup`.
 */
export function StorefrontHomePage() {
  const { slug = '' } = useParams();
  const { info, products } = useStorefront();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) set.add(categoryOf(p.masterProduct.name));
    return [...set].sort();
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchesQuery =
        !q ||
        p.masterProduct.name.toLowerCase().includes(q) ||
        p.masterProduct.sku.toLowerCase().includes(q);
      const matchesCategory = !category || categoryOf(p.masterProduct.name) === category;
      return matchesQuery && matchesCategory;
    });
  }, [products, query, category]);

  return (
    <div className="sf__container" id="catalog">
      <section style={{ padding: 'var(--space-10) 0 var(--space-6)' }}>
        <h1 className="sf__title">{info?.name ?? 'Store'}</h1>
        <p className="sf__subtitle">
          Top up your favorite games instantly. Prices are set by the seller and
          confirmed at checkout.
        </p>

        <div className="sf__search" style={{ margin: 'var(--space-6) 0 0', maxWidth: '24rem' }}>
          <Input
            label="Search games"
            placeholder="Search by name or SKU…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            startAdornment={<Icon name="search" size={16} />}
          />
        </div>

        <div className="sf__categories" role="tablist" aria-label="Categories">
          <button
            type="button"
            className={`sf__chip${category === null ? ' sf__chip--active' : ''}`}
            onClick={() => setCategory(null)}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={`sf__chip${category === c ? ' sf__chip--active' : ''}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', padding: '2rem 0' }}>
            No products match your search.
          </p>
        ) : (
          <div className="sf__grid">
            {filtered.map((p) => (
              <Link
                key={p.id}
                to={`/${slug}/product/${p.id}`}
                className="sf__card"
              >
                <span className="sf__card-art" aria-hidden="true">
                  <Icon name="zap" size={24} />
                </span>
                <span style={{ flex: 1 }}>
                  <span className="sf__card-name">{p.masterProduct.name}</span>
                  <span className="sf__card-sku" style={{ display: 'block' }}>
                    {p.masterProduct.sku}
                  </span>
                  <span className="sf__card-price">{formatIDR(listedPriceMinor(p))}</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function categoryOf(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('diamond') || n.includes('mlbb') || n.includes('mobile legend')) return 'Diamonds';
  if (n.includes('uc') || n.includes('pubg')) return 'UC & Cash';
  if (n.includes('crystal') || n.includes('genshin')) return 'Crystals';
  if (n.includes('vp') || n.includes('valorant')) return 'Points';
  if (n.includes('steam') || n.includes('wallet')) return 'Wallets';
  return 'Other';
}
