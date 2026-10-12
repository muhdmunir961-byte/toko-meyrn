import {
  createContext,
  useContext,
  useId,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

interface TabsContextValue {
  active: string;
  setActive: (id: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export interface TabItem {
  id: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

export function Tabs({
  items,
  defaultId,
  ariaLabel,
}: {
  items: TabItem[];
  defaultId?: string;
  ariaLabel?: string;
}) {
  const baseId = useId();
  const [active, setActive] = useState(defaultId ?? items[0]?.id ?? '');

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const enabled = items.filter((i) => !i.disabled);
    if (enabled.length === 0) return;
    const idx = enabled.findIndex((i) => i.id === active);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(enabled[(idx + 1) % enabled.length].id);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(enabled[(idx - 1 + enabled.length) % enabled.length].id);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(enabled[0].id);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(enabled[enabled.length - 1].id);
    }
  };

  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div className="tpt-tabs">
        <div
          className="tpt-tabs__list"
          role="tablist"
          aria-label={ariaLabel}
          onKeyDown={onKeyDown}
        >
          {items.map((item) => {
            const selected = item.id === active;
            return (
              <button
                key={item.id}
                role="tab"
                id={`${baseId}-tab-${item.id}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel-${item.id}`}
                aria-disabled={item.disabled || undefined}
                tabIndex={selected ? 0 : -1}
                className={`tpt-tabs__tab${selected ? ' tpt-tabs__tab--active' : ''}`}
                disabled={item.disabled}
                onClick={() => setActive(item.id)}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        {items.map((item) => (
          <div
            key={item.id}
            role="tabpanel"
            id={`${baseId}-panel-${item.id}`}
            aria-labelledby={`${baseId}-tab-${item.id}`}
            hidden={item.id !== active}
            className="tpt-tabs__panel"
          >
            {item.content}
          </div>
        ))}
      </div>
    </TabsContext.Provider>
  );
}

export function useTabs(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('useTabs must be used within Tabs');
  return ctx;
}