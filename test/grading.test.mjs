import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  QUESTION_TYPE_IDS, DOMAIN_TYPES, TYPE_DOMAIN,
  shuffle, checkAnswer, fillBlankText, extractQuotedWord, buildQuestionList,
  isAiQuotaError, resultBool, isPronGradingFailure, gradePronunciation,
  PRON_DISPLAY_MODE, HOMEWORK_PRON_PASS_THRESHOLD, HOMEWORK_PRON_MAX_ATTEMPTS,
  reinterpretPronunciationPass,
} from '../index.js'

// 크리티컬규칙7: buildQuestionList(..., {shuffle:false})의 순서가 실수로 바뀌면
// 과거에 저장된 wrongIndices가 조용히 엉뚱한 문제를 가리키게 된다. 새 유형을 추가할 때도
// 이 테스트가 먼저 실패해야 한다.
const FIXTURE = {
  matching: { leftItems: ['a'], answers: [['a', '1']] },
  multipleChoice: [{ answerIndex: 0 }],
  fillBlank: [{ options: ['a', 'b'], missingLetter: 'a' }],
  sentenceFill: [{ answer: 'x' }],
  wordOrder: [{ words: ['a', 'b'], answer: 'a b' }],
  translation: [{ answer: 'x' }],
  errorCorrect: [{ wrongWord: 'x' }],
  prepChoice: [{ answerIndex: 0 }],
  dialogueFill: [{ answerIndex: 0 }],
  listeningChoice: [{ text: 'I am Daesung', korean: '나는 대성이다', options: ['a', 'b', 'c', 'd'], answerIndex: 0 }],
  pronunciationRecord: [{ text: 'hello' }],
  pronunciationRecordEn: [{ text: 'hello' }],
  pronunciationRecordKo: [{ text: 'hello', korean: '안녕' }],
}
const EXPECTED_ORDER = [
  'matching', 'multipleChoice', 'fillBlank', 'sentenceFill', 'wordOrder',
  'translation', 'errorCorrect', 'prepChoice', 'dialogueFill', 'listeningChoice',
  'pronunciationRecord', 'pronunciationRecordEn', 'pronunciationRecordKo',
]

test('buildQuestionList order matches QUESTION_TYPE_IDS coverage and is stable', () => {
  const list = buildQuestionList(FIXTURE, { shuffle: false })
  assert.deepEqual(list.map(q => q.type), EXPECTED_ORDER)
  assert.deepEqual([...EXPECTED_ORDER].sort(), [...QUESTION_TYPE_IDS].sort())
})

test('buildQuestionList shuffle:false preserves fillBlank/wordOrder original order', () => {
  const list = buildQuestionList(FIXTURE, { shuffle: false })
  const fb = list.find(q => q.type === 'fillBlank')
  const wo = list.find(q => q.type === 'wordOrder')
  assert.deepEqual(fb.data.options, ['a', 'b'])
  assert.deepEqual(wo.data.words, ['a', 'b'])
})

test('buildQuestionList shuffle:true only shuffles fillBlank.options/wordOrder.words', () => {
  const list = buildQuestionList(FIXTURE, { shuffle: true })
  const fb = list.find(q => q.type === 'fillBlank')
  assert.deepEqual([...fb.data.options].sort(), ['a', 'b'])
})

test('shuffle preserves elements (Fisher-Yates, not a filter)', () => {
  const input = [1, 2, 3, 4, 5]
  const out = shuffle(input)
  assert.deepEqual([...out].sort(), input)
  assert.notEqual(out, input) // 새 배열이어야 함(원본 불변)
})

test('DOMAIN_TYPES / TYPE_DOMAIN stay inverses of each other', () => {
  for (const [domain, ids] of Object.entries(DOMAIN_TYPES)) {
    for (const id of ids) assert.equal(TYPE_DOMAIN[id], domain)
  }
})

test('checkAnswer: wordOrder ignores trailing period and case', () => {
  assert.equal(checkAnswer('wordOrder', { answer: 'I like cats.' }, ['I', 'like', 'CATS']), true)
})

test('checkAnswer: matching requires exact set match', () => {
  const data = { answers: [['a', '1'], ['b', '2']] }
  assert.equal(checkAnswer('matching', data, [{ l: 'a', r: '1' }, { l: 'b', r: '2' }]), true)
  assert.equal(checkAnswer('matching', data, [{ l: 'a', r: '1' }]), false)
})

test('fillBlankText / extractQuotedWord', () => {
  assert.equal(fillBlankText('I ___ apples', 'like'), 'I like apples')
  assert.equal(extractQuotedWord("'apple'의 뜻은?"), 'apple')
  assert.equal(extractQuotedWord('뜻은?'), null)
})

test('resultBool: boolean passthrough, object unwrap, error->null', () => {
  assert.equal(resultBool(true), true)
  assert.equal(resultBool(false), false)
  assert.equal(resultBool(null), null)
  assert.equal(resultBool({ pass: true }), true)
  assert.equal(resultBool({ pass: false, error: true }), null)
})

test('isPronGradingFailure: only server-tagged error:true counts, not bare null', () => {
  // null은 "미응답"과 "호출 예외로 실패"를 구분 못하므로 여기 포함하지 않는다 — 포함시키면
  // 모든 영역에서 안 푼 문제까지 도메인 분모에서 빠지는 의도치 않은 동작 변경이 생긴다.
  assert.equal(isPronGradingFailure(null), false)
  assert.equal(isPronGradingFailure({ pass: false, error: true }), true)
  assert.equal(isPronGradingFailure({ pass: false }), false)
  assert.equal(isPronGradingFailure(true), false)
})

test('isAiQuotaError matches only the specific server-tagged quota error', () => {
  assert.equal(isAiQuotaError({ code: 'functions/resource-exhausted', details: { reason: 'academyQuota' } }), true)
  assert.equal(isAiQuotaError({ code: 'functions/resource-exhausted', details: { reason: 'other' } }), false)
  assert.equal(isAiQuotaError({ code: 'functions/unavailable' }), false)
})

test('gradePronunciation returns null without calling callFn when audioBase64 missing', async () => {
  let called = false
  const result = await gradePronunciation({ callFn: async () => { called = true }, audioBase64: null, mimeType: 'x', targetText: 'x' })
  assert.equal(result, null)
  assert.equal(called, false)
})

test('gradePronunciation returns res.data on success', async () => {
  const callFn = async (payload) => {
    assert.deepEqual(payload, { audioBase64: 'AAA', mimeType: 'audio/webm', targetText: 'hi' })
    return { data: { pass: true, score: 90 } }
  }
  const result = await gradePronunciation({ callFn, audioBase64: 'AAA', mimeType: 'audio/webm', targetText: 'hi' })
  assert.deepEqual(result, { pass: true, score: 90 })
})

test('gradePronunciation returns null and fires onQuotaExceeded on quota error', async () => {
  let firedQuota = false
  const callFn = async () => {
    const err = new Error('quota')
    err.code = 'functions/resource-exhausted'
    err.details = { reason: 'academyQuota' }
    throw err
  }
  const result = await gradePronunciation({
    callFn, audioBase64: 'AAA', mimeType: 'audio/webm', targetText: 'hi',
    onQuotaExceeded: () => { firedQuota = true },
  })
  assert.equal(result, null)
  assert.equal(firedQuota, true)
})

test('gradePronunciation returns null without firing onQuotaExceeded on generic network error', async () => {
  let firedQuota = false
  const callFn = async () => { throw new Error('offline') }
  const result = await gradePronunciation({
    callFn, audioBase64: 'AAA', mimeType: 'audio/webm', targetText: 'hi',
    onQuotaExceeded: () => { firedQuota = true },
  })
  assert.equal(result, null)
  assert.equal(firedQuota, false)
})

test('PRON_DISPLAY_MODE covers all three pronunciation type ids', () => {
  assert.equal(PRON_DISPLAY_MODE.pronunciationRecord, 'en-ko')
  assert.equal(PRON_DISPLAY_MODE.pronunciationRecordEn, 'en')
  assert.equal(PRON_DISPLAY_MODE.pronunciationRecordKo, 'ko')
})

test('reinterpretPronunciationPass: recalculates pass at the given threshold', () => {
  assert.deepEqual(
    reinterpretPronunciationPass({ pass: false, score: 65 }, HOMEWORK_PRON_PASS_THRESHOLD),
    { pass: true, score: 65 },
  )
  assert.deepEqual(
    reinterpretPronunciationPass({ pass: true, score: 50 }, HOMEWORK_PRON_PASS_THRESHOLD),
    { pass: false, score: 50 },
  )
})

test('reinterpretPronunciationPass: leaves system grading failures untouched', () => {
  const failure = { pass: false, score: 0, error: true }
  assert.deepEqual(reinterpretPronunciationPass(failure), failure)
  assert.equal(reinterpretPronunciationPass(null), null)
})

test('HOMEWORK_PRON_MAX_ATTEMPTS is a sane positive retry cap', () => {
  assert.equal(HOMEWORK_PRON_MAX_ATTEMPTS, 5)
})
