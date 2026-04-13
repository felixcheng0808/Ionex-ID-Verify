#!/usr/bin/env python3
"""
CAPTCHA 辨識腳本 - 使用 ddddocr
用法: python3 solve_captcha.py <image_path>
輸出: 辨識到的驗證碼文字（標準輸出）
"""
import sys
import os

def solve(image_path):
    import ddddocr
    ocr = ddddocr.DdddOcr(show_ad=False)
    with open(image_path, 'rb') as f:
        image_bytes = f.read()
    result = ocr.classification(image_bytes)
    return result.strip()

if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.stderr.write('Usage: python3 solve_captcha.py <image_path>\n')
        sys.exit(1)

    image_path = sys.argv[1]
    if not os.path.exists(image_path):
        sys.stderr.write(f'File not found: {image_path}\n')
        sys.exit(1)

    result = solve(image_path)
    print(result, end='')
