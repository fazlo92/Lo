"""Shared phrase splitting + Malay spoken-form normalisation for the VO aligners."""
import re

ONES = ['kosong', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'lapan', 'sembilan']

def num_ms(n):
    n = int(n)
    if n < 10: return ONES[n]
    if n == 10: return 'sepuluh'
    if n == 11: return 'sebelas'
    if n < 20: return ONES[n - 10] + ' belas'
    if n < 100: return ONES[n // 10] + ' puluh' + ('' if n % 10 == 0 else ' ' + ONES[n % 10])
    if n < 1000: return ('seratus' if n // 100 == 1 else ONES[n // 100] + ' ratus') + ('' if n % 100 == 0 else ' ' + num_ms(n % 100))
    if n < 1000000: return ('seribu' if n // 1000 == 1 else num_ms(n // 1000) + ' ribu') + ('' if n % 1000 == 0 else ' ' + num_ms(n % 1000))
    return num_ms(n // 1000000) + ' juta' + ('' if n % 1000000 == 0 else ' ' + num_ms(n % 1000000))

def spoken(s):
    s = re.sub(r'RM\s?(\d+)', lambda m: num_ms(m.group(1)) + ' ringgit', s)
    s = re.sub(r'(\d+)\.(\d\d)', lambda m: num_ms(m.group(1)) + ('' if m.group(2) == '00' else ' ' + num_ms(m.group(2))), s)
    s = re.sub(r'(\d+)%', lambda m: num_ms(m.group(1)) + ' peratus', s)
    s = re.sub(r'\d+', lambda m: num_ms(m.group(0)), s)
    return s

def phrases(md):
    txt = open(md).read().split('## Skrip (tampal di ruangan teks)')[1].strip()
    paras = [p.strip() for p in txt.split('\n\n') if p.strip()]
    out = []
    for pi, p in enumerate(paras):
        for q in re.findall(r'.+?(?:[.,?…—!]+(?=\s|$)|$)', p):
            q = q.replace('"', '').strip()
            if q and re.search(r'\w', q): out.append((pi, q))
    return out
