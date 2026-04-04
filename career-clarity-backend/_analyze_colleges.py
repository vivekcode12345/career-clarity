import csv
import re
from pathlib import Path

p = Path('prediction_module/colleges.csv')
rows = list(csv.reader(p.open(encoding='utf-8-sig')))
print('rows_total=', len(rows) - 1)

bad = []
for i, row in enumerate(rows[1:], start=2):
    if len(row) < 6:
        bad.append((i, 'too_few', len(row), row))
        continue
    fee_index = None
    for idx in range(2, len(row)):
        tok = row[idx].strip().replace(',', '')
        if re.fullmatch(r'\d+(?:\.\d+)?', tok):
            fee_index = idx
            break
    if fee_index is None or fee_index + 2 >= len(row):
        bad.append((i, 'no_fee_or_type', len(row), row))
        continue
    apply_link = None
    for idx in range(fee_index + 3, len(row)):
        tok = row[idx].strip()
        if tok.startswith('http://') or tok.startswith('https://'):
            apply_link = tok
            break
    if not apply_link:
        bad.append((i, 'no_link', len(row), row))

print('bad_count=', len(bad))
for item in bad[:15]:
    print('BAD', item[0], item[1], 'len=', item[2], 'head=', item[3][:10])
