const TARGET_URL = "https://claude.ai/new";
const MAX_RETRIES = 50;
const RETRY_INTERVAL = 100;

function log(message) {
  chrome.storage.sync.get({ loggingEnabled: true }, function (items) {
    if (items.loggingEnabled) {
      console.log(`[pdf-to-claude] ${message}`);
    }
  });
}

function getCurrentPDFUrl() {
  log("Checking if current page is a PDF...");
  const isPDF = document.contentType === "application/pdf";
  log(`Is PDF: ${isPDF}`);
  return isPDF ? window.location.href : null;
}

async function performUpload(url, inputElement) {
  log(`Simulating file upload with URL: ${url}`);

  try {
    // Fetch the PDF content
    const response = await fetch(url);
    const pdfContent = await response.arrayBuffer();

    // Create a File object with the actual PDF content
    const file = new File([pdfContent], "document.pdf", {
      type: "application/pdf",
    });

    // Create a DataTransfer object and add the file
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    inputElement.files = dataTransfer.files;

    log("Dispatching change event");
    inputElement.dispatchEvent(new Event("change", { bubbles: true }));
    log("Dispatching input event");
    inputElement.dispatchEvent(new Event("input", { bubbles: true }));
    log("File upload simulation complete");
  } catch (error) {
    log(`Error simulating file upload: ${error.message}`);
    throw error;
  }
}

function waitForElement(selector, maxRetries = MAX_RETRIES) {
  log(`Waiting for element: ${selector}`);
  return new Promise((resolve, reject) => {
    let retries = 0;
    const interval = setInterval(() => {
      log(`Attempt ${retries + 1} to find element`);
      const element = document.querySelector(selector);
      if (element) {
        log("Element found");
        clearInterval(interval);
        resolve(element);
      } else if (++retries > maxRetries) {
        log(`Element not found after ${maxRetries} retries`);
        clearInterval(interval);
        reject(new Error(`Element not found after ${maxRetries} retries`));
      }
    }, RETRY_INTERVAL);
  });
}

function setPromptText(promptElement, promptText) {
  log("Setting prompt text");
  promptElement.textContent = promptText;
  promptElement.dispatchEvent(new Event("input", { bubbles: true }));
  log("Prompt text set and input event dispatched");
}

function clearExistingDocuments() {
  log("Clearing existing documents");
  const thumbnails = document.querySelectorAll(
    '[data-testid="file-thumbnail"]',
  );
  log(`Found ${thumbnails.length} thumbnails`);
  const removePromises = Array.from(thumbnails).map((thumbnail) => {
    const removeButton = thumbnail.parentElement.querySelector("button");
    if (removeButton) {
      log("Clicking remove button for a document");
      removeButton.click();
      return waitForElementRemoval(thumbnail);
    }
    return Promise.resolve();
  });
  return Promise.all(removePromises);
}

function waitForElementRemoval(element, maxRetries = MAX_RETRIES) {
  log("Waiting for element removal");
  return new Promise((resolve, reject) => {
    let retries = 0;
    const interval = setInterval(() => {
      if (!document.body.contains(element)) {
        log("Element removed");
        clearInterval(interval);
        resolve();
      } else if (++retries > maxRetries) {
        log(`Element not removed after ${maxRetries} retries`);
        clearInterval(interval);
        reject(new Error(`Element not removed after ${maxRetries} retries`));
      }
    }, RETRY_INTERVAL);
  });
}

async function checkAndUpload(pdfUrl) {
  log("Starting checkAndUpload function");
  chrome.storage.sync.get(
    {
      loggingEnabled: true,
      defaultPrompt: "Summarize this document",
    },
    async function (result) {
      if (!pdfUrl) {
        log("No PDF URL provided");
        return;
      }

      log("On target page with provided PDF URL");
      showToast("Loading PDF...", false); // Show loading toast

      try {
        const inputElement = await waitForElement(
          'input[data-testid="file-upload"]',
        );

        await clearExistingDocuments();

        log("Upload input element found");

        await performUpload(pdfUrl, inputElement);
        log("Upload simulation completed");

        const promptElement = await waitForElement(
          'div[aria-label="Write your prompt to Claude"] > div',
        );
        log("Prompt input element found");
        setPromptText(promptElement, result.defaultPrompt);

        showToast("PDF loaded successfully!", false); // Show success toast
      } catch (error) {
        log(`Error in checkAndUpload: ${error.message}`);
        showToast("Error loading PDF. Please try again.", false); // Show error toast
      }
    },
  );
}

// Update showToast function to support persistent toasts
function showToast(message, persistent = false) {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: #333;
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    z-index: 9999;
    opacity: 0;
    transition: opacity 0.3s ease-in-out;
  `;
  document.body.appendChild(toast);

  // Trigger reflow to enable transition
  toast.offsetHeight;

  toast.style.opacity = "1";

  if (!persistent) {
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }

  return toast; // Return the toast element for persistent toasts
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "start") {
    const pdfUrl = getCurrentPDFUrl();
    if (!pdfUrl) {
      showToast(
        "This page is not a PDF. The extension works only with PDF documents.",
      );
      return;
    }
    chrome.runtime.sendMessage({
      action: "navigateToClaudeAI",
      pdfUrl: pdfUrl,
    });
  } else if (request.action === "uploadPDF") {
    checkAndUpload(request.pdfUrl);
  }
});

chrome.runtime.sendMessage(
  { action: "contentScriptReady" },
  function (response) {
    console.log("Content script initialized");
  },
);
