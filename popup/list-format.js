// ── 공유 글 형식 ──
// 저장된 목록을 남과 주고받기 위한 글 형식만 다룬다. 저장소·화면에는 접근하지 않는다.
//
//   치지직|채널고유ID|닉네임
//   SOOP|채널고유ID|닉네임
//
// ⚠️ 이 형식은 배포되는 순간 바꾸기 어려운 약속이 된다. 남이 보낸 글을 우리가
//    읽어야 하므로, 형식을 바꾸면 예전에 오간 글을 읽지 못한다.
//
// 표식과 목록 이름을 담던 첫 줄은 없앴다. 우리 글인지는 채널 줄이 한 개라도
// 읽히는지로 판단하며, 목록 이름은 글에 담기지 않는다.

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
function buildShareText(channels) {
  return (channels || []).map((ch) => {
    const label = SHARE_PLATFORM_LABEL[ch.platform] || SHARE_PLATFORM_LABEL.chzzk;
    return [label, ch.channelId, ch.name].join(SHARE_FIELD_SEP);
  }).join('\n');
}

// ── 글 → 목록 한 벌 ──
// { channels, skipped }를 준다. 읽을 수 있는 것만 담고, 건너뛴 줄 수를 알려 준다.
// 한 채널도 못 읽었으면 우리 글이 아니라고 보며, 그 판단은 부르는 쪽이 한다.
function parseShareText(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line !== '');

  const channels = [];
  let skipped = 0;

  lines.forEach((line) => {
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

  return { channels, skipped };
}
