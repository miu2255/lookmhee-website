#!/usr/bin/env python3
"""Generate Lookmhee's public articles.json from Decap CMS post files."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
POSTS = ROOT / 'content' / 'posts'
OUTPUT = ROOT / 'articles.json'
REQUIRED = ('title', 'category', 'emoji', 'excerpt', 'date', 'body')


def main():
    files = sorted(POSTS.glob('*.json'))
    if not files:
        raise SystemExit('No CMS post JSON files found; refusing to overwrite articles.json')
    articles = []
    for file in files:
        data = json.loads(file.read_text(encoding='utf-8-sig'))
        if not isinstance(data, dict):
            raise ValueError(f'{file}: expected a JSON object')
        missing = [key for key in REQUIRED if key not in data]
        if missing:
            raise ValueError(f'{file}: missing fields {missing}')
        body = data['body']
        if not isinstance(body, list) or not all(isinstance(p, str) for p in body):
            raise ValueError(f'{file}: body must be a list of paragraph strings')
        post_id = file.stem
        if data.get('id') and data['id'] != post_id:
            raise ValueError(f'{file}: id does not match filename')
        articles.append({'id': post_id, **{key: data[key] for key in REQUIRED}})
    articles.sort(key=lambda item: item['date'], reverse=True)
    OUTPUT.write_text(json.dumps(articles, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Generated {OUTPUT.name} with {len(articles)} articles')


if __name__ == '__main__':
    main()
