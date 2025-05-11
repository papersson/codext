import { FileNode } from './fsUtils';
import { toast } from '@/hooks/use-toast';
import { shouldIgnoreDirectory } from './fsUtils';

/**
 * Escapes XML special characters in text content.
 */
export function escapeXmlText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Escapes XML special characters in attribute values.
 */
export function escapeXmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');
}

/**
 * Builds the directory structure XML section.
 */
export async function buildDirectoryXml(
  dirHandle: FileSystemDirectoryHandle,
  ignoredDirs: Set<string>,
  dirName: string,
  indent = '  '
): Promise<string> {
  const allEntries: FileSystemHandle[] = [];
  for await (const entryHandle of dirHandle.values()) {
    allEntries.push(entryHandle);
  }

  allEntries.sort((a, b) => a.name.localeCompare(b.name));

  let content = `${indent}<directory name="${escapeXmlAttribute(dirName)}">\n`;
  for (const entryHandle of allEntries) {
    const name = entryHandle.name;
    if (shouldIgnoreDirectory(name, ignoredDirs)) continue;
    if (entryHandle.kind === 'directory') {
      const subtree = await buildDirectoryXml(
        entryHandle as FileSystemDirectoryHandle,
        ignoredDirs,
        name,
        indent + '  '
      );
      content += subtree;
    } else {
      content += `${indent}  <file name="${escapeXmlAttribute(name)}" />\n`;
    }
  }
  content += `${indent}</directory>\n`;
  return content;
}

/**
 * Builds the documents XML section.
 */
export async function buildDocumentsXml(
  selectedFiles: Set<string>,
  directoryHandles: Map<string, FileSystemDirectoryHandle>
): Promise<string> {
  let documentsXml = '';
  let docId = 1;
  let errorCount = 0;

  for (const filePath of selectedFiles) {
    const fileDir = filePath.substring(0, filePath.lastIndexOf('/')) || '.';
    const fileName = filePath.split('/').pop()!;
    const fileDirHandle = directoryHandles.get(fileDir);
    
    if (!fileDirHandle) {
      console.error('Directory not found:', fileDir);
      errorCount++;
      continue;
    }

    try {
      const fileHandle = await fileDirHandle.getFileHandle(fileName, { create: false });
      const file = await fileHandle.getFile();
      const content = await file.text();

      documentsXml += `  <document id="${docId}">\n`;
      documentsXml += `    <file_path>${escapeXmlText(filePath)}</file_path>\n`;
      documentsXml += `    <document_content><![CDATA[${content}]]></document_content>\n`;
      documentsXml += `  </document>\n`;
      docId++;
    } catch (e) {
      console.error('Error reading file:', filePath, e);
      errorCount++;
    }
  }

  if (errorCount > 0) {
    toast({
      title: 'Warning',
      description: `Failed to read ${errorCount} file(s). Check console for details.`,
      variant: 'destructive',
      duration: 3000
    });
  }

  return documentsXml;
}

/**
 * Builds a plain text directory structure.
 */
export async function buildDirectoryPlainText(
  dirHandle: FileSystemDirectoryHandle,
  ignoredDirs: Set<string>,
  dirName: string,
  indent = '',
  isLast = true,
  prefix = ''
): Promise<string> {
  const allEntries: FileSystemHandle[] = [];
  for await (const entryHandle of dirHandle.values()) {
    allEntries.push(entryHandle);
  }

  // Sort by type (directories first) then by name
  allEntries.sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === 'directory' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  // Filter out ignored directories
  const filteredEntries = allEntries.filter(entry => 
    entry.kind === 'file' || !shouldIgnoreDirectory(entry.name, ignoredDirs)
  );

  let content = '';
  
  if (dirName !== '.') {
    content += `${prefix}${isLast ? '└── ' : '├── '}📁 ${dirName}\n`;
  }
  
  const childPrefix = prefix + (isLast ? '    ' : '│   ');
  
  for (let i = 0; i < filteredEntries.length; i++) {
    const entryHandle = filteredEntries[i];
    const name = entryHandle.name;
    const isLastChild = i === filteredEntries.length - 1;
    
    if (entryHandle.kind === 'directory') {
      content += await buildDirectoryPlainText(
        entryHandle as FileSystemDirectoryHandle,
        ignoredDirs,
        name,
        indent + '  ',
        isLastChild,
        childPrefix
      );
    } else {
      content += `${childPrefix}${isLastChild ? '└── ' : '├── '}📄 ${name}\n`;
    }
  }
  return content;
}

/**
 * Builds a plain text documents section.
 */
export async function buildDocumentsPlainText(
  selectedFiles: Set<string>,
  directoryHandles: Map<string, FileSystemDirectoryHandle>
): Promise<string> {
  let content = '';
  let errorCount = 0;

  // Sort files by path for better organization
  const sortedFiles = Array.from(selectedFiles).sort();

  for (const filePath of sortedFiles) {
    const fileDir = filePath.substring(0, filePath.lastIndexOf('/')) || '.';
    const fileName = filePath.split('/').pop()!;
    const fileDirHandle = directoryHandles.get(fileDir);
    
    if (!fileDirHandle) {
      console.error('Directory not found:', fileDir);
      errorCount++;
      continue;
    }

    try {
      const fileHandle = await fileDirHandle.getFileHandle(fileName, { create: false });
      const file = await fileHandle.getFile();
      const fileContent = await file.text();

      // Use markdown-style code block with language inference from file extension
      const fileExt = fileName.split('.').pop() || '';
      content += `\n## File: ${filePath}\n\n`;
      content += `\`\`\`${fileExt}\n${fileContent}\n\`\`\`\n\n`;
    } catch (e) {
      console.error('Error reading file:', filePath, e);
      errorCount++;
    }
  }

  if (errorCount > 0) {
    toast({
      title: 'Warning',
      description: `Failed to read ${errorCount} file(s). Check console for details.`,
      variant: 'destructive',
      duration: 3000
    });
  }

  return content;
}

/**
 * Generates the output, returning both the output string and a token estimate.
 * Can generate in XML format or plain text based on the useXmlFormat parameter.
 */
export async function generateOutput(
  rootDirectoryHandle: FileSystemDirectoryHandle,
  selectedFiles: Set<string>,
  directoryHandles: Map<string, FileSystemDirectoryHandle>,
  ignoredDirs: Set<string>,
  useXmlFormat: boolean = true
): Promise<{ output: string; tokenEstimate: number }> {
  let result = '';
  
  if (useXmlFormat) {
    const directoryXml = await buildDirectoryXml(rootDirectoryHandle, ignoredDirs, '.');
    const documentsXml = await buildDocumentsXml(selectedFiles, directoryHandles);

    result =
      `<codebase_context>\n` +
      `<directory_structure>\n` +
      directoryXml +
      `</directory_structure>\n\n` +
      `<documents>\n` +
      documentsXml +
      `</documents>\n` +
      `</codebase_context>`;
  } else {
    // Create a more visually appealing tree structure
    const dirStructure = await buildDirectoryPlainText(rootDirectoryHandle, ignoredDirs, '.', '', true, '');
    const documents = await buildDocumentsPlainText(selectedFiles, directoryHandles);

    result =
      `# CODEBASE STRUCTURE\n\n` +
      dirStructure + 
      `\n# CODE FILES\n` +
      documents;
  }

  // Rough token estimate: 1 token ~ 4 characters
  const totalCharacters = result.length;
  const tokenEstimate = Math.ceil(totalCharacters / 4);

  return { output: result, tokenEstimate };
}

/**
 * Legacy function for backward compatibility
 */
export async function generateXmlOutput(
  rootDirectoryHandle: FileSystemDirectoryHandle,
  selectedFiles: Set<string>,
  directoryHandles: Map<string, FileSystemDirectoryHandle>,
  ignoredDirs: Set<string>
): Promise<{ xml: string; tokenEstimate: number }> {
  const { output, tokenEstimate } = await generateOutput(
    rootDirectoryHandle,
    selectedFiles,
    directoryHandles,
    ignoredDirs,
    true
  );
  return { xml: output, tokenEstimate };
}
