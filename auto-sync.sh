#!/bin/bash

# auto-sync.sh - Script đồng bộ Git và Backup cho macOS (v2.0 - Bảo mật cao)
# Bản quyền thuộc về HocVien-BRK

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== KHỞI CHẠY HỆ THỐNG ĐỒNG BỘ TỰ ĐỘNG ===${NC}"

# 1. Dọn dẹp file rác
find . -name ".DS_Store" -depth -exec rm {} \;

# 2. Đảm bảo các thư mục nhạy cảm bị bỏ qua
if ! grep -q ".continue/" .gitignore; then
    echo ".continue/" >> .gitignore
    echo -e "${YELLOW}Đã tự động thêm .continue/ vào .gitignore${NC}"
fi

# 3. Kiểm tra trạng thái Git
STATUS=$(git status --porcelain)

if [ -z "$STATUS" ]; then
    echo -e "${YELLOW}Hệ thống sạch, không có gì để commit.${NC}"
else
    echo -e "${GREEN}Tìm thấy thay đổi mới, đang chuẩn bị đẩy code...${NC}"
    
    # 4. Add thay đổi (trừ các file nhạy cảm đã bị gitignore)
    git add .

    # 5. Tạo Message Commit
    if [ -z "$1" ]; then
        COMMIT_MSG="auto: sync update $(date +'%Y-%m-%d %H:%M:%S')"
    else
        COMMIT_MSG="$1"
    fi

    # 6. Commit và Push
    git commit -m "$COMMIT_MSG"
    
    echo -e "${BLUE}Đang đẩy code lên GitHub...${NC}"
    git push origin master

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✔ ĐỒNG BỘ THÀNH CÔNG!${NC}"
    else
        echo -e "${RED}✘ LỖI: Push thất bại. Có thể do conflict hoặc bảo mật. Hãy dùng 'git status' để kiểm tra.${NC}"
    fi
fi

# 7. Backup
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"
BACKUP_NAME="backup_$(date +'%Y%m%d_%H%M').zip"
echo -e "${BLUE}Đang tạo bản sao lưu dự phòng: ${YELLOW}$BACKUP_NAME${NC}"
zip -r "$BACKUP_DIR/$BACKUP_NAME" . -x "node_modules/*" ".next/*" ".git/*" "plan_temp/*" ".continue/*" > /dev/null

echo -e "${GREEN}✔ HOÀN TẤT TOÀN BỘ QUY TRÌNH!${NC}"
