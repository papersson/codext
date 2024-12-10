import { FileNode } from './fsUtils';

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

  for (const filePath of selectedFiles) {
    const fileDir = filePath.substring(0, filePath.lastIndexOf('/')) || '.';
    const fileName = filePath.split('/').pop()!;
    const fileDirHandle = directoryHandles.get(fileDir);
    if (!fileDirHandle) continue;

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
    }
  }

  return documentsXml;
}

/**
 * Generates the complete XML output.
 */
export async function generateXmlOutput(
  rootDirectoryHandle: FileSystemDirectoryHandle,
  selectedFiles: Set<string>,
  directoryHandles: Map<string, FileSystemDirectoryHandle>,
  ignoredDirs: Set<string>
): Promise<string> {
  const directoryXml = await buildDirectoryXml(rootDirectoryHandle, ignoredDirs, '.');
  const documentsXml = await buildDocumentsXml(selectedFiles, directoryHandles);

  return (
    `<codebase_context>\n` +
    `<directory_structure>\n` +
    directoryXml +
    `</directory_structure>\n\n` +
    `<documents>\n` +
    documentsXml +
    `</documents>\n` +
    `</codebase_context>`
  );
} 