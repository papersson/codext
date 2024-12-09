# Code Context Generator

A Next.js 14 application that generates a structured prompt representing your codebase context. Instead of relying on server-side filesystem reads, this tool uses the browser’s File System Access API. It lets you select a local folder directly in your browser, navigate its directory tree, select specific files, and then produce a prompt containing both the entire directory structure (minus any ignored directories) and the contents of the selected files. This prompt can then be used to provide code context to large language models or serve as codebase documentation.

## Features

* **Direct Local Folder Access**: Use the browser’s file picker to select a local directory as your workspace
* **Directory Navigation**: Expand/collapse directories and view files client-side without any server code
* **File Selection**: Check boxes to include specific files in the generated prompt
* **Configurable Ignored Directories**: Easily omit certain directories from the prompt output
* **Full Prompt Generation**: Produces a `<directory_structure>` and `<code_files>` block including selected file contents
* **Copy to Clipboard**: One-click copying of the generated prompt for use elsewhere

## Tech Stack

* Next.js 14 (App Router)
* TypeScript
* Tailwind CSS + Shadcn components
* Browser File System Access API (Chromium-based browsers or Safari required)

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server (use HTTPS or localhost for the File System Access API):

```bash
npm run dev
```

Open http://localhost:3000. Click "Select Workspace Folder", choose a local directory, grant access, and you’ll see your folder’s structure appear. From there, select files, configure ignored directories if needed, and generate the prompt.

## Browser Compatibility

This tool requires a Chromium-based browser (Chrome, Edge) or Safari. Firefox does not currently support the File System Access API without additional flags.

## Example Use Cases

* Supplying a large language model with a snapshot of your codebase context
* Quickly documenting a project's structure and selected code snippets

## Contributing

Issues and pull requests are welcome.