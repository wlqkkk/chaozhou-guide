import json
import re
import subprocess
import os
from pathlib import Path

# 读取故事点数据
data_path = Path(__file__).parent / 'data' / 'points.js'
content = data_path.read_text(encoding='utf-8')

# 去掉开头的 const GUIDE_DATA = 和结尾的 ;
json_content = re.sub(r'^const\s+GUIDE_DATA\s*=\s*', '', content).strip()
if json_content.endswith(';'):
    json_content = json_content[:-1]

data = json.loads(json_content)
points = data['points']

# 输出目录
audio_dir = Path(__file__).parent / 'audio'
audio_dir.mkdir(exist_ok=True)

# 音色选择
# 推荐：zh-CN-XiaoxiaoNeural（晓晓，女声，自然）
# 其他可选：zh-CN-XiaoyiNeural, zh-CN-YunjianNeural, zh-CN-YunxiNeural, zh-CN-YunyangNeural
VOICE = 'zh-CN-XiaoxiaoNeural'

print(f'开始用 edge-tts 音色 {VOICE} 生成 {len(points)} 个故事点音频...')

for idx, point in enumerate(points, 1):
    text = f"{point['title']}。{point.get('summary', '')}。{point.get('story', '')}"
    output_file = audio_dir / f"{point['id']}.mp3"

    try:
        subprocess.run(
            ['edge-tts', '--voice', VOICE, '--text', text, '--write-media', str(output_file)],
            check=True,
            timeout=120,
            capture_output=True
        )
        size_kb = output_file.stat().st_size / 1024
        print(f'[{idx}/{len(points)}] {point["id"]} {point["title"]} — {size_kb:.1f} KB')
    except subprocess.CalledProcessError as e:
        print(f'生成失败: {point["id"]} {point["title"]}')
        print(e.stderr.decode('utf-8', errors='ignore') if e.stderr else '')
    except Exception as e:
        print(f'生成失败: {point["id"]} {point["title"]} — {e}')

print('音频生成完成。')
print(f'文件保存在: {audio_dir}')
print(f'当前音色: {VOICE}')
print('')
print('如需更换音色，修改脚本中的 VOICE 变量后重新运行。')
