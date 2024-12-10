# Code Context Generator

This tool lets you interactively generate a structured, XML-based snapshot of your codebase directly in the browser. By selecting a local directory, you can explore its folders, pick specific files to include, and finally produce a `<codebase_context>` XML document. This document includes a full `<directory_structure>` and a `<documents>` section, where each `<document>` references a selected file and its contents.

## Key Features

- **Local Directory Access in the Browser**:  
  Use the native File System Access API (in Chromium-based or Safari browsers) to open any local folder directly in your browser. No server-side code is required.

- **Visual Directory Navigation**:  
  View and traverse your project's directory tree client-side. Expand and collapse folders to browse file structure.

- **Selective File Inclusion**:  
  Choose which files to include in the final XML output. Unwanted directories can also be ignored by specifying them in a comma-separated list.

- **XML-Based Output**:  
  Generate a well-structured XML document containing:  
  - `<directory_structure>`: A nested `<directory>` and `<file>` hierarchy  
  - `<documents>`: A list of `<document>` elements, each with `<file_path>` and `<document_content>` tags, and content wrapped in `<![CDATA[...]]>`

- **One-Click Copy**:  
  Easily copy the resulting XML prompt to your clipboard for further use with large language models or as a form of project documentation.

## High-Level Design

At a high level, this application is structured around a central React component (`app/page.tsx`) that orchestrates file system access, state management, and rendering. The browser’s File System Access API is used to read directories and files, while React’s state and hooks track which directories are expanded and which files are selected.

1. **Directory Selection & State Management**:  
   When you pick a directory, the code updates internal state to store a handle to that directory and its subdirectories. A tree-like state structure reflects what’s currently loaded and which nodes are expanded.

2. **Rendering & Interactivity**:  
   The UI presents a nested, collapsible directory tree built from the state data. Users can toggle directories, select files for inclusion, and specify directories to ignore. This interactivity updates the state, which in turn updates the rendered output.

3. **Prompt Generation**:  
   When generating the XML prompt, the code traverses the directory structure again—this time to produce a nested XML representation. Selected files are read, and their contents are inserted into the final XML. The output is then displayed in a scrollable panel, ready for copying.

In short, the code manages a cycle of:  
- **Initialization**: Pick a directory and read its contents  
- **Interaction**: Expand folders, select files, and set ignored directories  
- **Generation**: Produce a structured XML snapshot combining directory layout and selected file contents

This approach keeps all logic on the client side, with React handling UI updates and the browser API providing direct filesystem access.

## Code Organization

The code is split into:

- **`app/page.tsx`**:  
  Orchestrates the overall logic, layout, and integration of state, UI components, and XML generation.

- **`components/ControlPanel.tsx`**:  
  Manages the user inputs for ignored directories, as well as "Refresh" and "Generate" actions.

- **`components/DirectoryTree.tsx`**:  
  Renders the directory structure as a collapsible tree, allowing file selection via checkboxes.

- **`hooks/useDirectoryState.ts`**:  
  Encapsulates state management and directory-loading logic, handling directory picks, expansions, and file selections.

- **`lib/fsUtils.ts` & `lib/xmlBuilder.ts`**:  
  Contain logic for low-level filesystem operations and building the final XML output, respectively.

## Tech Stack

- **Next.js 14 (App Router)**
- **TypeScript**
- **Tailwind CSS & Shadcn Components**
- **File System Access API** (Chromium-based browsers or Safari)

## Getting Started

1. **Install Dependencies**:  
   ```bash
   npm install
   ```

2. **Run the development server** (use HTTPS or localhost for the File System Access API):

   ```bash
   npm run dev
   ```

3. **Open in Your Browser**:
   Navigate to http://localhost:3000.

4. **Select a Workspace Folder**:
   Click "Select Workspace Folder" and choose the directory you want to analyze. Grant the browser permission to access it.

5. **Customize Output**:
   - Use the directory tree interface to view files.
   - Check the boxes next to files you want included in the final XML.
   - Specify directories to ignore (e.g., node_modules, .git) to keep the output clean.

6. **Generate the XML Prompt**:
   Click "Generate" to produce your <codebase_context> XML. Copy it with one click.

7. **Browser Compatibility**:
   - Supported: Chrome, Edge, Safari
   - Not Fully Supported: Firefox (missing the File System Access API without experimental flags)

## Example Use Cases

* Supplying a large language model with a snapshot of your codebase context
* Quickly documenting a project's structure and selected code snippets

## Contributing

Issues and pull requests are welcome.