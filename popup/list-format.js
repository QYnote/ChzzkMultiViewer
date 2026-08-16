// ── 공유 글 형식 ──
// 저장된 목록을 남과 주고받기 위한 글 형식만 다룬다. 저장소·화면에는 접근하지 않는다.
//
//   [MultiStream] 주말 조합
//   치지직|채널고유ID|닉네임
//   SOOP|채널고유ID|닉네임
//
// ⚠️ 이 형식은 배포되는 순간 바꾸기 어려운 약속이 된다. 남이 보낸 글을 우리가
//    읽어야 하므로, 형식을 바꾸면 예전에 오간 글을 읽지 못한다.

const SHARE_HEADER    = '[MultiStream]';
const SHARE_FIELD_SEP = '|';

// 글에 적히는 플랫폼 이름. 사용자가 화면에서 보는 이름과 같게 둔다.
// 구분자를 세로줄로 둔 까닭은 닉네임에 공백이 흔해서다. 공백으로 나누면 이름이 잘린다.
const SHARE_PLATFORM_LABEL = { chzzk: '치지직', soop: 'SOOP' };

function platformFromShareLabel(label) {
  const lowered = String(label).trim().toLowerCase();
  return Object.keys(SHARE_PLATFORM_LABEL)
    .find(key => SHARE_PLATFORM_LABEL[key].toLowerCase() === lowered) || null;
}

// ── 목록 한 벌 → 글 ──
function buildShareText(name, channels) {
  const lines = [`${SHARE_HEADER} ${name}`];
  (channels || []).forEach((ch) => {
    const label = SHARE_PLATFORM_LABEL[ch.platform] || SHARE_PLATFORM_LABEL.chzzk;
    lines.push([label, ch.channelId, ch.name].join(SHARE_FIELD_SEP));
  });
  return lines.join('\n');
}

// ── 글 → 목록 한 벌 ──
// 우리 형식이 아니면 null. 맞으면 { name, channels, skipped }를 준다.
// 일부 줄만 깨진 글은 읽을 수 있는 것만 담고, 건너뛴 줄 수를 알려 준다.
function parseShareText(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line !== '');

  if (lines.length === 0 || !lines[0].startsWith(SHARE_HEADER)) return null;

  const name = lines[0].slice(SHARE_HEADER.length).trim();
  const channels = [];
  let skipped = 0;

  lines.slice(1).forEach((line) => {
    const parts = line.split(SHARE_FIELD_SEP);
    if (parts.length < 3) { skipped++; return; }

    const platform  = platformFromShareLabel(parts[0]);
    const channelId = parts[1].trim();
    // 닉네임에 구분자가 들어 있어도 잃지 않도록 나머지를 도로 잇는다
    const channelName = parts.slice(2).join(SHARE_FIELD_SEP).trim();

    // 모르는 플랫폼은 건너뛴다. 앞으로 지원 플랫폼이 늘어날 때를 위해서다.
    if (!platform || !channelId || !channelName) { skipped++; return; }
    if (channels.some(c => c.channelId === channelId)) return;

    channels.push({ channelId, name: channelName, platform });
  });

  return { name, channels, skipped };
}
