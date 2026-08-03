// 학원의 하루 AI 한도가 소진된 경우인지 — 네트워크/API 장애와 반드시 구분해야 한다.
// 두 경우 모두 결과는 "미채점"으로 같지만, 한도 소진은 기다려도 자정까지 안 풀리고 원장이
// 플랫폼 관리화면에서 초기화해야 하므로 학생에게 알려줄 문구가 다르다. 서버가
// details.reason으로 표시해준다.
export function isAiQuotaError(err) {
  return err?.code === 'functions/resource-exhausted' && err?.details?.reason === 'academyQuota'
}

// 채점 결과가 boolean(기존 유형)이든 발음 상세 객체({pass,...})든 통과 여부만 뽑아냄.
// error:true(네트워크/Whisper API 장애로 채점 자체를 못한 경우)는 "오답"이 아니라 미채점(null)으로
// 취급 — 안 그러면 학생 발음과 무관한 시스템 장애가 오답으로 기록돼 성적표 회화 평균을 갉아먹는다.
export function resultBool(g) {
  if (g === null || g === undefined) return null
  if (typeof g === 'object') return g.error ? null : g.pass
  return g
}

// 도메인 점수 분모에서 제외할 "시스템 채점실패(서버가 명시적으로 error:true를 보낸 경우)" 판정.
// ⚠️ null은 여기 포함시키지 않는다 — null은 "미응답"과 "호출 자체가 예외로 실패"를 구분할
// 수 없는 값이라(둘 다 같은 null), 여기서 null을 실패로 넣으면 모든 영역에서 "안 푼 문제"까지
// 분모 제외 대상이 돼버린다(원치 않는 큰 동작 변경). 호출 예외로 인한 실패는 호출부가 별도로
// (녹음/답변이 실제로 존재했는지를 같이 보고) 추적해야 한다.
export function isPronGradingFailure(g) {
  return typeof g === 'object' && g !== null && g.error === true
}

// 발음 녹음을 채점 서버로 보내고 결과를 해석하는 오케스트레이션. Firebase/브라우저/RN에
// 의존하지 않는다 — audioBase64로 인코딩하는 것(웹: Blob+FileReader, 모바일:
// expo-file-system)과 실제 callable 바인딩(httpsCallable(functions,'gradePronunciation'))은
// 호출하는 쪽이 준비해서 callFn으로 주입한다.
export async function gradePronunciation({ callFn, audioBase64, mimeType, targetText, onQuotaExceeded }) {
  if (!audioBase64) return null
  try {
    const res = await callFn({ audioBase64, mimeType, targetText })
    return res.data || null
  } catch (err) {
    if (isAiQuotaError(err)) onQuotaExceeded?.()
    return null
  }
}
