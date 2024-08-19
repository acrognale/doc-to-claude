# PDF to Claude

Are you tired of wasting 15 seconds downloading a PDF and uploading it Claude? Is your Downloads folder littered with PDFs you never want to see again?

Well, this extension is for you!

## Features

- Automatically upload PDFs to Claude.ai without manual downloading and uploading
- Customizable default prompt

## Installation

1. Clone this repository or download the latest release.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" in the top right corner.
4. Click "Load unpacked" and select the directory containing the extension files.

## Usage

1. Navigate to any PDF file in Chrome.
2. Click the PDF to Claude extension icon in the toolbar.
3. The extension will automatically open Claude.ai and upload the PDF.
4. Your default prompt will be pre-filled in the chat input.

## Configuration

To customize the extension settings:

1. Right-click the extension icon and select "Options".
2. Enable or disable logging as needed.
3. Set your preferred default prompt.
4. Click "Save" to apply your changes.

## Development

To package the extension for distribution:

```
npm run package
```

This will create a `pdf-upload-extension.zip` file containing the necessary files.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.