// Saves options to chrome.storage.sync
function saveOptions() {
  const loggingEnabled = document.getElementById("logging-enabled").checked;
  const defaultPrompt = document.getElementById("default-prompt").value;

  chrome.storage.sync.set(
    { loggingEnabled: loggingEnabled, defaultPrompt: defaultPrompt },
    function () {
      // Update status to let user know options were saved.
      const status = document.getElementById("status");
      status.textContent = "Options saved.";
      setTimeout(function () {
        status.textContent = "";
      }, 750);
    }
  );
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restoreOptions() {
  chrome.storage.sync.get(
    { loggingEnabled: true, defaultPrompt: "Summarize this document" },
    function (items) {
      document.getElementById("logging-enabled").checked = items.loggingEnabled;
      document.getElementById("default-prompt").value = items.defaultPrompt;
    }
  );
}

// Initialize default settings when the extension is installed
chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason === "install") {
    chrome.storage.sync.set(
      { loggingEnabled: false, defaultPrompt: "Summarize this document" },
      function () {
        console.log("Default settings initialized");
      }
    );
  }
});

document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("save").addEventListener("click", saveOptions);
