[설계서](../../README.md) › [Physical-Viewpoint](README.md) › Deployment

# 배포 환경 및 위치

> **다루는 내용:** 확장이 설치되는 위치, 배포 방식, 배포 파일 보관
> **갱신 트리거:** 배포 채널이 변경되거나 배포 위치 규정이 바뀔 때

---

## 배포 환경

### 현재: 로컬 개발자 모드

**사용자가 직접 설치하는 방식**

```
1. GitHub에서 소스 다운로드 (ZIP)
   ↓
2. Chrome 주소창 → chrome://extensions
   ↓
3. "개발자 모드" 활성화
   ↓
4. "압축해제된 확장 프로그램 로드" → source/ 폴더 선택
   ↓
5. 설치 완료
```

**설치 위치:**
```
Windows:
  %LOCALAPPDATA%\Google\Chrome\User Data\Default\Extensions\{extensionId}\

macOS:
  ~/Library/Application Support/Google/Chrome/Default/Extensions/{extensionId}/

Linux:
  ~/.config/google-chrome/Default/Extensions/{extensionId}/
```

**특징:**
- 🔧 **개발자 전용:** 일반 사용자는 어려움
- ⚠️ **보안 경고:** Chrome이 "개발자 모드"로 운영 중임을 계속 표시
- 🔄 **자동 업데이트 없음:** 수동 재설치 필요
- 📝 **manifest.json 변경시:** 재로드 필요

---

## 향후 배포 경로

### 1단계: Chrome 웹스토어 (공식 배포)

**Google Play Console 등록**

```
chrome://extensions/
  ↓
Chrome 웹스토어 검색 → "MultiStream"
  ↓
[추가] 버튼
  ↓
자동 설치 및 업데이트
```

**설치 위치:** 동일 (자동 관리)

**필요사항:**
- Google 계정
- 개발자 등록 수수료 ($5)
- Privacy Policy 준비
- 권한 정당화 (Chzzk/SOOP 쿠키 접근 이유 등)

**장점:**
- ✅ 자동 업데이트
- ✅ 공식 배포 증명
- ✅ 사용자 평가 시스템

---

### 2단계: GitHub Release (직접 배포)

**사용자가 ZIP 다운로드 후 수동 설치**

```
GitHub Releases
  ↓
multiviewer-v3.2.0.zip 다운로드
  ↓
Chrome 개발자 모드에서 로드
```

**파일 위치:** (현재 상태)

```
GitHub Repository
└── Releases/
    └── multiviewer-v3.1.1.zip
        ├── source/
        │   ├── manifest.json
        │   ├── popup.html / popup.js
        │   ├── dashboard.html / dashboard.js
        │   ├── background.js
        │   └── resources/
```

---

## 배포 파일 관리

### 로컬 Release 폴더

**프로젝트 루트의 `release/` 폴더 (source와 동등 레벨)**

```
multiviewer/                   ← 프로젝트 루트
├── source/                    ← 소스 코드
│   ├── manifest.json
│   ├── popup.html
│   ├── dashboard.html
│   └── document/
├── release/                   ← 배포 파일 보관 ★ 루트 레벨
│   ├── v3.1.1/
│   │   ├── multiviewer-v3.1.1.zip
│   │   ├── CHANGELOG.md
│   │   └── SHA256.txt         ← 무결성 검증용
│   ├── v3.2.0/
│   │   └── multiviewer-v3.2.0.zip
│   └── latest/                ← 최신 버전 심볼릭 링크
│       └── multiviewer-latest.zip → ../v3.2.0/multiviewer-v3.2.0.zip
```

**ZIP 파일 구조:**

```
multiviewer-v3.1.1.zip
└── source/                    ← Chrome이 로드하는 폴더
    ├── manifest.json
    ├── popup.html
    ├── popup.js
    ├── dashboard.html
    ├── dashboard.js
    ├── background.js
    ├── resources/
    │   ├── main_icon_16.png
    │   ├── main_icon_48.png
    │   └── main_icon_128.png
    └── lib/                   ← 공유 라이브러리
        ├── chzzk.js
        └── soop.js
```

**생성 명령어:**
```bash
cd multiviewer
mkdir -p release/v3.1.1
zip -r release/v3.1.1/multiviewer-v3.1.1.zip source/
```

**파일 크기:** 약 500KB ~ 2MB (압축 후)

---

## 버전 관리

### 버전 번호 규칙

`MAJOR.MINOR.PATCH`

| 변경 사항 | 버전 |
|---|---|
| 새 플랫폼 지원 (Twitch 추가) | Major (3.0.0 → 4.0.0) |
| 새 기능 (설정 옵션 추가) | Minor (3.1.0 → 3.2.0) |
| 버그 수정 | Patch (3.1.0 → 3.1.1) |

### 배포 절차

1. **코드 완성**
   - develop 브랜치에서 기능 개발
   - feature 브랜치 → develop 병합

2. **버전 업데이트**
   ```json
   // manifest.json
   {
     "version": "3.2.0"
   }
   ```

3. **Changelog 작성**
   ```markdown
   ## v3.2.0 (2024-08-17)
   
   ### Added
   - 자동 새로고침 간격 설정 기능
   
   ### Fixed
   - 팝업 너비 조정 시 UI 깨짐 현상
   ```

4. **배포 파일 생성**
   ```bash
   zip -r release/v3.2.0/multiviewer-v3.2.0.zip source/
   ```

5. **GitHub Release 생성**
   - Tag: `v3.2.0`
   - Release notes: Changelog 내용

6. **Chrome 웹스토어에 제출** (향후)
   - ZIP 파일 업로드
   - 심사 대기

---

## 저장소 위치 정리

| 항목 | 위치 | 설명 |
|---|---|---|
| 소스 코드 | `multiviewer/source/` | Chrome이 로드하는 폴더 |
| 배포 파일 | `multiviewer/release/` | 버전별 ZIP 보관 (프로젝트 루트 레벨) |
| 설계 문서 | `multiviewer/source/document/` | 이 문서들 |
| GitHub | `https://github.com/QYnote/multiviewer` | 공개 저장소 |

---

## 권한 설명

### 현재 권한 (manifest.json)

```json
{
  "permissions": [
    "storage",              // 사용자 설정/상태 저장
    "tabs",                // 탭 정보 접근
    "declarativeNetRequest", // 네트워크 규칙 설정
    "cookies",             // 로그인 쿠키 읽기
    "scripting"            // ContentScript 주입
  ],
  "host_permissions": [
    "https://api.chzzk.naver.com/*",  // Chzzk API
    "https://chzzk.naver.com/*",      // Chzzk 방송 페이지
    "https://*.naver.com/*",          // Naver 통합 (로그인)
    "https://*.sooplive.com/*",       // SOOP API
    "https://myapi.sooplive.com/*"    // SOOP 추가 API
  ]
}
```

**권한별 사유:**
- 🍪 **cookies:** 로그인 상태 유지 (사용자 재로그인 불필요)
- 📡 **declarativeNetRequest:** Chzzk/SOOP API 요청에 쿠키 자동 포함
- 📝 **storage:** 사용자 설정(favorites, savedLists, layouts) 보관
- 🔌 **scripting + tabs:** 각 방송 페이지에 ContentScript 주입

