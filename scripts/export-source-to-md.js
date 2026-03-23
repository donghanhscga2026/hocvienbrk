const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// --- CẤU HÌNH ---
const SOURCE_DIR = process.cwd();
const EXPORT_DIR = path.join(SOURCE_DIR, 'source_md');
const MANIFEST_PATH = path.join(EXPORT_DIR, 'MANIFEST.json');

// Các định dạng file quan trọng cần xuất
const TARGET_EXTENSIONS = ['.ts', '.tsx', '.prisma', '.css', '.json', '.mjs', '.bat', '.sh', '.ps1', '.md', '.yml', '.yaml'];

// Các thư mục cần bỏ qua
const IGNORE_DIRS = [
  '.git',
  '.next',
  'node_modules',
  'source_md',
  'public',
  'backups',
  'test-github-run',
  '.vercel',
  'dist',
  'out'
];

// Các file cụ thể cần bỏ qua (để bảo mật)
const IGNORE_FILES = [
  'package-lock.json',
  '.env',
  '.env.local',
  'MANIFEST.json'
];

// --- HÀM HỖ TRỢ ---

// Tính hash nội dung file để so sánh thay đổi
function getHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Lấy danh sách file đệ quy
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    const relativePath = path.relative(SOURCE_DIR, fullPath);

    if (fs.statSync(fullPath).isDirectory()) {
      if (!IGNORE_DIRS.includes(file)) {
        getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      const ext = path.extname(file).toLowerCase();
      if (TARGET_EXTENSIONS.includes(ext) && !IGNORE_FILES.includes(file)) {
        arrayOfFiles.push(relativePath);
      }
    }
  });

  return arrayOfFiles;
}

// Tạo nội dung Markdown cho file code
function generateMdContent(filePath, content) {
  const ext = path.extname(filePath).substring(1) || 'text';
  // Một số định dạng cần ánh xạ lại để highlight code tốt hơn
  const langMap = {
    'tsx': 'typescript',
    'ts': 'typescript',
    'prisma': 'prisma',
    'mjs': 'javascript',
    'ps1': 'powershell'
  };
  const lang = langMap[ext] || ext;

  return `---
path: ${filePath}
---

# File: ${filePath}

\`\`\`${lang}
${content}
\`\`\`
`;
}

// --- LUỒNG CHÍNH ---

function main() {
  console.log('🚀 Đang bắt đầu quá trình xuất mã nguồn sang .md...');

  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
    console.log(`📁 Đã tạo thư mục: ${EXPORT_DIR}`);
  }

  let manifest = {};
  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    } catch (e) {
      console.error('⚠️ Lỗi đọc MANIFEST.json, sẽ tạo mới.');
    }
  }

  const allFiles = getAllFiles(SOURCE_DIR);
  let created = 0;
  let updated = 0;
  let skipped = 0;

  allFiles.forEach((file) => {
    const fullPath = path.join(SOURCE_DIR, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    const hash = getHash(content);
    const mtime = fs.statSync(fullPath).mtime.toISOString();

    const mdPathRelative = `${file}.md`;
    const mdFullPath = path.join(EXPORT_DIR, mdPathRelative);

    // Kiểm tra xem có cần cập nhật không
    if (manifest[file] && manifest[file].hash === hash && fs.existsSync(mdFullPath)) {
      skipped++;
      return;
    }

    // Tạo thư mục cha cho file md nếu chưa có
    const mdDir = path.dirname(mdFullPath);
    if (!fs.existsSync(mdDir)) {
      fs.mkdirSync(mdDir, { recursive: true });
    }

    // Ghi file MD
    const mdContent = generateMdContent(file, content);
    fs.writeFileSync(mdFullPath, mdContent);

    // Cập nhật manifest
    if (manifest[file]) {
      updated++;
    } else {
      created++;
    }

    manifest[file] = {
      filePath: file,
      lastModified: mtime,
      mdPath: path.join('source_md', mdPathRelative),
      hash: hash
    };
  });

  // Ghi lại manifest mới
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  console.log('\n✅ Hoàn thành!');
  console.log(`- Tạo mới: ${created}`);
  console.log(`- Cập nhật: ${updated}`);
  console.log(`- Bỏ qua (không đổi): ${skipped}`);
  console.log(`- Tổng cộng: ${allFiles.length} file.`);
  console.log(`\n📄 Manifest lưu tại: ${MANIFEST_PATH}`);
}

main();
