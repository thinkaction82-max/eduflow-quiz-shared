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
  'pronunciationRecord',
  'pronunciationRecordEn',
  'pronunciationRecordKo',
]

export const DOMAIN_TYPES = {
  '어휘': ['matching', 'multipleChoice', 'fillBlank'],
  '쓰기': ['translation'],
  '문법': ['errorCorrect', 'wordOrder', 'prepChoice'],
  '독해': ['sentenceFill'],
  '회화': ['dialogueFill', 'pronunciationRecord', 'pronunciationRecordEn', 'pronunciationRecordKo'],
}

export const TYPE_DOMAIN = Object.fromEntries(
  Object.entries(DOMAIN_TYPES).flatMap(([domain, ids]) => ids.map(id => [id, domain]))
)
