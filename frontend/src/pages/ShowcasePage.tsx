import { useState } from 'react';
import { TenantTheme } from '../lib/tenantTheme';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Dialog, DialogConfirm } from '../components/ui/Dialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Tabs } from '../components/ui/Tabs';

/**
 * Component showcase (Storybook alternative) — renders every design-system
 * primitive with representative states so they can be visually inspected in
 * both themes and at all breakpoints.
 */
export function ShowcasePage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="tpt-container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <Section title="Buttons">
        <Row>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
        </Row>
        <Row>
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button startIcon={<Icon name="check" size={16} />}>With icon</Button>
        </Row>
      </Section>

      <Section title="Forms">
        <div className="tpt-grid tpt-grid--cols-2">
          <Input label="Email address" type="email" placeholder="you@example.com" />
          <Input
            label="Password"
            type="password"
            error="Must be at least 8 characters."
            defaultValue="short"
          />
          <Input label="Search" startAdornment={<Icon name="search" size={16} />} placeholder="Search…" />
          <Select
            label="Role"
            placeholder="Select a role"
            options={[
              { value: 'owner', label: 'Owner' },
              { value: 'staff', label: 'Staff' },
              { value: 'customer', label: 'Customer' },
            ]}
          />
        </div>
      </Section>

      <Section title="Badges">
        <Row>
          <Badge tone="neutral">Neutral</Badge>
          <Badge tone="primary">Primary</Badge>
          <Badge tone="success">Success</Badge>
          <Badge tone="warning">Warning</Badge>
          <Badge tone="danger">Danger</Badge>
          <Badge tone="info">Info</Badge>
        </Row>
      </Section>

      <Section title="Cards">
        <div className="tpt-grid tpt-grid--cols-3">
          <Card>
            <CardHeader title="Default card" subtitle="With a subtitle" />
            <CardBody>Card body content.</CardBody>
          </Card>
          <Card interactive>
            <CardHeader title="Interactive" subtitle="Hover me" />
            <CardBody>Elevates on hover.</CardBody>
          </Card>
          <Card>
            <CardHeader
              title="With action"
              action={<Button size="sm">Action</Button>}
            />
            <CardBody>Header action slot.</CardBody>
          </Card>
        </div>
      </Section>

      <Section title="Dialogs">
        <Row>
          <Button onClick={() => setDialogOpen(true)}>Open dialog</Button>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            Open confirm
          </Button>
        </Row>
      </Section>

      <Section title="Tabs">
        <Tabs
          ariaLabel="Example tabs"
          items={[
            { id: 'a', label: 'Overview', content: <p>Overview content.</p> },
            { id: 'b', label: 'Settings', content: <p>Settings content.</p> },
            { id: 'c', label: 'Billing', content: <p>Billing content.</p>, disabled: true },
          ]}
        />
      </Section>

      <Section title="Empty state">
        <Card>
          <CardBody>
            <EmptyState
              title="Nothing here yet"
              description="Use the empty state to guide users toward their first action."
              icon={<Icon name="box" size={32} />}
              action={<Button variant="primary">Create something</Button>}
            />
          </CardBody>
        </Card>
      </Section>

      <Section title="Tenant theme boundary">
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          The storefront below is wrapped in <code>TenantTheme</code> with a
          custom accent — proof that tenant branding is scoped to its subtree
          and never leaks into the dashboard or marketing surfaces.
        </p>
        <TenantTheme branding={{ primaryColor: '#00c2a8', secondaryColor: '#1f8fff', theme: 'dark' }}>
          <Card>
            <CardHeader title="Tenant storefront" subtitle="Accent overridden" />
            <CardBody>
              <Row>
                <Button variant="primary">Tenant primary</Button>
                <Badge tone="primary">Tenant badge</Badge>
              </Row>
            </CardBody>
          </Card>
        </TenantTheme>
      </Section>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Example dialog"
        description="This dialog traps focus and closes on Escape or backdrop click."
        footer={
          <div className="tpt-dialog__actions">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setDialogOpen(false)}>Done</Button>
          </div>
        }
      >
        <p style={{ color: 'var(--color-text-muted)' }}>
          Dialog body content goes here.
        </p>
      </Dialog>

      <DialogConfirm
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => setConfirmOpen(false)}
        title="Delete item?"
        description="This action cannot be undone."
        danger
        confirmLabel="Delete"
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '2.5rem' }}>
      <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: '1rem' }}>{title}</h2>
      {children}
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.75rem',
        alignItems: 'center',
        marginBottom: '0.75rem',
      }}
    >
      {children}
    </div>
  );
}