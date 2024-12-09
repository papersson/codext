import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

type FileNode = {
  name: string;
  path: string;
  type: 'file' | 'directory';
};

type TreeNode = {
  name: string;
  type: 'directory' | 'file';
  children?: TreeNode[];
};

async function listDirectory(
  dirPath: string,
  limit: number,
  offset: number
): Promise<{ entries: FileNode[]; hasMore: boolean }> {
  const allEntries = await fs.readdir(dirPath, { withFileTypes: true });
  allEntries.sort((a, b) => a.name.localeCompare(b.name));

  const sliced = allEntries.slice(offset, offset + limit);

  const entries = sliced.map(entry => ({
    name: entry.name,
    path: path.join(dirPath, entry.name),
    type: entry.isDirectory() ? 'directory' : 'file',
  }));

  const hasMore = offset + limit < allEntries.length;

  return { entries, hasMore };
}

async function buildFullTree(dirPath: string, ignoredDirs: Set<string>): Promise<TreeNode[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));

  const tree: TreeNode[] = [];
  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) {
      continue; 
    }

    if (entry.isDirectory()) {
      const children = await buildFullTree(path.join(dirPath, entry.name), ignoredDirs);
      tree.push({
        name: entry.name,
        type: 'directory',
        children
      });
    } else {
      tree.push({
        name: entry.name,
        type: 'file'
      });
    }
  }
  return tree;
}

function treeToText(tree: TreeNode[], indent = ''): string {
  return tree.map(node => {
    if (node.type === 'directory') {
      const subtree = treeToText(node.children || [], indent + '  ');
      return `${indent}${node.name}/\n${subtree}`;
    } else {
      return `${indent}${node.name}\n`;
    }
  }).join('');
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const selected = searchParams.getAll('selected'); 
  const dirPath = searchParams.get('path') || '.'; 
  const limit = Number(searchParams.get('limit') || '50');
  const offset = Number(searchParams.get('offset') || '0');
  const fullTree = searchParams.get('fullTree') === 'true';
  const ignored = searchParams.getAll('ignore'); // multiple ignore params
  const ignoredDirs = new Set(ignored.map(i => i.trim()).filter(Boolean));

  const resolvedPath = path.resolve(process.cwd(), dirPath);

  if (fullTree) {
    const fullTreeData = await buildFullTree(resolvedPath, ignoredDirs);
    const directoryStructure = treeToText(fullTreeData);
    return NextResponse.json({ directoryStructure });
  }

  if (selected.length > 0) {
    const { entries, hasMore } = await listDirectory(resolvedPath, limit, offset);
    const selectedFilesData: { path: string; content: string }[] = [];
    for (const filePath of selected) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        selectedFilesData.push({ path: filePath, content });
      } catch {}
    }
    return NextResponse.json({ entries, hasMore, selectedFilesData });
  }

  const { entries, hasMore } = await listDirectory(resolvedPath, limit, offset);
  return NextResponse.json({ entries, hasMore });
}
