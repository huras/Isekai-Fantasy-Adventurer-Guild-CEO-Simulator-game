(() => {
  const { useEffect, useState } = React;

  function normalizeHash() {
    const raw = (window.location.hash || '').replace(/^#/, '');
    if (!raw) return '';
    if (raw.startsWith('tab=')) return raw.slice(4);
    if (raw.startsWith('/')) return raw.slice(1);
    return raw;
  }

  function Tabs({ tabs }) {
    const keys = tabs.map(t => t.key);
    const defaultKey = tabs[0]?.key || 'dashboard';
    const initial = (() => {
      const k = normalizeHash();
      return keys.includes(k) ? k : defaultKey;
    })();
    const [active, setActive] = useState(initial);

    // Keep URL hash in sync when active changes
    useEffect(() => {
      const desired = `#${active}`;
      if (window.location.hash !== desired) {
        window.history.replaceState(null, '', desired);
      }
    }, [active]);

    // Respond to hash changes (back/forward, manual edits)
    useEffect(() => {
      const onHashChange = () => {
        const k = normalizeHash();
        if (keys.includes(k)) setActive(k);
      };
      window.addEventListener('hashchange', onHashChange);
      return () => window.removeEventListener('hashchange', onHashChange);
    }, [keys.join('|')]);

    function handleClick(e, key) {
      e.preventDefault();
      if (key !== active) setActive(key);
    }

    return (
      React.createElement('div', { className: 'container-fluid py-3' },
        React.createElement('div', { className: 'row g-3' },
          React.createElement('div', { className: 'col-12 col-lg-3' },
            React.createElement('div', { className: 'list-group' },
              tabs.map(t => React.createElement('a', {
                key: t.key,
                href: `#${t.key}`,
                className: 'list-group-item list-group-item-action' + (active === t.key ? ' active' : ''),
                onClick: (e) => handleClick(e, t.key)
              }, t.icon ? `${t.icon} ` : '', t.label))
            )
          ),
          React.createElement('div', { className: 'col-12 col-lg-9' },
            tabs.map(t => active === t.key && React.createElement('div', { key: t.key }, t.render()))
          )
        )
      )
    );
  }

  window.GameReactApp = window.GameReactApp || {};
  window.GameReactApp.Tabs = Tabs;
})();

function TabsComponent({ active, onChange }) {
  const tabs = [
    ['dashboard', 'Dashboard', 'bi-speedometer2'],
    ['guild', 'Guild', 'bi-people'],
    ['recruitment', 'Recruitment', 'bi-person-plus'],
    ['quests', 'Quests', 'bi-list-task'],
    ['shop', 'Shop', 'bi-bag'],
    ['battle', 'Battle', 'bi-swords'],
    ['events', 'Events', 'bi-chat-dots'],
  ];
  return (
    <div className="list-group" role="tablist">
      {tabs.map(([key, label, icon]) => (
        <a key={key} href="#" onClick={(e) => { e.preventDefault(); onChange(key); }} className={`list-group-item list-group-item-action ${active === key ? 'active' : ''}`}>
          <i className={`bi ${icon}`}></i> {label}
        </a>
      ))}
    </div>
  );
}

window.GameReactTabs = { Tabs: TabsComponent };


