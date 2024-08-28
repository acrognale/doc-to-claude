export type EventTypes =
	| "navigateToClaudeAI"
	| "contentScriptReady"
	| "uploadPDF"
	| "start";

export type Event =
	| { action: "navigateToClaudeAI"; pdfUrl: string }
	| { action: "contentScriptReady"; status?: "acknowledged" }
	| { action: "uploadPDF"; pdfUrl: string }
	| { action: "start" };
