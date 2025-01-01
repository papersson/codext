import { FileNode } from './fsUtils';
import { toast } from '@/hooks/use-toast';

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
    if (ignoredDirs.has(name)) continue;
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
 * Generates the complete XML output, returning both the XML string and a token estimate.
 * (We no longer embed <token_estimate> in the XML itself.)
 */
export async function generateXmlOutput(
  rootDirectoryHandle: FileSystemDirectoryHandle,
  selectedFiles: Set<string>,
  directoryHandles: Map<string, FileSystemDirectoryHandle>,
  ignoredDirs: Set<string>
): Promise<{ xml: string; tokenEstimate: number }> {
  const directoryXml = await buildDirectoryXml(rootDirectoryHandle, ignoredDirs, '.');
  const documentsXml = await buildDocumentsXml(selectedFiles, directoryHandles);

  const result =
    `<codebase_context>\n` +
    `<directory_structure>\n` +
    directoryXml +
    `</directory_structure>\n\n` +
    `<documents>\n` +
    documentsXml +
    `</documents>\n` +
    `</codebase_context>`;

  // Rough token estimate: 1 token ~ 4 characters
  const totalCharacters = result.length;
  const tokenEstimate = Math.ceil(totalCharacters / 4);

  return { xml: result, tokenEstimate };
}
