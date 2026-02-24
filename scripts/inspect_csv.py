
import csv

def inspect_khoa_hoc():
    print("=== INSPECTING KHOAHOC.CSV ===")
    courses = []
    with open('KhoaHoc.csv', mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            courses.append(row)
    
    print(f"Total courses parsed: {len(courses)}")
    for i, c in enumerate(courses):
        print(f"{i+1}. id_khoa: [{c.get('id_khoa')}] | id_lop: [{c.get('id_lop')}] | name: {c.get('name_lop')}")
        if 'AI' in (c.get('name_lop') or ''):
            print(f"   >>> FOUND AI COURSE: {c.get('name_lop')}")
    return courses

def inspect_ls_dang_ky(courses):
    print("\n=== INSPECTING LS_DANGKY.CSV ===")
    course_ids_in_db = {c.get('id_khoa') for c in courses if c.get('id_khoa')}
    course_lops_in_db = {c.get('id_lop') for c in courses if c.get('id_lop')}
    
    reg_counts = {}
    total_reg = 0
    with open('LS_DangKy.csv', mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            total_reg += 1
            kid = row.get('id_khoa')
            lid = row.get('id_lop')
            key = kid if kid else lid
            reg_counts[key] = reg_counts.get(key, 0) + 1
            
    print(f"Total registrations in CSV: {total_reg}")
    print("Registration breakdown by id_khoa (or id_lop if empty):")
    for key, count in sorted(reg_counts.items(), key=lambda x: x[1], reverse=True):
        status = "MATCHED (id_khoa)" if key in course_ids_in_db else ("MATCHED (id_lop)" if key in course_lops_in_db else "MISSING")
        print(f"- {key}: {count} regs | {status}")

if __name__ == "__main__":
    courses = inspect_khoa_hoc()
    inspect_ls_dang_ky(courses)
