// 문제유형 id 목록 + 영역(성적표 도메인) 매핑의 단일 소스.
// 과거 이 표가 웹/모바일에 각각 리터럴로 복제돼 있다가 10개 중 5개가 어긋난 적이 있다
// (같은 시험인데 채점 기기에 따라 domainScores가 달라져 성적표 신뢰불가 상태가 됐었음).
// 라벨(label)은 화면마다 문구가 원래 다르므로(관리자 AI프롬프트용 vs 학생 표시용) 여기서 다루지 않는다.
export const QUESTION_TYPE_IDS = [
  'matching',
  'multipleChoice',
  'fillBlank',
  'translation',
  'errorCorrect',
  'wordOrder',
  'prepChoice',
  'sentenceFill',
  'dialogueFill',
  'listeningChoice',
  'pronunciationRecord',
  'pronunciationRecordEn',
  'pronunciationRecordKo',
]

// 2026-08-09: 어휘/쓰기/문법/독해/회화 → voca/writing/reading/speaking/listening로 재편.
// '문법'이 '독해'를 대체한 게 아니라 라벨만 'reading'으로 바뀐 것 — sentenceFill(옛 '독해')은
// writing으로 편입됐고, listening은 신규 도메인+신규 유형(listeningChoice)이다. 정식 출시 전
// 결정이라 과거 결과 문서(domainScores가 옛 한글 키)는 마이그레이션하지 않는다.
export const DOMAIN_TYPES = {
  voca: ['matching', 'multipleChoice', 'fillBlank'],
  writing: ['translation', 'sentenceFill'],
  reading: ['errorCorrect', 'wordOrder', 'prepChoice'],
  speaking: ['dialogueFill', 'pronunciationRecord', 'pronunciationRecordEn', 'pronunciationRecordKo'],
  listening: ['listeningChoice'],
}

export const TYPE_DOMAIN = Object.fromEntries(
  Object.entries(DOMAIN_TYPES).flatMap(([domain, ids]) => ids.map(id => [id, domain]))
)
