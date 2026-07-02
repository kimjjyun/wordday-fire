# WordDay Firebase Spark

Firebase 무료 Spark 요금제에서 실행되는 WordDay입니다.

## 사용 서비스

- Firebase Hosting: React/Vite 웹 앱
- Firebase Authentication: 사용자에게 보이지 않는 익명 보안 세션
- Cloud Firestore: 학급, 학생, 단어장, 학습 기록, 시험
- Firestore Security Rules: 사용자 권한과 학생 비밀번호 해시 검증

새로 만드는 기본 단어장은 앱에 포함된 추천 단어를 사용하며, 교사가 직접 추가한 단어와 학습 기록만 Firestore에 저장합니다.
기존 단어장은 저장 형식을 바꾸지 않고 그대로 호환됩니다.

Cloud Functions, Blaze 요금제, Render, PostgreSQL은 사용하지 않습니다.

## Firebase Console 설정

1. Authentication의 로그인 방법에서 `익명`만 활성화합니다.
2. 이메일/비밀번호와 Google 로그인은 활성화하지 않습니다.
3. Firestore Database를 Standard 에디션, 프로덕션 모드로 생성합니다.

## 연결 및 배포

```powershell
cd "C:\Users\user\wordday(fire)"
npx firebase login
Copy-Item .firebaserc.example .firebaserc
```

`.firebaserc`의 `YOUR_FIREBASE_PROJECT_ID`를 `wordday-fire`로 바꾼 뒤 배포합니다.

```powershell
npm run deploy
```

Java는 Firestore 로컬 에뮬레이터를 사용할 때만 필요하며 실제 배포에는 필요하지 않습니다.

## App Check

Firebase Console에서 웹 앱용 reCAPTCHA Enterprise App Check를 등록한 뒤 `frontend/.env.example`을 참고해
`VITE_RECAPTCHA_ENTERPRISE_SITE_KEY`를 배포 환경에 설정합니다. 실제 트래픽을 확인한 후 Firestore와 Authentication 적용을 강제합니다.
