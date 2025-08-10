(() => {
  const { StoreProvider } = window.GameReactApp;
  const { Tabs } = window.GameReactApp;
  const { Header } = window.GameReactApp;
  const { Dashboard } = window.GameReactApp;
  const { Guild } = window.GameReactApp;
  const { Recruitment } = window.GameReactApp;
  const { Quests } = window.GameReactApp;
  const { Shop } = window.GameReactApp;
  const { Battle } = window.GameReactApp;
  const { Events } = window.GameReactApp;

  function App() {
    const tabs = [
      { key: 'dashboard', label: 'Dashboard', icon: '📊', render: () => React.createElement(Dashboard) },
      { key: 'guild', label: 'Guild', icon: '👥', render: () => React.createElement(Guild) },
      { key: 'recruitment', label: 'Recruitment', icon: '📝', render: () => React.createElement(Recruitment) },
      { key: 'quests', label: 'Quests', icon: '📜', render: () => React.createElement(Quests) },
      { key: 'shop', label: 'Shop', icon: '🛒', render: () => React.createElement(Shop) },
      { key: 'battle', label: 'Battle', icon: '⚔️', render: () => React.createElement(Battle) },
      { key: 'events', label: 'Events', icon: '💬', render: () => React.createElement(Events) },
    ];
    return React.createElement(StoreProvider, null,
      React.createElement(Header),
      React.createElement(Tabs, { tabs }),
    );
  }

  window.GameReactApp = window.GameReactApp || {};
  window.GameReactApp.App = App;
})();
