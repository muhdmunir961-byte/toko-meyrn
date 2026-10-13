import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/errors';
import {
  listResellers,
  createReseller,
  updateReseller,
  suspendReseller,
  type Reseller,
} from '../api/seller';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge, type BadgeTone } from '../components/ui/Badge';
import { Dialog, DialogConfirm } from '../components/ui/Dialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { SkeletonLine } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { validateEmail } from '../lib/validation';

/**
 * Reseller management (OWNER/STAFF only — enforced by the route guard AND the
 * backend). Backed by the verified contracts:
 *
 *  - GET    /seller/resellers          -> Reseller[]
 *  - POST   /seller/resellers          -> create (409 duplicate email,
 *                                         400 hierarchy cycle / max depth)
 *  - PATCH  /seller/resellers/:id      -> rename / status / commission / parent
 *  - POST   /seller/resellers/:id/suspend
 *
 * `commissionRateBps` is basis points (0..10000 = 0..100%). The hierarchy is
 * bounded by the backend (MAX_RESELLER_DEPTH + cycle prevention), so the UI
 * surfaces those errors instead of re-implementing the rules.
 */

const BPS_MAX = 10000;

function statusTone(status: Reseller['status']): BadgeTone {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'SUSPENDED':
      return 'danger';
    default:
      return 'warning';
  }
}

function formatRate(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

export function ResellersPage() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rate, setRate] = useState('0');
  const [parentId, setParentId] = useState('');
  const [creating, setCreating] = useState(false);

  const [suspendId, setSuspendId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Reseller | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const emailError = email ? validateEmail(email) : undefined;
  const rateError = useMemo(() => {
    const n = Number(rate);
    if (!Number.isFinite(n) || n < 0 || n > 100) return 'Enter a rate between 0 and 100.';
    return undefined;
  }, [rate]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setResellers(await listResellers());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load resellers.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function resetForm() {
    setName('');
    setEmail('');
    setRate('0');
    setParentId('');
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (emailError || rateError) return;
    setCreating(true);
    try {
      const created = await createReseller({
        email: email.trim(),
        name: name.trim(),
        commissionRateBps: Math.round(Number(rate) * 100),
        parentId: parentId || undefined,
      });
      setResellers((prev) => [created, ...prev]);
      toast('success', 'Reseller invited');
      setCreateOpen(false);
      resetForm();
    } catch (err) {
      // Backend returns 409 (duplicate) / 400 (cycle or depth exceeded).
      toast('error', 'Could not create reseller', err instanceof ApiError ? err.message : undefined);
    } finally {
      setCreating(false);
    }
  }

  async function onToggleStatus(r: Reseller) {
    try {
      const next = r.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      const updated = await updateReseller(r.id, { status: next });
      setResellers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      toast('success', `Reseller ${next === 'ACTIVE' ? 'reactivated' : 'suspended'}`);
    } catch (err) {
      toast('error', 'Update failed', err instanceof ApiError ? err.message : undefined);
    }
  }

  async function onSuspend() {
    if (!suspendId) return;
    const id = suspendId;
    setSuspendId(null);
    try {
      await suspendReseller(id);
      setResellers((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'SUSPENDED' } : x)));
      toast('success', 'Reseller suspended');
    } catch (err) {
      toast('error', 'Suspend failed', err instanceof ApiError ? err.message : undefined);
    }
  }

  async function onSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSavingEdit(true);
    try {
      const updated = await updateReseller(editing.id, {
        name: editing.name,
        commissionRateBps: editing.commissionRateBps,
      });
      setResellers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      toast('success', 'Reseller updated');
      setEditing(null);
    } catch (err) {
      toast('error', 'Update failed', err instanceof ApiError ? err.message : undefined);
    } finally {
      setSavingEdit(false);
    }
  }

  const parentOptions = resellers.map((r) => ({ value: r.id, label: `${r.name} (${r.email})` }));

  return (
    <div className="tpt-page">
      <div className="tpt-page__header">
        <h1 className="tpt-page__title">Resellers</h1>
        <p className="tpt-page__subtitle">
          Tenant <code>{session?.tenantId ?? '—'}</code> · {resellers.length} total
        </p>
      </div>

      <div className="dash__toolbar" style={{ marginBottom: '1.25rem' }}>
        <Button onClick={() => setCreateOpen(true)} startIcon={<Icon name="users" size={16} />}>
          Invite reseller
        </Button>
      </div>

      {error && (
        <EmptyState
          title="Couldn't load resellers"
          description={error}
          icon={<Icon name="alert" size={32} />}
          action={<Button onClick={() => void load()}>Retry</Button>}
        />
      )}

      {loading ? (
        <SkeletonLine lines={5} />
      ) : resellers.length === 0 ? (
        <EmptyState
          title="No resellers yet"
          description="Invite a reseller to let them sell under your store with a commission."
          icon={<Icon name="users" size={32} />}
        />
      ) : (
        <div className="tpt-table__scroll">
          <table className="tpt-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Status</th>
                <th scope="col" style={{ textAlign: 'right' }}>Commission</th>
                <th scope="col" style={{ textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {resellers.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.name}
                    {r.parentId && (
                      <span className="custom__hint" style={{ marginLeft: '0.5rem' }}>
                        sub-reseller
                      </span>
                    )}
                  </td>
                  <td><code>{r.email}</code></td>
                  <td><Badge tone={statusTone(r.status)}>{r.status}</Badge></td>
                  <td style={{ textAlign: 'right' }}>{formatRate(r.commissionRateBps)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="dash__actions">
                      <Button size="sm" variant="secondary" onClick={() => setEditing(r)}>Edit</Button>
                      {r.status === 'SUSPENDED' ? (
                        <Button size="sm" variant="secondary" onClick={() => void onToggleStatus(r)}>Reactivate</Button>
                      ) : (
                        <Button size="sm" variant="danger" onClick={() => setSuspendId(r.id)}>Suspend</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Invite reseller"
        description="Resellers sell under your store; commissions are tracked per order."
      >
        <form className="sf__form" onSubmit={onCreate}>
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={emailError}
            required
          />
          <Input
            label="Commission rate (%)"
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            error={rateError}
            hint={`Stored as basis points (0–${BPS_MAX}).`}
          />
          <Select
            label="Parent reseller (optional)"
            placeholder="None (top level)"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            options={parentOptions}
          />
          <div className="tpt-dialog__actions">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" loading={creating} disabled={Boolean(emailError || rateError) || !email || !name}>
              Send invite
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Edit */}
      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit reseller"
        description="Update the display name and commission rate."
      >
        {editing && (
          <form className="sf__form" onSubmit={onSaveEdit}>
            <Input
              label="Name"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />
            <Input
              label="Commission rate (bps)"
              inputMode="numeric"
              value={String(editing.commissionRateBps)}
              onChange={(e) => setEditing({ ...editing, commissionRateBps: Number(e.target.value) || 0 })}
              hint={`0–${BPS_MAX} basis points.`}
            />
            <div className="tpt-dialog__actions">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" loading={savingEdit}>Save</Button>
            </div>
          </form>
        )}
      </Dialog>

      <DialogConfirm
        open={suspendId !== null}
        onClose={() => setSuspendId(null)}
        onConfirm={() => void onSuspend()}
        title="Suspend reseller?"
        description="The reseller can no longer place orders until reactivated."
        confirmLabel="Suspend"
        danger
      />
    </div>
  );
}
