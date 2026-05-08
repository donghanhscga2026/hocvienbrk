import csv

with open('plan_temp/User_rows (1).csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    next(reader)
    ids = [int(row[0]) for row in reader]

def calc_ref_sys_id(user_id):
    if user_id == 0:
        return 0
    return (user_id - 1) // 4

with open('matrix_output_new.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['userId', 'onSystem', 'refSysId'])
    for i, user_id in enumerate(ids):
        ref_sys_id = calc_ref_sys_id(i)
        writer.writerow([user_id, 1, ref_sys_id])

print(f"Da tao file voi {len(ids)} dong")
