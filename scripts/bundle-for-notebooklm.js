const fs = require('fs');
const path = require('path');

const SOURCE_DIR = process.cwd();
const BUNDLE_DIR = path.join(SOURCE_DIR, 'notebooklm_txt_bundles');
const MAX_BUNDLE_SIZE = 100 * 1024; // Giới hạn 100KB để NotebookLM đọc mượt nhất

const TARGET_EXTENSIONS = ['.ts', '.tsx', '.prisma', '.css', '.json', '.mjs', '.bat', '.sh', '.ps1'];
const IGNORE_DIRS = ['.git', '.next', 'node_modules', 'source_md', 'notebooklm_bundles', 'notebooklm_txt_bundles', 'public', 'backups'];

const GROUPS = {
  'CORE_CONFIG': ['package.json', 'tsconfig.json', 'next.config.ts', 'prisma/schema.prisma'],
  'APP_PAGES': ['app/account-settings', 'app/courses', 'app/forgot-password', 'app/login', 'app/register', 'app/page.tsx', 'app/layout.tsx'],
  'ADMIN_PANEL': ['app/admin'],
  'SERVER_ACTIONS': ['app/actions'],
  'API_ROUTES': ['app/api'],
  'COMPONENTS': ['components'],
  'LIB_LOGIC': ['lib'],
  'SCRIPTS': ['scripts']
};

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    const relativePath = path.relative(SOURCE_DIR, fullPath).replace(/\\/g, '/');

    if (fs.statSync(fullPath).isDirectory()) {
      if (!IGNORE_DIRS.includes(file)) {
        getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      const ext = path.extname(file).toLowerCase();
      if (TARGET_EXTENSIONS.includes(ext)) {
        arrayOfFiles.push(relativePath);
      }
    }
  });
  return arrayOfFiles;
}

function main() {
  console.log('🚀 Đang tạo bộ Bundle (.TXT) siêu sạch cho NotebookLM...');

  if (fs.existsSync(BUNDLE_DIR)) {
    fs.rmSync(BUNDLE_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(BUNDLE_DIR, { recursive: true });

  const allFiles = getAllFiles(SOURCE_DIR);
  const groupedFiles = {};

  allFiles.forEach(file => {
    let assigned = false;
    for (const [groupName, prefixes] of Object.entries(GROUPS)) {
      if (prefixes.some(p => file.startsWith(p))) {
        if (!groupedFiles[groupName]) groupedFiles[groupName] = [];
        groupedFiles[groupName].push(file);
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      if (!groupedFiles['OTHERS']) groupedFiles['OTHERS'] = [];
      groupedFiles['OTHERS'].push(file);
    }
  });

  for (const [groupName, files] of Object.entries(groupedFiles)) {
    let bundleIndex = 1;
    let currentContent = '';
    let currentSize = 0;

    files.forEach(file => {
      const fullPath = path.join(SOURCE_DIR, file);
      const code = fs.readFileSync(fullPath, 'utf8');
      
      const entry = `\n\n${'='.repeat(80)}\nFILE GỐC: ${file}\n${'='.repeat(80)}\n\n${code}\n\n${'='.repeat(80)}\nKẾT THÚC FILE: ${file}\n${'='.repeat(80)}\n`;
      const entrySize = Buffer.byteLength(entry, 'utf8');

      if (currentSize + entrySize > MAX_BUNDLE_SIZE && currentContent !== '') {
        fs.writeFileSync(path.join(BUNDLE_DIR, `BUNDLE_${groupName}_Part${bundleIndex}.txt`), currentContent);
        console.log(`✅ Đã tạo: BUNDLE_${groupName}_Part${bundleIndex}.txt (${Math.round(currentSize/1024)}KB)`);
        bundleIndex++;
        currentContent = entry;
        currentSize = entrySize;
      } else {
        currentContent += entry;
        currentSize += entrySize;
      }
    });

    if (currentContent !== '') {
      const name = bundleIndex > 1 ? `BUNDLE_${groupName}_Part${bundleIndex}.txt` : `BUNDLE_${groupName}.txt`;
      fs.writeFileSync(path.join(BUNDLE_DIR, name), currentContent);
      console.log(`✅ Đã tạo: ${name} (${Math.round(currentSize/1024)}KB)`);
    }
  }

  console.log(`\n🎉 HOÀN TẤT! Hãy dùng các file .txt trong thư mục: notebooklm_txt_bundles`);
}

main();
