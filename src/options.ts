function saveOptions(): void {
	const loggingEnabled = (
		document.getElementById("logging-enabled") as HTMLInputElement
	).checked;
	const defaultPrompt = (
		document.getElementById("default-prompt") as HTMLInputElement
	).value;

	chrome.storage.sync.set(
		{ loggingEnabled: loggingEnabled, defaultPrompt: defaultPrompt },
		() => {
			const status = document.getElementById("status");
			if (status) {
				status.textContent = "Options saved.";
				setTimeout(() => {
					status.textContent = "";
				}, 750);
			}
		},
	);
}

function restoreOptions(): void {
	chrome.storage.sync.get(
		{ loggingEnabled: true, defaultPrompt: "Summarize this document" },
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		(items: { [key: string]: any }) => {
			(document.getElementById("logging-enabled") as HTMLInputElement).checked =
				items.loggingEnabled;
			(document.getElementById("default-prompt") as HTMLInputElement).value =
				items.defaultPrompt;
		},
	);
}

chrome.runtime.onInstalled.addListener(
	(details: chrome.runtime.InstalledDetails) => {
		if (details.reason === "install") {
			chrome.storage.sync.set(
				{ loggingEnabled: false, defaultPrompt: "Summarize this document" },
				() => {
					console.log("Default settings initialized");
				},
			);
		}
	},
);

document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("save")?.addEventListener("click", saveOptions);
