# 우리 반 그림 퀴즈 (실시간 멀티플레이)

17명 학생 + 교사 1명이 접속하는 그림 맞히기 게임. Node.js / Express / Socket.IO 사용.

## 1. 내 컴퓨터에서 시험

1. Node.js 20 이상 설치
2. 이 폴더에서 터미널 열기
3. `npm install`
4. 환경변수를 설정하고 `npm start` 실행
   - macOS/Linux: `ROOM_CODE=617CLASS ROOM_PASSWORD=student123 TEACHER_PASSWORD=teacher123 npm start`
   - Windows PowerShell: `$env:ROOM_CODE='617CLASS'; $env:ROOM_PASSWORD='student123'; $env:TEACHER_PASSWORD='teacher123'; npm start`
5. `http://localhost:3000` 접속

실제 사용 전 예시 비밀번호를 반드시 다른 값으로 바꾸세요.

## 2. 인터넷 배포 (Render + GitHub)

1. GitHub에서 **새 비공개 저장소(Private repository)** 생성.
2. 압축을 풀고 이 폴더의 파일들을 저장소에 업로드. `node_modules`는 업로드하지 않음.
3. https://dashboard.render.com/ 에서 **New → Web Service** 선택 후 GitHub 저장소 연결. (또는 Blueprint에서 `render.yaml` 사용)
4. Runtime `Node`, Build Command `npm install`, Start Command `npm start` 설정. Render 무료 플랜이 제공되는 경우 Free 선택.
5. Environment에 다음 3개 변수 설정: `ROOM_CODE` (예: `617CLASS`), `ROOM_PASSWORD` (학생용, 강력한 비밀번호), `TEACHER_PASSWORD` (교사용, 다른 강력한 비밀번호).
6. Deploy 후 `https://...onrender.com` 링크를 학생에게 공유.
7. 교사는 **선생님으로 입장** 체크 + 교사용 비밀번호, 학생은 체크하지 않고 학생용 비밀번호로 접속.

> Render의 요금제, 무료 인스턴스의 슬립/시작 지연 및 동시 연결 지원 정책은 배포 시 확인하세요. 무료 서버는 쉬었다가 재시작될 수 있습니다. 서버 재시작 시 진행 중 게임/점수는 초기화됩니다.

## 3. 수업 운영

- 교사가 먼저 입장하고 학생 17명이 들어오면 **게임 시작**.
- 2라운드, 학생당 최대 2번 그림 차례, 한 문제 80초.
- 그림 그릴 학생은 3개 단어 중 하나를 선택하고 마우스/터치로 그림을 그림.
- 정답 입력 시 자동 점수 지급. 모든 사람이 맞히면 다음 문제로 이동.
- 교사는 **현재 문제 넘기기**, **대기실로 초기화**, **단어 직접 등록** 가능.
- 단어 등록은 대기실에서만 가능하며 쉼표/줄바꿈 구분, 3~500개.

## 4. 주의 사항

- 입장 비밀번호는 최소한의 접근 통제일 뿐 완전한 보안/신원확인이 아닙니다. 학생 실명 대신 별칭 사용을 권장합니다.
- 서버 메모리에만 게임 정보 저장. 영구 저장/계정/로그인/채팅 기록 보존 기능 없음.
- 교사 브라우저가 종료되면 교사 재입장이 가능하지만, 진행 중 게임은 계속될 수 있습니다.
- 학생이 연결 해제되면 현재 게임 중 재입장이 제한됩니다. 수업 전에 연결 상태를 확인하고, 문제가 있으면 교사가 초기화하세요.
- 운영용으로 사용하기 전에 실제 교실 네트워크에서 17명 동시 접속을 테스트하세요.
- 학교 개인정보·보안 지침에 따라 외부 웹서비스 사용 여부를 확인하세요.
