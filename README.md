# 쓰레기통 모형 실험실

Cohen, March & Olsen (1972), “A Garbage Can Model of Organizational Choice”의 시뮬레이션을 도형 애니메이션으로 보여주는 정적 웹 앱입니다. 참여자는 원, 선택기회는 네모, 문제는 세모입니다. 재생·일시정지·기간 이동과 속도 변경이 가능합니다.

## 실행

`npm run serve`를 실행하고 `http://localhost:4173`을 엽니다. 빌드 단계나 서버 API가 없습니다. `dist/` 폴더를 GitHub Pages, Netlify, Cloudflare Pages 등에 그대로 올릴 수 있습니다. GitHub에서는 저장소에 코드를 올린 뒤 **Settings → Pages → Build and deployment → GitHub Actions**를 선택하면 포함된 워크플로가 `main` 브랜치를 배포합니다. `npm test`로 논문 설정값과 핵심 동작을 확인합니다.

## 조정 가능한 조건

- 논문의 규모: 20기간, 선택기회 10개, 문제 20개, 참여자 10명
- 문제당 요구량 1.1·2.2·3.3, 접근구조 A, 결정구조 D, 참여자 에너지 분포 E
- 잠재 에너지 총량, 해결책 계수 0.6 또는 각주 3의 기간별 계수, 사용자 지정 계수
- 두 가지 선택·문제 진입순서, 개별 진입시점, 요구량, 참여자 에너지, A·D 이진 행렬
- 부록의 NA 이동조건과 IO 출력조건, 논문 표 5의 12가지 가설적 대학 조건

“이 설정 링크 복사” 버튼은 설정을 URL에 담아 공유합니다. 링크를 연 사람은 같은 조건으로 0기부터 시작합니다.

## 화면 문구와 이미지 수정

사이트 소유자는 `dist/content.js`에서 제목·짧은 설명·하단 문구·이미지 경로를 수정할 수 있습니다. 이미지는 `dist/assets/`에 넣고 `image: './assets/파일명.png'`로 지정합니다. 저장한 뒤 다시 배포하면 모든 방문자에게 반영됩니다. 방문자 화면에는 편집 기능이 없습니다. 정적 사이트이므로 브라우저 안에서 소유자만 즉시 수정하는 기능은 별도의 로그인·권한 관리 서버 없이는 제공하지 않습니다.

상단의 Percussive Lab 로고 파일은 `dist/assets/percussive-lab-logo.png`입니다. 로고를 교체하려면 이 파일을 바꾼 뒤 다시 배포합니다.

## 해석상 주의

이 프로그램은 논문에 명시된 고정값, 구조와 행동 가정을 읽을 수 있는 코드로 재구현한 **교육 도구**입니다. 부록의 FORTRAN Version Five를 논문 그대로 이식한 것이 아닙니다. 특히 동률 처리, 기간 내 갱신 순서, 원본의 세부 기록 규칙에는 해석의 여지가 있습니다. 따라서 논문 표의 수치를 재현하거나 논문의 추정 결과를 검증하는 도구로 사용하면 안 됩니다. 논문 설정을 바꾸면 그 값들은 학습용 반사실 실험입니다.

출처: Michael D. Cohen, James G. March, Johan P. Olsen (1972), “A Garbage Can Model of Organizational Choice,” *Administrative Science Quarterly* 17(1): 1–25, https://www.jstor.org/stable/2392088.
