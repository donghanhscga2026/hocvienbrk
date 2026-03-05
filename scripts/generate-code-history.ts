import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';

const PROJECT_ROOT = process.cwd();
const OUTPUT_DIR = path.join(PROJECT_ROOT);

function getTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}_${hours}${minutes}${seconds}`;
}

function getProjectStructure(): string {
  const ignoreDirs = ['node_modules', '.next', '.git', '.agent', 'test-github-run', '__pycache__'];
  
  const structure: string[] = [];
  
  function walkDir(dir: string, prefix: string = '') {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    const dirs: string[] = [];
    const files: string[] = [];
    
    for (const item of items) {
      const relativePath = path.relative(PROJECT_ROOT, path.join(dir, item.name));
      
      if (ignoreDirs.includes(item.name)) continue;
      
      if (item.isDirectory()) {
        dirs.push(item.name);
      } else if (item.isFile() && (item.name.endsWith('.ts') || item.name.endsWith('.tsx') || item.name.endsWith('.json') || item.name.endsWith('.prisma') || item.name.endsWith('.css') || item.name.endsWith('.md') || item.name.match(/^(next\.config|tsconfig|postcss|tailwind)/i))) {
        files.push(item.name);
      }
    }
    
    for (const d of dirs) {
      structure.push(`${prefix}├── ${d}/`);
      walkDir(path.join(dir, d), prefix + '│   ');
    }
    
    for (let i = 0; i < files.length; i++) {
      const isLast = i === files.length - 1 && dirs.length === 0;
      structure.push(`${prefix}${isLast ? '└── ' : '├── '}${files[i]}`);
    }
  }
  
  structure.push('HocVien-BRK/');
  walkDir(PROJECT_ROOT);
  
  return structure.join('\n');
}

function getAllSourceFiles(): { filePath: string; relativePath: string; category: string }[] {
  const files: { filePath: string; relativePath: string; category: string }[] = [];
  const seen = new Set<string>();
  const extensions = ['.ts', '.tsx', '.json', '.prisma'];
  
  function walkDir(dir: string) {
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        const relativePath = path.relative(PROJECT_ROOT, fullPath).replace(/\\/g, '/');
        
        if (relativePath.includes('node_modules') || 
            relativePath.includes('.next') || 
            relativePath.includes('test-github-run') ||
            relativePath.includes('generate-code-history') ||
            relativePath.includes('.agent') ||
            relativePath.startsWith('.')) continue;
        
        if (seen.has(relativePath)) continue;
        
        if (item.isDirectory()) {
          walkDir(fullPath);
        } else if (item.isFile()) {
          const ext = path.extname(item.name);
          if (!extensions.includes(ext) && !item.name.match(/^(next\.config|tsconfig|postcss|tailwind)/i)) continue;
          
          seen.add(relativePath);
          
          let category = 'other';
          if (relativePath.startsWith('app/actions/')) category = 'actions';
          else if (relativePath.startsWith('app/api/')) category = 'api';
          else if (relativePath.startsWith('app/admin/')) category = 'admin';
          else if (relativePath.startsWith('app/courses/')) category = 'courses';
          else if (relativePath.startsWith('components/')) category = 'components';
          else if (relativePath.startsWith('lib/')) category = 'lib';
          else if (relativePath.startsWith('prisma/')) category = 'prisma';
          else if (relativePath.startsWith('scripts/')) category = 'scripts';
          else if (relativePath.startsWith('types/')) category = 'types';
          else if (relativePath === 'auth.ts' || relativePath === 'auth.config.ts' || relativePath === 'middleware.ts') category = 'auth';
          else if (relativePath.includes('package.json') || relativePath.includes('tsconfig') || relativePath.includes('next.config')) category = 'config';
          
          files.push({
            filePath: fullPath,
            relativePath,
            category
          });
        }
      }
    } catch (e) {
      // Ignore permission errors
    }
  }
  
  walkDir(PROJECT_ROOT);
  return files;
}

function readFileContent(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

function generateMarkdown(): string {
  const timestamp = getTimestamp();
  const now = new Date().toISOString().slice(0, 10);
  
  let md = `# CODE_HISTORY_${timestamp}.md

================================================================================
PHIÊN BẢN: ${timestamp}
NGÀY TẠO: ${now}
MÔ TẢ: Tự động generate toàn bộ code dự án BRK Academy
================================================================================

`;
  
  md += `## CẤU TRÚC DỰ ÁN

\`\`\`
${getProjectStructure()}
\`\`\`

`;
  
  const files = getAllSourceFiles();
  
  const categoryOrder = ['auth', 'config', 'prisma', 'lib', 'actions', 'api', 'components', 'admin', 'courses', 'scripts', 'types', 'other'];
  
  for (const category of categoryOrder) {
    const categoryFiles = files.filter(f => f.category === category);
    if (categoryFiles.length === 0) continue;
    
    md += `## ${category.toUpperCase()} FILES\n\n`;
    
    for (const file of categoryFiles) {
      const content = readFileContent(file.filePath);
      if (!content) continue;
      
      const ext = path.extname(file.relativePath);
      const lang = ext === '.tsx' ? 'tsx' : ext === '.prisma' ? 'prisma' : 'ts';
      
      md += `### ${file.relativePath}\n\n`;
      md += `\`\`\`${lang}\n${content}\n\`\`\`\n\n`;
    }
  }
  
  return md;
}

function main() {
  console.log('🔄 Đang generate CODE_HISTORY...');
  
  const timestamp = getTimestamp();
  const outputFile = path.join(OUTPUT_DIR, `CODE_HISTORY_${timestamp}.md`);
  
  const content = generateMarkdown();
  
  fs.writeFileSync(outputFile, content, 'utf-8');
  
  const stats = fs.statSync(outputFile);
  const sizeKB = (stats.size / 1024).toFixed(2);
  
  console.log(`✅ Đã tạo file: ${outputFile}`);
  console.log(`📊 Kích thước: ${sizeKB} KB`);
}

main();
