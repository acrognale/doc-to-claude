import type { Event } from "./types";

const MAX_RETRIES = 50;
const RETRY_INTERVAL = 100;

function log(message: string): void {
	chrome.storage.sync.get(
		{ loggingEnabled: true },
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		(items: { [key: string]: any }) => {
			if (items.loggingEnabled) {
				console.log(`[pdf-to-claude] ${message}`);
			}
		},
	);
}

function getCurrentPDFUrl(): string | null {
	log("Checking if current page is a PDF...");
	const isPDF = document.contentType === "application/pdf";
	log(`Is PDF: ${isPDF}`);
	return isPDF ? window.location.href : null;
}

async function performUpload(
	url: string,
	inputElement: HTMLInputElement,
): Promise<void> {
	log(`Simulating file upload with URL: ${url}`);

	try {
		const response = await fetch(url);
		const pdfContent = await response.arrayBuffer();

		const file = new File([pdfContent], "document.pdf", {
			type: "application/pdf",
		});

		const dataTransfer = new DataTransfer();
		dataTransfer.items.add(file);
		inputElement.files = dataTransfer.files;

		log("Dispatching change event");
		inputElement.dispatchEvent(new Event("change", { bubbles: true }));
		log("Dispatching input event");
		inputElement.dispatchEvent(new Event("input", { bubbles: true }));
		log("File upload simulation complete");
	} catch (error) {
		log(`Error simulating file upload: ${(error as Error).message}`);
		throw error;
	}
}

function waitForElement(
	selector: string,
	maxRetries: number = MAX_RETRIES,
): Promise<Element> {
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

function setPromptText(promptElement: HTMLElement, promptText: string): void {
	log("Setting prompt text");
	promptElement.textContent = promptText;
	promptElement.dispatchEvent(new Event("input", { bubbles: true }));
	log("Prompt text set and input event dispatched");
}

function clearExistingDocuments(): Promise<void[]> {
	log("Clearing existing documents");
	const thumbnails = document.querySelectorAll(
		'[data-testid="file-thumbnail"]',
	);
	log(`Found ${thumbnails.length} thumbnails`);
	const removePromises = Array.from(thumbnails).map((thumbnail) => {
		const removeButton = thumbnail.parentElement?.querySelector("button");
		if (removeButton) {
			log("Clicking remove button for a document");
			removeButton.click();
			return waitForElementRemoval(thumbnail);
		}
		return Promise.resolve();
	});
	return Promise.all(removePromises);
}

function waitForElementRemoval(
	element: Element,
	maxRetries: number = MAX_RETRIES,
): Promise<void> {
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

async function checkAndUpload(pdfUrl: string): Promise<void> {
	log("Starting checkAndUpload function");
	chrome.storage.sync.get(
		{
			loggingEnabled: true,
			defaultPrompt: "Summarize this document",
		},
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		async (result: { [key: string]: any }) => {
			if (!pdfUrl) {
				log("No PDF URL provided");
				return;
			}

			log("On target page with provided PDF URL");
			showToast("Loading PDF...", false);

			try {
				const inputElement = (await waitForElement(
					'input[data-testid="file-upload"]',
				)) as HTMLInputElement;

				await clearExistingDocuments();

				log("Upload input element found");

				await performUpload(pdfUrl, inputElement);
				log("Upload simulation completed");

				const promptElement = (await waitForElement(
					'div[aria-label="Write your prompt to Claude"] > div',
				)) as HTMLElement;
				log("Prompt input element found");
				setPromptText(promptElement, result.defaultPrompt);

				showToast("PDF loaded successfully!", false);
			} catch (error) {
				log(`Error in checkAndUpload: ${(error as Error).message}`);
				showToast("Error loading PDF. Please try again.", false);
			}
		},
	);
}

function showToast(message: string, persistent = false): HTMLElement {
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

	return toast;
}

chrome.runtime.onMessage.addListener((request: Event) => {
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
			pdfUrl,
		});
	} else if (request.action === "uploadPDF") {
		checkAndUpload(request.pdfUrl);
	}
});

setTimeout(() => {
	chrome.runtime.sendMessage({ action: "contentScriptReady" }, () => {
		log("Content script initialized");
	});
}, 100);
