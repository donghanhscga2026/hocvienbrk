const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// --- CẤU HÌNH ---
const SOURCE_DIR = process.cwd();
const EXPORT_DIR = path.join(SOURCE_DIR, 'code_txt');
const MANIFEST_PATH = path.join(EXPORT_DIR, 'MANIFEST.json');

// Các định dạng file quan trọng
const TARGET_EXTENSIONS = ['.ts', '.tsx', '.prisma', '.css', '.json', '.mjs', '.bat', '.sh', '.ps1', '.md', '.yml', '.yaml'];

// Các thư mục bỏ qua
const IGNORE_DIRS = [
  '.git', '.next', 'node_modules', 'public', 'backups', 'dist', 'out', '.vercel',
  'source_md', 'notebooklm_bundles', 'notebooklm_txt_bundles', 'code_txt'
];

// File bỏ qua
const IGNORE_FILES = ['package-lock.json', 'MANIFEST.json', '.env'];

// --- HÀM HỖ TRỢ ---

function getHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

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

function generateTxtContent(filePath, content) {
  const separator = '='.repeat(80);
  return `${separator}\nFILE: ${filePath}\n${separator}\n\n${content}\n\n${separator}\nEND OF FILE: ${filePath}\n${separator}\n`;
}

// --- LUỒNG CHÍNH ---

function main() {
  console.log('🚀 Bắt đầu cập nhật mã nguồn vào thư mục code_txt...');

  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }

  let manifest = {};
  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    } catch (e) {
      manifest = {};
    }
  }

  const allFiles = getAllFiles(SOURCE_DIR);
  let created = 0;
  let updated = 0;
  let skipped = 0;

  // Tạo sơ đồ cấu trúc dự án
  const structureText = allFiles.join('\n');
  fs.writeFileSync(path.join(EXPORT_DIR, 'PROJECT_STRUCTURE.txt'), structureText);

  allFiles.forEach((file) => {
    const fullPath = path.join(SOURCE_DIR, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    const hash = getHash(content);
    
    // Đường dẫn file .txt tương ứng (giữ nguyên cấu trúc thư mục)
    const txtRelativePath = file + '.txt';
    const txtFullPath = path.join(EXPORT_DIR, txtRelativePath);

    // Kiểm tra thay đổi
    if (manifest[file] && manifest[file].hash === hash && fs.existsSync(txtFullPath)) {
      skipped++;
      return;
    }

    // Tạo thư mục cha nếu cần
    const txtDir = path.dirname(txtFullPath);
    if (!fs.existsSync(txtDir)) {
      fs.mkdirSync(txtDir, { recursive: true });
    }

    // Ghi file .txt
    fs.writeFileSync(txtFullPath, generateTxtContent(file, content));

    if (manifest[file]) {
      updated++;
    } else {
      created++;
    }

    // Cập nhật manifest
    manifest[file] = {
      hash: hash,
      updatedAt: new Date().toISOString()
    };
  });

  // Lưu manifest
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  console.log(`\n✅ Hoàn tất!`);
  console.log(`- Tạo mới: ${created}`);
  console.log(`- Cập nhật (có thay đổi): ${updated}`);
  console.log(`- Giữ nguyên: ${skipped}`);
  console.log(`- Tổng cộng: ${allFiles.length} file đã được xử lý.`);
  console.log(`\n📂 Dữ liệu nằm tại thư mục: ${EXPORT_DIR}`);
}

main();
