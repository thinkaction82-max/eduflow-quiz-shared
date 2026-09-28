// Fisher-Yates. (모바일에 있던 `.sort(() => Math.random() - 0.5)` 버전은 편향된 셔플이라 폐기하고
// 이 버전으로 통일한다.)
export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 문제유형별 자동채점 가능 여부 판단. translation/sentenceFill/pronunciationRecord는 여기서
// 다루지 않는다(각각 AI 서술형채점·발음채점 경로로 별도 처리, 이 파일은 그 경로를 모른다).
export function checkAnswer(type, data, answer) {
  switch (type) {
    case 'matching': {
      if (!answer?.length || !data.answers?.length) return null
      const correct = data.answers.map(a => Array.isArray(a) ? { l: a[0], r: a[1] } : a)
      return answer.length === correct.length &&
        correct.every(ca => answer.some(ua => ua.l === ca.l && ua.r === ca.r))
    }
    case 'multipleChoice':
    case 'prepChoice':
    case 'dialogueFill':
    case 'listeningChoice':
    case 'sentenceMeaning':
    case 'passageTF':
      return answer !== undefined && answer !== null ? answer === data.answerIndex : null
    case 'fillBlank':
      return answer ? answer === data.missingLetter : null
    case 'wordOrder': {
      if (!answer?.length) return null
      const u = answer.join(' ').toLowerCase().replace(/\.$/, '').trim()
      const c = (data.answer || '').toLowerCase().replace(/\.$/, '').trim()
      return u === c
    }
    case 'errorCorrect':
      return answer ? answer === data.wrongWord : null
    default:
      return null
  }
}

// 빈칸(___)이 있는 문제는 화면엔 안 보여도 정답을 채운 완성된 문장을 읽어준다
export function fillBlankText(text, answer) {
  return text && answer && text.includes('___') ? text.replace('___', answer) : text
}

// 객관식(multipleChoice)은 "'apple'의 뜻은?"처럼 질문에 영어 단어가 따옴표로 들어있고
// 선택지(사과/바나나/...)는 한글이라, 질문에서 따옴표 안의 영단어만 뽑아 읽어준다
export function extractQuotedWord(text) {
  const m = text?.match(/'([^']+)'/)
  return m ? m[1] : null
}

// 퀴즈 진행용(shuffle:true, fillBlank.options/wordOrder.words를 섞음)과 성적관리 리뷰용
// (shuffle:false, 원래 순서 그대로 — 저장된 wrongIndices가 이 순서를 전제로 하므로 절대
// 재배열하면 안 됨)을 하나로 합친 함수. 타입별 분기 모양이 저마다 달라(matching은 단일객체 가드,
// 나머지는 forEach) 제네릭 루프로 통일하지 않고 각 줄을 그대로 나열한다 — 순서를 바꾸는 사람이
// 코드를 한눈에 보고 실수를 알아챌 수 있게 하기 위함.
export function buildQuestionList(qs, { shuffle: shouldShuffle = false } = {}) {
  const list = []
  if (qs.matching?.leftItems?.length) list.push({ type: 'matching', data: qs.matching })
  qs.multipleChoice?.forEach(q => list.push({ type: 'multipleChoice', data: q }))
  qs.fillBlank?.forEach(q => list.push({
    type: 'fillBlank',
    data: shouldShuffle ? { ...q, options: shuffle(q.options ?? []) } : q,
  }))
  qs.sentenceFill?.forEach(q => list.push({ type: 'sentenceFill', data: q }))
  qs.wordOrder?.forEach(q => list.push({
    type: 'wordOrder',
    data: shouldShuffle ? { ...q, words: shuffle(q.words ?? []) } : q,
  }))
  qs.translation?.forEach(q => list.push({ type: 'translation', data: q }))
  qs.errorCorrect?.forEach(q => list.push({ type: 'errorCorrect', data: q }))
  qs.prepChoice?.forEach(q => list.push({ type: 'prepChoice', data: q }))
  qs.dialogueFill?.forEach(q => list.push({ type: 'dialogueFill', data: q }))
  qs.listeningChoice?.forEach(q => list.push({ type: 'listeningChoice', data: q }))
  qs.pronunciationRecord?.forEach(q => list.push({ type: 'pronunciationRecord', data: q }))
  qs.pronunciationRecordEn?.forEach(q => list.push({ type: 'pronunciationRecordEn', data: q }))
  qs.pronunciationRecordKo?.forEach(q => list.push({ type: 'pronunciationRecordKo', data: q }))
  // 신규 유형은 반드시 맨 끝에 — 기존 시험에 나중에 병합돼도 이미 저장된 wrongIndices가 안 밀린다
  qs.sentenceMeaning?.forEach(q => list.push({ type: 'sentenceMeaning', data: q }))
  qs.passageTF?.forEach(q => list.push({ type: 'passageTF', data: q }))
  return list
}
