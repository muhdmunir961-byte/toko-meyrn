export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="tpt-page">
      <div className="tpt-page__header">
        <h1 className="tpt-page__title">{title}</h1>
        <p className="tpt-page__subtitle">
          This section is scaffolded and will be implemented in a later phase.
        </p>
      </div>
    </div>
  );
}