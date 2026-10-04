chrome.runtime.onMessage.addListener((message, sender) => {
  if (message === "close-tab" && sender.tab?.id != null) chrome.tabs.remove(sender.tab.id);
});
