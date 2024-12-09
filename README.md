# Code Context Generator

A Next.js 14 application that generates a structured prompt representing your codebase. It displays your directory tree, lets you select files, and then produces a prompt containing the entire directory structure plus the selected files' contents. This is useful for providing code context to large language models or for general codebase documentation.

## Features

* **Directory Navigation**: Expand/collapse directories and view files using the App Router
* **File Selection**: Check boxes to include specific files in the final prompt
* **Configurable Ignored Directories**: Enter directories to omit from the prompt output
* **Full Prompt Generation**: Outputs a directory structure block and code file blocks for all selected files
* **Copy to Clipboard**: Easily copy the generated prompt

## Tech Stack

* Next.js 14 (App Router)
* TypeScript
* Tailwind CSS + Shadcn components

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open http://localhost:3000 and select the files you need.

## Example Use Cases

* Supplying a large language model with a snapshot of your codebase context
* Quickly documenting a project's structure and selected code snippets
* Providing code context for reviews or onboarding

## Contributing

Issues and pull requests are welcome.