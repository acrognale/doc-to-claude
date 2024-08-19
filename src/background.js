const TARGET_URL = "https://claude.ai/new";

chrome.action.onClicked.addListener((tab) => {
  if (tab.url.startsWith("file:") || tab.url.startsWith("chrome:")) {
    console.log("Cannot access this page due to Chrome restrictions");
    return;
  }

  chrome.tabs.sendMessage(tab.id, { action: "start" });
});

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
      }
    );
  }
});
