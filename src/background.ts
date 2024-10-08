import type { Event } from "./types";

const TARGET_URL = "https://claude.ai/new";

const contentScriptStatus: { [tabId: number]: boolean } = {};

chrome.action.onClicked.addListener(async (tab: chrome.tabs.Tab) => {
	if (tab.url?.startsWith("file:") || tab.url?.startsWith("chrome:")) {
		console.log("Cannot access this page due to Chrome restrictions");
		return;
	}

	if (tab.id) {
		await waitForContentScript(tab.id);
		chrome.tabs.sendMessage(tab.id, { action: "start" });
	}
});

async function waitForContentScript(
	tabId: number,
	attempts = 0,
): Promise<void> {
	if (contentScriptStatus[tabId]) {
		return;
	}

	if (attempts > 50) {
		throw new Error("Content script failed to initialize");
	}

	await new Promise((resolve) => setTimeout(resolve, 100));
	return waitForContentScript(tabId, attempts + 1);
}

chrome.runtime.onMessage.addListener(
	(
		request: Event,
		sender: chrome.runtime.MessageSender,
		sendResponse: (response?: any) => void,
	) => {
		console.log("Received message:", JSON.stringify(request));
		if (request.action === "navigateToClaudeAI" && sender.tab?.id) {
			handleNavigateToClaudeAI(sender.tab.id, request.pdfUrl);
		} else if (request.action === "contentScriptReady" && sender.tab?.id) {
			contentScriptStatus[sender.tab.id] = true;
		} else if (request.action === "fetchPDF") {
			fetchPDF(request.pdfUrl)
				.then((pdfArrayBuffer) => {
					sendResponse({ pdfArrayBuffer });
				})
				.catch((error) => {
					console.error("Error fetching PDF:", error);
					sendResponse({ error: "Failed to fetch PDF" });
				});
			return true; // Indicates that the response is sent asynchronously
		}
	},
);

async function fetchPDF(url: string): Promise<string> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}
	const blob = await response.blob();
	const reader = new FileReader();
	reader.readAsDataURL(blob);
	const base64data = await new Promise<string>((resolve) => {
		reader.onloadend = () => {
			const base64data = reader.result;
			resolve(base64data as string);
		};
	});

	return base64data;
}

async function handleNavigateToClaudeAI(tabId: number, pdfUrl: string) {
	console.log("calling handleNavigateToClaudeAI");
	const updatedTab = await chrome.tabs.update(tabId, { url: TARGET_URL });
	contentScriptStatus[tabId] = false;

	chrome.tabs.onUpdated.addListener(async function listener(
		updatedTabId: number,
		info: chrome.tabs.TabChangeInfo,
	) {
		if (updatedTabId === updatedTab.id && info.status === "complete") {
			chrome.tabs.onUpdated.removeListener(listener);
			try {
				await waitForContentScript(tabId);
				chrome.tabs.sendMessage(tabId, {
					action: "uploadPDF",
					pdfUrl: pdfUrl,
				});
			} catch (error) {
				console.error("Error executing script or sending message:", error);
			}
		}
	});
}
