/**
 * 날짜 관련 유틸리티 함수들
 * App.js에서 분리된 함수들
 */

/**
 * 수신자 ID 문자열을 파싱하여 배열로 반환
 * @param {string} recipientIds - 쉼표로 구분된 ID 문자열
 * @returns {string[]} 파싱된 ID 배열
 */
export function parseRecipientIds(recipientIds) {
  // 빈 문자열이면 빈 배열 반환
  if (!recipientIds || recipientIds.trim() === '') {
    return [];
  }
  
  // 연속된 쉼표를 하나로 치환하고, 앞뒤 공백 제거
  const cleanedIds = recipientIds.replace(/,,+/g, ',').trim();
  
  // 쉼표로 분리하고 빈 문자열 제거
  const ids = cleanedIds
    .split(',')
    .map(id => id.trim())
    .filter(id => id.length > 0);
  
  // 만약 각 ID가 한 글자씩이라면 (예: "K,O,I,C,A,0,0,2"), 올바른 형태로 조합
  if (ids.length > 0 && ids[0].length === 1) {
    const combinedIds = [];
    let currentId = '';
    
    for (let i = 0; i < ids.length; i++) {
      currentId += ids[i];
      // 8글자가 되면 하나의 ID로 간주 (KOICA002 형태)
      if (currentId.length === 8) {
        combinedIds.push(currentId);
        currentId = '';
      }
    }
    
    // 남은 글자들도 ID로 추가 (8글자가 안 되더라도)
    if (currentId.length > 0) {
      combinedIds.push(currentId);
    }
    
    return combinedIds;
  }
  
  return ids;
}

/**
 * 날짜를 YYYY-MM-DD(로컬) 형식으로 반환
 * @param {Date} date - 변환할 날짜 객체
 * @returns {string} YYYY-MM-DD 형식의 날짜 문자열
 */
export function toLocalDateString(date) {
  const pad = n => n.toString().padStart(2, '0');
  const result = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  
  return result;
}

/**
 * 가장 가까운 평일을 반환 (주말인 경우 다음 월요일로)
 * @param {Date} date - 기준 날짜 객체
 * @returns {Date} 가장 가까운 평일 날짜 객체
 */
export function getNextWeekday(date) {
  const day = date.getDay();
  if (day === 0) { // 일요일
    date.setDate(date.getDate() + 1); // 월요일로
  } else if (day === 6) { // 토요일
    date.setDate(date.getDate() + 2); // 월요일로
  }
  return date;
}

/**
 * 한국 시간 기준으로 날짜를 YYYY-MM-DD 형식으로 변환
 * @param {Date} date - 변환할 날짜 객체
 * @returns {string} YYYY-MM-DD 형식의 날짜 문자열 (한국 시간 기준)
 */
export function toKoreanDateString(date) {
  // 한국 시간대 (UTC+9) 고려
  const koreanTime = new Date(date.getTime() + (9 * 60 * 60 * 1000));
  const year = koreanTime.getFullYear();
  const month = String(koreanTime.getMonth() + 1).padStart(2, '0');
  const day = String(koreanTime.getDate()).padStart(2, '0');
  const result = `${year}-${month}-${day}`;
  
  return result;
}
