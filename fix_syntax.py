
import os

file_path = 'app/actions/admin-actions.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
found_duplicate = False

# Thuật toán: Tìm đoạn code bị lặp lại (bắt đầu từ map tcaId lần 2) và loại bỏ nó
for i in range(len(lines)):
    line = lines[i]
    
    # Phát hiện điểm bắt đầu của đoạn code bị lặp (dựa trên comment và cấu trúc)
    if "// Map theo tcaId cho root TCA (nếu khác userId)" in line and i > 200 and not found_duplicate:
        # Kiểm tra xem có phải là đoạn bị lặp không (đoạn này không có trường chucDanh)
        if i + 10 < len(lines) and "chucDanh" not in lines[i+5]:
            print(f"Found duplicate block at line {i+1}. Skipping...")
            skip = True
            found_duplicate = True
            continue
    
    if skip:
        # Tìm điểm kết thúc của đoạn lặp (dấu ngoặc nhọn đóng và dòng for tiếp theo)
        if "for (const c of allClosures)" in line:
            skip = False
            new_lines.append(line)
        continue
        
    new_lines.append(line)

if found_duplicate:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("Successfully fixed syntax error surgically.")
else:
    print("Duplicate block not found with this pattern.")
