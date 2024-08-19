const TARGET_URL = "https://claude.ai/new";
const MAX_RETRIES = 50;
const RETRY_INTERVAL = 100;

// Update these constants to use settings
let LOGGING_ENABLED = true;
let PROMPT_TEXT = "Summarize this document";

function log(message) {
  if (LOGGING_ENABLED) {
    console.log(`[pdf-to-claude] ${message}`);
  }
}

function getCurrentPDFUrl() {
  log("Checking if current page is a PDF...");
  const isPDF = document.contentType === "application/pdf";
  log(`Is PDF: ${isPDF}`);
  return isPDF ? window.location.href : null;
}

function simulateFileUpload(url, inputElement) {
  log(`Simulating file upload with URL: ${url}`);
  const file = new File([""], "document.pdf", { type: "application/pdf" });
  Object.defineProperty(file, "path", {
    value: url,
    writable: false,
  });

  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  inputElement.files = dataTransfer.files;

  log("Dispatching change event");
  inputElement.dispatchEvent(new Event("change", { bubbles: true }));
  log("Dispatching input event");
  inputElement.dispatchEvent(new Event("input", { bubbles: true }));
  log("File upload simulation complete");
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

function setPromptText(promptElement) {
  log("Setting prompt text");
  promptElement.textContent = PROMPT_TEXT;
  promptElement.dispatchEvent(new Event("input", { bubbles: true }));
  log("Prompt text set and input event dispatched");
}

function clearExistingDocuments() {
  log("Clearing existing documents");
  const thumbnails = document.querySelectorAll(
    '[data-testid="file-thumbnail"]'
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

async function checkAndUpload() {
  log("Starting checkAndUpload function");
  if (window.location.href.includes(TARGET_URL)) {
    chrome.storage.sync.get(
      ["pdfUrl", "loggingEnabled", "defaultPrompt"],
      async function (result) {
        if (!result.pdfUrl) {
          return;
        }

        LOGGING_ENABLED =
          result.loggingEnabled !== undefined ? result.loggingEnabled : true;
        PROMPT_TEXT = result.defaultPrompt || PROMPT_TEXT;

        log("On target page with stored PDF URL");
        const inputElement = await waitForElement(
          'input[data-testid="file-upload"]'
        );

        await clearExistingDocuments();

        log("Upload input element found");

        simulateFileUpload(result.pdfUrl, inputElement);
        log("Upload simulation completed");

        const promptElement = await waitForElement(
          'div[aria-label="Write your prompt to Claude"] > div'
        );
        log("Prompt input element found");
        setPromptText(promptElement);
        chrome.storage.local.remove("pdfUrl");
      }
    );
  }
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "getPDFUrl") {
    sendResponse({ pdfUrl: getCurrentPDFUrl() });
  }
});

// Run checkAndUpload on every page load
checkAndUpload();
