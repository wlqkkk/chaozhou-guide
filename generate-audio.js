const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 读取故事点数据
const dataPath = path.join(__dirname, 'data', 'points.js');
const dataContent = fs.readFileSync(dataPath, 'utf-8');

// 去掉开头的 const GUIDE_DATA = 和结尾的 ;
const jsonContent = dataContent
  .replace(/^const\s+GUIDE_DATA\s*=\s*/, '')
  .replace(/;\s*$/, '');

const data = JSON.parse(jsonContent);
const points = data.points;

const audioDir = path.join(__dirname, 'audio');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

// 使用美佳音色（用户指定的四个之一，macOS 自带）
const voice = 'Meijia';

console.log(`开始生成 ${points.length} 个故事点的音频文件...`);
console.log(`使用音色：${voice}`);

points.forEach((point, index) => {
  const text = `${point.title}。${point.summary || ''}。${point.story || ''}`;
  const mp3Path = path.join(audioDir, `${point.id}.mp3`);
  const aiffPath = path.join(audioDir, `${point.id}.aiff`);

  try {
    // 生成 AIFF
    execSync(`say -v "${voice}" ${JSON.stringify(text)} -o "${aiffPath}"`, {
      timeout: 60000
    });

    // 转换为 MP3
    execSync(`ffmpeg -y -i "${aiffPath}" -ar 22050 -ac 1 -b:a 48k "${mp3Path}"`, {
      timeout: 60000,
      stdio: 'ignore'
    });

    // 删除临时 AIFF
    fs.unlinkSync(aiffPath);

    const stats = fs.statSync(mp3Path);
    console.log(`[${index + 1}/${points.length}] ${point.id} ${point.title} — ${(stats.size / 1024).toFixed(1)} KB`);
  } catch (err) {
    console.error(`生成失败: ${point.id} ${point.title}`, err.message);
  }
});

console.log('音频生成完成。');
console.log(`音频文件保存在: ${audioDir}`);
