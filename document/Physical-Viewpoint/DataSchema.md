[설계서](../../README.md) › [Physical-Viewpoint](README.md) › DataSchema

# 데이터 저장소 스키마

> **다루는 내용:** Chrome Storage에 저장되는 데이터 구조
> **갱신 트리거:** 저장 데이터의 형식이나 필드가 변경될 때

---

## 저장소 위치

**Chrome Storage API** - `chrome.storage.local`

- **용도:** 사용자 로컬 기기에서만 데이터 보존 (클라우드 동기화 없음)
- **격리:** 각 사용자의 Chrome 프로필별 독립적 저장소
- **권한:** `"storage"` (manifest.json)
- **수량:** 최대 10MB (multiviewer는 훨씬 작음)

---

## 데이터 스키마

### 1. 시청 목록 (watchList)

```json
{
  "watchList": [
    {
      "channelId": "string (플랫폼별 고유 ID)",
      "nickname": "string (사용자가 보는 닉네임)",
      "platform": "chzzk | soop"
    }
  ]
}
```

**예시:**
```json
{
  "watchList": [
    {
      "channelId": "naver_abc123",
      "nickname": "BJ_일일라이브",
      "platform": "chzzk"
    },
    {
      "channelId": "soop_xyz789",
      "nickname": "방송주진행중",
      "platform": "soop"
    }
  ]
}
```

**특징:**
- ✅ 순서 없음 (배치는 별도 저장)
- ✅ 중복 없음 (같은 채널 여러 번 불가)
- ✅ 각 탭이 독립적으로 수정 가능

---

### 2. 채널별 배치 (layouts)

```json
{
  "layouts": {
    "naver_abc123": {
      "x": 0,
      "y": 0,
      "width": 400,
      "height": 600,
      "zIndex": 1
    },
    "soop_xyz789": {
      "x": 410,
      "y": 0,
      "width": 400,
      "height": 600,
      "zIndex": 2
    }
  }
}
```

**특징:**
- 🗂️ **채널별 독립 저장:** 각 채널이 자신의 위치를 기억
- 📐 **좌표 단위:** 픽셀 (px)
- 🔄 **수정 시점:** Dashboard에서 드래그/리사이징할 때마다
- ⚠️ **주의:** 채널이 watchList에서 제거되면 이 배치도 정리 필요

---

### 3. 즐겨찾기 (favorites)

```json
{
  "favorites": [
    {
      "id": "string (UUID 등)",
      "type": "channel | folder",
      "name": "string (사용자가 정한 이름 또는 채널 닉네임)",
      "channelId": "string | null (channel인 경우만)",
      "platform": "chzzk | soop | null (channel인 경우만)",
      "children": [
        {
          "id": "...",
          "type": "channel",
          "channelId": "...",
          "platform": "..."
        }
      ]
    }
  ]
}
```

**예시:**
```json
{
  "favorites": [
    {
      "id": "folder_001",
      "type": "folder",
      "name": "주로 보는 채널",
      "children": [
        {
          "id": "fav_001",
          "type": "channel",
          "name": "BJ_일일라이브",
          "channelId": "naver_abc123",
          "platform": "chzzk"
        },
        {
          "id": "fav_002",
          "type": "channel",
          "name": "방송주진행중",
          "channelId": "soop_xyz789",
          "platform": "soop"
        }
      ]
    }
  ]
}
```

**특징:**
- 📁 **계층 구조:** 무제한 깊이 가능
- 🔗 **약한 참조:** 채널 정보를 저장하되, watchList와 독립적
- 🗑️ **정리:** 채널이 watchList에서 제거되어도 favorites에는 남음

---

### 4. 저장된 표시 목록 (savedLists)

```json
{
  "savedLists": [
    {
      "id": "string (UUID 등)",
      "name": "string (사용자가 정한 이름)",
      "createdAt": "ISO8601 timestamp",
      "channels": [
        {
          "channelId": "string",
          "nickname": "string (저장 당시 닉네임)",
          "platform": "chzzk | soop"
        }
      ]
    }
  ]
}
```

**예시:**
```json
{
  "savedLists": [
    {
      "id": "list_001",
      "name": "저녁 시청 조합",
      "createdAt": "2024-08-17T20:00:00Z",
      "channels": [
        {
          "channelId": "naver_abc123",
          "nickname": "BJ_일일라이브",
          "platform": "chzzk"
        },
        {
          "channelId": "soop_xyz789",
          "nickname": "방송주진행중",
          "platform": "soop"
        }
      ]
    }
  ]
}
```

**특징:**
- 💾 **스냅샷:** 저장 당시의 닉네임을 함께 기록
- 📋 **순서 유지:** 저장된 채널 순서 유지
- ⚠️ **분리:** watchList와 완전 독립 (watchList 변경 안 함)

---

### 5. 설정 (settings)

```json
{
  "settings": {
    "autoRefresh": {
      "enabled": false,
      "intervalSeconds": 30
    },
    "theme": "light | dark | auto",
    "defaultLayoutMode": "grid | free",
    "language": "ko | en"
  }
}
```

**특징:**
- ⚙️ **사용자 기본 설정:** 모든 탭/세션에서 공유
- 🔄 **실시간 동기화:** 저장소 변경 감지로 다른 탭에 즉시 반영
- 📝 **확장 가능:** 향후 새로운 설정 추가 가능

---

## 저장소 변경 감지

```javascript
// 다른 탭에서 저장소 변경됐을 때 알림
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    if ('watchList' in changes) {
      // watchList 변경됨 → UI 업데이트
    }
    if ('layouts' in changes) {
      // 배치 변경됨 → Dashboard 재배치
    }
    if ('settings' in changes) {
      // 설정 변경됨 → ContentScript에 지시
    }
  }
});
```

---

## 데이터 일관성

| 상황 | 처리 |
|---|---|
| 채널을 watchList에서 제거 | layouts의 해당 채널 배치도 정리 |
| 즐겨찾기 채널이 watchList에서 제거 | favorites는 유지 (나중에 다시 추가 가능) |
| 저장 목록 채널이 watchList에서 제거 | savedLists는 유지 (이전 상태 기록 목적) |
| 설정 변경 | 모든 탭/iframe에 브로드캐스트 |

**원칙:** 각 저장소는 독립적 (한쪽 삭제가 다른 쪽을 자동 삭제하지 않음)
