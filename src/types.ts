export type EventTypes =
	| "navigateToClaudeAI"
	| "contentScriptReady"
	| "uploadPDF"
	| "start"
	| "fetchPDF";

export type Event =
	| { action: "navigateToClaudeAI"; pdfUrl: string }
	| { action: "contentScriptReady"; status?: "acknowledged" }
	| { action: "uploadPDF"; pdfUrl: string }
	| { action: "start" }
	| { action: "fetchPDF"; pdfUrl: string };
