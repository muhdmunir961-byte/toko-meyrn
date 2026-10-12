import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/errors';
import { createPricingRule, listPricingRules, type SellerPricingRule } from '../api/seller';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { Dialog, DialogConfirm } from '../components/ui/Dialog';
import { SkeletonLine } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';

/**
 * Product pricing & margin management.
 * `GET/POST /seller/pricing/rules` manage seller-wide markup rules. Creating a
 * rule is a FINANCIAL operation, so it requires an explicit confirm.
 */
export function PricingPage() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [rules, setRules] = useState<SellerPricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [markupType, setMarkupType] = useState('FIXED');
  const [markupValue, setMarkupValue] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setRules(await listPricingRules());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load pricing rules.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openConfirm(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!markupValue || Number(markupValue) < 0) {
      setFormError('Enter a non-negative markup value.');
      return;
    }
    setConfirmOpen(true);
  }

  async function onConfirm() {
    setConfirmOpen(false);
    setFormError(null);
    try {
      const created = await createPricingRule({ markupType, markupValue: Number(markupValue) });
      setRules((prev) => [...prev, created]);
      toast('success', 'Pricing rule created');
      setAddOpen(false);
      setMarkupType('FIXED');
      setMarkupValue('');
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Unable to create pricing rule.');
    }
  }

  return (
    <div className="tpt-page">
      <div className="tpt-page__header">
        <h1 className="tpt-page__title">Pricing & margin</h1>
        <p className="tpt-page__subtitle">
          Tenant <code>{session?.tenantId ?? '—'}</code> · {rules.length} rules
        </p>
      </div>

      <div className="dash__toolbar">
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-faint)' }}>
          Seller-wide markup rules. Creating a rule is a financial change and requires confirmation.
        </p>
        <Button variant="primary" onClick={() => setAddOpen(true)} startIcon={<Icon name="tag" size={16} />}>
          New rule
        </Button>
      </div>

      {error && <EmptyState title="Couldn't load rules" description={error} icon={<Icon name="alert" size={32} />} action={<Button onClick={() => void load()}>Retry</Button>} />}

      {loading ? (
        <SkeletonLine lines={5} />
      ) : rules.length === 0 ? (
        <EmptyState
          title="No pricing rules"
          description="Add a seller-wide markup rule to price your products."
          icon={<Icon name="tag" size={32} />}
          action={<Button onClick={() => setAddOpen(true)}>New rule</Button>}
        />
      ) : (
        <div className="tpt-table__scroll">
          <table className="tpt-table">
            <thead>
              <tr>
                <th scope="col">Type</th>
                <th scope="col" style={{ textAlign: 'right' }}>Value</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id}>
                  <td><Badge tone="primary">{r.markupType}</Badge></td>
                  <td style={{ textAlign: 'right' }}>
                    {r.markupType === 'PERCENTAGE' ? `${r.markupValue}%` : r.markupValue}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="New pricing rule"
        description="Applies seller-wide as the default markup."
        footer={
          <div className="tpt-dialog__actions">
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" form="pricing-form" variant="primary">Review</Button>
          </div>
        }
      >
        <form id="pricing-form" className="sf__form" onSubmit={openConfirm}>
          <Select
            label="Markup type"
            value={markupType}
            onChange={(e) => setMarkupType(e.target.value)}
            options={[
              { value: 'FIXED', label: 'Fixed (minor units)' },
              { value: 'PERCENTAGE', label: 'Percentage' },
              { value: 'MANUAL', label: 'Manual' },
            ]}
          />
          <Input
            label="Markup value"
            type="number"
            inputMode="numeric"
            required
            value={markupValue}
            onChange={(e) => setMarkupValue(e.target.value)}
            placeholder={markupType === 'PERCENTAGE' ? 'e.g. 10' : 'e.g. 3000'}
          />
          {formError && <p className="sf__error">{formError}</p>}
        </form>
      </Dialog>

      <DialogConfirm
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={onConfirm}
        title="Create pricing rule?"
        description={`This will set a ${markupType} markup of ${markupValue}. Financial operations should be confirmed.`}
        confirmLabel="Create rule"
      />
    </div>
  );
}
