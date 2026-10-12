import { useEffect, useState } from 'react';
import { ApiError } from '../api/errors';
import { listPlans, updatePlan, type SubscriptionPlan } from '../api/admin';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { EmptyState } from '../components/ui/EmptyState';
import { Dialog, DialogConfirm } from '../components/ui/Dialog';
import { SkeletonLine } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { formatIDR } from '../lib/money';

/**
 * Subscription & billing oversight — GET/PATCH /admin/subscription/plans.
 * Editing a plan's price/active state is a privileged, financial action
 * requiring confirmation.
 */
export function AdminPlansPage() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null);
  const [name, setName] = useState('');
  const [priceMinor, setPriceMinor] = useState('');
  const [active, setActive] = useState(true);
  const [confirming, setConfirming] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setPlans(await listPlans());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load plans.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function openEdit(p: SubscriptionPlan) {
    setEditing(p);
    setName(p.name);
    setPriceMinor(String(p.monthlyPriceMinor));
    setActive(p.active);
    setConfirming(false);
  }

  async function doSave() {
    if (!editing) return;
    try {
      const updated = await updatePlan(editing.id, {
        name,
        monthlyPriceMinor: Number(priceMinor),
        active,
      });
      setPlans((prev) => prev.map((p) => (p.id === editing.id ? updated : p)));
      toast('success', 'Plan updated');
      setEditing(null);
    } catch (err) {
      toast('error', 'Update failed', err instanceof ApiError ? err.message : undefined);
    }
  }

  return (
    <div className="tpt-page">
      <div className="tpt-page__header">
        <h1 className="tpt-page__title">Subscription plans</h1>
        <p className="tpt-page__subtitle">Privileged billing changes · confirm required</p>
      </div>

      {error && <EmptyState title="Couldn't load plans" description={error} icon={<Icon name="alert" size={32} />} action={<Button onClick={() => void load()}>Retry</Button>} />}

      {loading ? (
        <SkeletonLine lines={5} />
      ) : plans.length === 0 ? (
        <EmptyState title="No plans" icon={<Icon name="layers" size={32} />} />
      ) : (
        <div className="tpt-table__scroll">
          <table className="tpt-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Status</th>
                <th scope="col" style={{ textAlign: 'right' }}>Monthly price</th>
                <th scope="col" style={{ textAlign: 'right' }}>Entitlements</th>
                <th scope="col" style={{ textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td><Badge tone={p.active ? 'success' : 'neutral'}>{p.active ? 'Active' : 'Inactive'}</Badge></td>
                  <td style={{ textAlign: 'right' }}>{p.monthlyPriceMinor === 0 ? 'Free' : formatIDR(p.monthlyPriceMinor)}</td>
                  <td style={{ textAlign: 'right' }}>{p.entitlements.length}</td>
                  <td style={{ textAlign: 'right' }}>
                    <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={`Edit plan: ${editing?.name ?? ''}`}
        description="Privileged billing change. Confirm to apply."
        footer={
          <div className="tpt-dialog__actions">
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="primary" onClick={() => setConfirming(true)}>Review</Button>
          </div>
        }
      >
        <div className="sf__form">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Monthly price (minor units)" type="number" inputMode="numeric" value={priceMinor} onChange={(e) => setPriceMinor(e.target.value)} />
          <label className="custom__checkbox">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Active
          </label>
        </div>
      </Dialog>

      <DialogConfirm
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={doSave}
        title="Apply plan change?"
        description={`This sets "${name}" to ${Number(priceMinor) === 0 ? 'Free' : formatIDR(Number(priceMinor))} and ${active ? 'active' : 'inactive'}.`}
        confirmLabel="Apply"
      />
    </div>
  );
}
