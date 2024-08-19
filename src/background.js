const TARGET_URL = "https://claude.ai/new";

chrome.action.onClicked.addListener((tab) => {
  if (tab.url.startsWith("file:") || tab.url.startsWith("chrome:")) {
    console.log("Cannot access this page due to Chrome restrictions");
    return;
  }

  chrome.tabs.sendMessage(tab.id, { action: "getPDFUrl" }, function (response) {
    if (response && response.pdfUrl) {
      chrome.storage.local.set({ pdfUrl: response.pdfUrl }, function () {
        chrome.tabs.update(tab.id, { url: TARGET_URL });
      });
    } else {
      console.log("No PDF detected on this page");
    }
  });
});
