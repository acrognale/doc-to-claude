const TARGET_URL = "https://claude.ai/new";

let contentScriptStatus = {};

// Listen for content script initialization
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "contentScriptReady") {
    contentScriptStatus[sender.tab.id] = true;
    sendResponse({ status: "acknowledged" });
  }
});

chrome.action.onClicked.addListener((tab) => {
  if (tab.url.startsWith("file:") || tab.url.startsWith("chrome:")) {
    console.log("Cannot access this page due to Chrome restrictions");
    return;
  }

  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      files: ["content.js"],
    },
    () => {
      // Wait for content script to initialize
      waitForContentScript(tab.id, () => {
        chrome.tabs.sendMessage(tab.id, { action: "start" });
      });
    },
  );
});

function waitForContentScript(tabId, callback, attempts = 0) {
  if (contentScriptStatus[tabId]) {
    callback();
    return;
  }

  if (attempts > 50) {
    // Timeout after ~5 seconds
    console.error("Content script failed to initialize");
    return;
  }

  setTimeout(() => waitForContentScript(tabId, callback, attempts + 1), 100);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "navigateToClaudeAI") {
    chrome.tabs.update(
      sender.tab.id,
      { url: TARGET_URL },
      function (updatedTab) {
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === updatedTab.id && info.status === "complete") {
            chrome.tabs.onUpdated.removeListener(listener);
            chrome.tabs.sendMessage(tabId, {
              action: "uploadPDF",
              pdfUrl: request.pdfUrl,
            });
          }
        });
      },
    );
  }
});
