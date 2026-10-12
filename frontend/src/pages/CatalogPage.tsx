import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/errors';
import { createProduct, listProducts, type SellerProductWithMaster } from '../api/seller';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { Dialog } from '../components/ui/Dialog';
import { SkeletonLine } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { formatIDR } from '../lib/money';

/**
 * Product catalog management.
 *
 * `GET /seller/products` lists the seller's products (joined to MasterProduct).
 * `POST /seller/products` upserts by {masterProductId, manualPriceMinor,
 * markupType, markupValue}. There is NO master-catalog listing endpoint, so the
 * "add product" form requires a known masterProductId (documented gap).
 */
export function CatalogPage() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<SellerProductWithMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const [masterProductId, setMasterProductId] = useState('');
  const [manualPriceMinor, setManualPriceMinor] = useState('');
  const [markupType, setMarkupType] = useState('');
  const [markupValue, setMarkupValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setProducts(await listProducts());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load catalog.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!masterProductId.trim()) {
      setFormError('Enter a master product ID.');
      return;
    }
    setSaving(true);
    try {
      const created = await createProduct({
        masterProductId: masterProductId.trim(),
        manualPriceMinor: manualPriceMinor ? Number(manualPriceMinor) : undefined,
        markupType: (markupType || undefined) as 'FIXED' | 'PERCENTAGE' | 'MANUAL' | undefined,
        markupValue: markupValue ? Number(markupValue) : undefined,
      });
      setProducts((prev) => [created, ...prev.filter((p) => p.masterProductId !== created.masterProductId)]);
      toast('success', 'Product saved');
      setAddOpen(false);
      setMasterProductId('');
      setManualPriceMinor('');
      setMarkupType('');
      setMarkupValue('');
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Unable to save product.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="tpt-page">
      <div className="tpt-page__header">
        <h1 className="tpt-page__title">Catalog</h1>
        <p className="tpt-page__subtitle">
          Tenant <code>{session?.tenantId ?? '—'}</code> · {products.length} products
        </p>
      </div>

      <div className="dash__toolbar">
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-faint)' }}>
          No master-catalog endpoint exists — you must know the master product ID.
        </p>
        <Button variant="primary" onClick={() => setAddOpen(true)} startIcon={<Icon name="box" size={16} />}>
          Add product
        </Button>
      </div>

      {error && <EmptyState title="Couldn't load catalog" description={error} icon={<Icon name="alert" size={32} />} action={<Button onClick={() => void load()}>Retry</Button>} />}

      {loading ? (
        <SkeletonLine lines={6} />
      ) : products.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="Add your first product using a master product ID."
          icon={<Icon name="box" size={32} />}
          action={<Button onClick={() => setAddOpen(true)}>Add product</Button>}
        />
      ) : (
        <div className="tpt-table__scroll">
          <table className="tpt-table">
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">SKU</th>
                <th scope="col">Pricing</th>
                <th scope="col" style={{ textAlign: 'right' }}>Listed</th>
                <th scope="col" style={{ textAlign: 'right' }}>Cost</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.masterProduct.name}</td>
                  <td><code>{p.masterProduct.sku}</code></td>
                  <td>
                    {p.manualPriceMinor != null
                      ? 'Manual'
                      : p.markupType
                        ? `${p.markupType}${p.markupValue != null ? ` ${p.markupValue}` : ''}`
                        : 'Cost'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {formatIDR(p.manualPriceMinor ?? p.masterProduct.costMinor + (p.markupValue ?? 0))}
                  </td>
                  <td style={{ textAlign: 'right' }}>{formatIDR(p.masterProduct.costMinor)}</td>
                  <td><Badge tone={p.active ? 'success' : 'neutral'}>{p.active ? 'Active' : 'Inactive'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add product"
        description="Upserts by master product ID. There is no master-catalog listing endpoint."
        footer={
          <div className="tpt-dialog__actions">
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" form="add-product" loading={saving}>Save</Button>
          </div>
        }
      >
        <form id="add-product" className="sf__form" onSubmit={onAdd}>
          <Input
            label="Master product ID"
            required
            value={masterProductId}
            onChange={(e) => setMasterProductId(e.target.value)}
            placeholder="e.g. cm-…"
          />
          <Input
            label="Manual price (minor units)"
            type="number"
            inputMode="numeric"
            value={manualPriceMinor}
            onChange={(e) => setManualPriceMinor(e.target.value)}
            placeholder="Optional — overrides markup"
          />
          <Select
            label="Markup type"
            placeholder="None"
            value={markupType}
            onChange={(e) => setMarkupType(e.target.value)}
            options={[
              { value: 'FIXED', label: 'Fixed' },
              { value: 'PERCENTAGE', label: 'Percentage' },
              { value: 'MANUAL', label: 'Manual' },
            ]}
          />
          <Input
            label="Markup value"
            type="number"
            inputMode="numeric"
            value={markupValue}
            onChange={(e) => setMarkupValue(e.target.value)}
            placeholder="e.g. 3000"
          />
          {formError && <p className="sf__error">{formError}</p>}
        </form>
      </Dialog>
    </div>
  );
}

