chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-audix") return;

  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!tab?.id) return;

  try {
    await chrome.tabs.sendMessage(tab.id, {
      source: "AUDIX",
      action: "TOGGLE"
    });
  } catch (err) {
    // This error is NORMAL if content script isn't ready
    console.warn("Audix: content script not ready yet");
  }
});
