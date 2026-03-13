# 다음 한국어 번역 작업

**대상 논문:** Paper 02 - SuperInstance Type System (계속)
**이전 작업:** 주요 섹션 번역 완료 (초록, 서론, 수학적 프레임워크, 인스턴스 타입 분류 부분)
**다음 작업자:** 한국어 언어 전문가 에이전트 (새 세션)

---

## 1. 완료된 작업 요약

### 1.1 번역 완료된 섹션
1. **초록 (Abstract)** - 완전 번역
2. **서론 (Introduction)** - 완전 번역 (섹션 1.1-1.5)
3. **수학적 프레임워크 (Mathematical Framework)** - 완전 번역 (섹션 2.1-2.4)
4. **인스턴스 타입 분류 (Instance Type Taxonomy)** - 부분 번역 (5/10 타입)

### 1.2 생성된 파일
- `languages/ko/papers/02/paper_ko.md` - 번역된 논문
- `languages/ko/research_notes/02_research_ko.md` - 연구 노트
- `languages/ko/translation_logs/02_log.md` - 번역 로그
- `research/multi-language-orchestration/summary_translation_ko_02_20260313.md` - 작업 요약

### 1.3 진행 상황 추적기 업데이트
- `progress_tracker.json`에 한국어 Paper 02 항목 추가
- 품질 메트릭스 및 문화적 통찰 포함

---

## 2. 남은 작업

### 2.1 우선순위 1: 인스턴스 타입 분류 완성
**대상:** `languages/ko/papers/02/paper_ko.md` 파일의 섹션 3 계속

**번역해야 할 인스턴스 타입:**
1. **Terminal Instance** (터미널 인스턴스)
2. **Reference Instance** (참조 인스턴스)
3. **Tensor Instance** (텐서 인스턴스)
4. **Observer Instance** (관찰자 인스턴스)
5. **SuperInstance Instance** (SuperInstance 인스턴스)

**번역 패턴:** 기존에 번역된 5개 인스턴스 타입(DataBlock, Process, LearningAgent, API, Storage)과 동일한 패턴 따름

### 2.2 우선순위 2: 나머지 섹션 번역
**대상:** `languages/ko/papers/02/paper_ko.md` 파일에 추가

**번역해야 할 섹션:**
1. **섹션 4:** Implementation Considerations (구현 고려사항)
2. **섹션 5:** Applications (응용 프로그램)
3. **섹션 6:** Future Work (향후 작업)

**참고:** 영어 원본 파일: `languages/en/papers/02/paper_en.md`

### 2.3 우선순위 3: 품질 검토 및 개선
1. **전체 일관성 검토:** 용어 일관성, 스타일 일관성 확인
2. **문화적 적응 검토:** 한국 학문적 맥락 적합성 확인
3. **기술적 정확성 검증:** 수학적 개념과 코드 정확성 확인

---

## 3. 작업 지침

### 3.1 번역 원칙
1. **용어 일관성:** Paper 01 한국어 번역의 용어 체계 준수
2. **개념적 정확성:** 기술적 개념 오류 없이 정확 전달
3. **문화적 적응:** 한국 학문적 맥락에 적합한 표현 선택
4. **학술적 스타일:** 한국 학술 논문의 체계적이고 구조화된 스타일 유지

### 3.2 품질 기준
- **수학적 정확성:** 방정식과 수학적 표기법 완전 보존
- **개념적 충실도:** 원문의 기술적 개념 정확 전달
- **언어적 품질:** 학술 한국어 적합성
- **문화적 적응:** 한국 독자를 위한 적절한 적응

### 3.3 파일 관리
- **번역 파일:** `languages/ko/papers/02/paper_ko.md` 계속 편집
- **연구 노트:** `languages/ko/research_notes/02_research_ko.md` 필요시 업데이트
- **번역 로그:** `languages/ko/translation_logs/02_log.md` 새로운 결정 사항 기록

---

## 4. 시작하기 전 확인 사항

### 4.1 필수 읽기
1. **이전 작업 요약:** `research/multi-language-orchestration/summary_translation_ko_02_20260313.md`
2. **번역 로그:** `languages/ko/translation_logs/02_log.md` (번역 결정 사항)
3. **연구 노트:** `languages/ko/research_notes/02_research_ko.md` (학문적 통찰)
4. **영어 원본:** `languages/en/papers/02/paper_en.md` (번역할 내용)

### 4.2 진행 상황 확인
1. **진행 상황 추적기:** `research/multi-language-orchestration/progress_tracker.json`에서 한국어 Paper 02 상태 확인
2. **번역된 파일:** `languages/ko/papers/02/paper_ko.md` 현재 상태 확인

### 4.3 토큰 관리
- DeepSeek 모델의 128K 토큰 제한 고려
- 대용량 파일 읽기 시 `limit` 파라미터 사용
- 토큰 사용량 모니터링 (80K 토큰 이상 시 핸드오프 준비)

---

## 5. 완료 후 작업

### 5.1 파일 업데이트
1. **번역 파일 완성:** `languages/ko/papers/02/paper_ko.md` 전체 섹션 번역 완료
2. **연구 노트 업데이트:** 새로운 학문적 통찰 추가
3. **번역 로그 업데이트:** 추가된 번역 결정 사항 기록

### 5.2 진행 상황 추적기 업데이트
1. **상태 변경:** `status`를 "completed"로 업데이트
2. **메트릭스 업데이트:** 최종 번역 메트릭스 계산
3. **문화적 통찰 추가:** 새로운 통찰 발견 시 추가

### 5.3 핸드오프 준비
1. **작업 요약 생성:** 새로운 `summary_translation_ko_02_complete_[timestamp].md` 파일 생성
2. **TODO_NEXT 파일 삭제:** 이 파일 삭제 또는 보관
3. **다음 논문 준비:** Paper 03 번역 준비 (진행 상황 추적기 확인)

---

## 6. 문제 해결

### 6.1 일반적인 문제
- **용어 불일치:** Paper 01 번역 참조, 용어 표 생성
- **개념적 어려움:** 연구 노트에 질문 기록, 추가 연구 수행
- **문화적 적응 어려움:** 한국 학문적 맥락 연구, 예제 적응

### 6.2 기술적 문제
- **수학적 표기법:** LaTeX 수식 원본 보존, 설명 추가
- **코드 블록:** 원본 코드 보존, 주석 번역
- **표 및 다이어그램:** 내용 번역, 구조 보존

### 6.3 프로세스 문제
- **토큰 제한:** 섹션별로 작업, 핸드오프 준비
- **파일 충돌:** git 상태 확인, 변경사항 관리
- **품질 보증:** 자체 검토, 동료 검토 요청

---

## 7. 연락처 및 참조

### 7.1 참조 문서
- **언어 전문가 온보딩:** `research/multi-language-orchestration/LANGUAGE_SPECIALIST_ONBOARDING.md`
- **다국어 오케스트레이션 마스터 플랜:** `research/multi-language-orchestration/MULTI_LANGUAGE_ORCHESTRATION_MASTER_PLAN.md`
- **번역 품질 표준:** `research/multi-language-orchestration/TRANSLATION_QUALITY_STANDARDS.md`

### 7.2 관련 파일
- **Paper 01 한국어 번역:** `languages/ko/papers/01/paper_ko.md` (용어 참조)
- **다른 언어 Paper 02 번역:** `languages/[fr,zh]/papers/02/` (비교 참조)

---

**시작하기:** 영어 원본 파일(`languages/en/papers/02/paper_en.md`)을 읽고 현재 번역 파일(`languages/ko/papers/02/paper_ko.md`)의 끝에서 작업을 계속하세요.

**행운을 빕니다!** 🇰🇷📚