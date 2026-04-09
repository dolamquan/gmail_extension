function sendToTabWithInjection(tabId, message, sendResponse) {
  chrome.tabs.sendMessage(tabId, message, (response) => {
    if (!chrome.runtime.lastError) {
      sendResponse(response);
      return;
    }

    chrome.scripting.executeScript(
      {
        target: { tabId },
        files: ["content.js"]
      },
      () => {
        if (chrome.runtime.lastError) {
          sendResponse({
            error: "Could not communicate with Gmail tab. Open an email thread in Gmail and try again."
          });
          return;
        }

        chrome.tabs.sendMessage(tabId, message, (retryResponse) => {
          if (chrome.runtime.lastError) {
            sendResponse({
              error: "Open Gmail, open a specific thread, then try Analyze again."
            });
            return;
          }

          sendResponse(retryResponse);
        });
      }
    );
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "GET_ACTIVE_TAB_ID") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({ tabId: tabs[0]?.id ?? null, url: tabs[0]?.url ?? "" });
    });
    return true;
  }

  if (message?.type === "OPEN_AUTH_TAB") {
    chrome.tabs.create({ url: message.url });
    sendResponse({ success: true });
    return false;
  }

  if (message?.type === "GET_THREAD_ID_FROM_ACTIVE_TAB") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];

      if (!activeTab?.id) {
        sendResponse({ error: "No active tab found." });
        return;
      }

      if (!activeTab.url?.includes("mail.google.com")) {
        sendResponse({ error: "Switch to a Gmail tab first." });
        return;
      }

      sendToTabWithInjection(activeTab.id, { type: "GET_GMAIL_THREAD_ID" }, sendResponse);
    });

    return true;
  }

  if (message?.type === "GET_THREAD_CONTEXT_FROM_ACTIVE_TAB") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];

      if (!activeTab?.id) {
        sendResponse({ error: "No active tab found." });
        return;
      }

      if (!activeTab.url?.includes("mail.google.com")) {
        sendResponse({ error: "Switch to a Gmail tab first." });
        return;
      }

      sendToTabWithInjection(activeTab.id, { type: "GET_GMAIL_THREAD_CONTEXT" }, sendResponse);
    });

    return true;
  }
});
