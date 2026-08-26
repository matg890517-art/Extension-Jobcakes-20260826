export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });
  browser.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true });

  const TARGETS = [/jobcakes\.com$/i];

  function isTarget(url?: string) {
    if (!url) return false;
    try {
      return TARGETS.some((re) => re.test(new URL(url).hostname));
    } catch {
      return false;
    }
  }

  async function syncTab(tabId: number, url?: string) {
    const on = isTarget(url);
    await browser.action[on ? 'enable' : 'disable'](tabId);
    await browser.sidePanel?.setOptions({ tabId, enabled: on });
  }

  browser.tabs.onUpdated.addListener((tabId, info, tab) => {
    if (info.url || info.status === 'complete') syncTab(tabId, info.url ?? tab.url);
  });

  browser.tabs.onActivated.addListener(async ({ tabId }) => {
    const tab = await browser.tabs.get(tabId);
    syncTab(tabId, tab.url);
  });


  browser.tabs.query({}).then((tabs) => {
    for (const tab of tabs) {
      if (tab.id != null) syncTab(tab.id, tab.url);
    }
  });
  
});
