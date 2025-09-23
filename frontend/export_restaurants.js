// excelReader.js의 722개 식당 데이터를 JSON 파일로 내보내는 스크립트

// excelReader.js의 restaurantData 배열을 여기에 복사
const restaurantData = [
  // { name: '식당명', address: '주소', latitude: 위도, longitude: 경도, distance: 거리(km) },
  { name: '지구마을', address: '경기도 성남시 수정구 시흥동 298 한국국제협력단 본관 1층 일부호', latitude: 37.41504641, longitude: 127.0993841, distance: 0.1 },
  { name: '북창동순두부 판교파미어스몰점', address: '경기도 성남시 수정구 시흥동 322 2층 209호 ', latitude: 37.41340786, longitude: 127.0983592, distance: 0.26 },
  { name: '시먼당 파미어스몰', address: '경기도 성남시 수정구 시흥동 322 판교아이스퀘어 2층 201-3호 ', latitude: 37.41340786, longitude: 127.0983592, distance: 0.26 },
  { name: '청담식당', address: '경기도 성남시 수정구 시흥동 248-8 MHY, 1층 ', latitude: 37.41530973, longitude: 127.1017639, distance: 0.28 },
  { name: '짬뽕지존 판교점', address: '경기도 성남시 수정구 시흥동 272-5 1층 ', latitude: 37.41438124, longitude: 127.1014436, distance: 0.29 },
  { name: '어머니밥상', address: '경기도 성남시 수정구 시흥동 272-7 1층일부호', latitude: 37.41387148, longitude: 127.1010811, distance: 0.3 },
  { name: '감포회플러스', address: '경기도 성남시 수정구 시흥동 246-28 1층 일부 ', latitude: 37.41637361, longitude: 127.102022, distance: 0.31 },
  { name: '탐앤탐스 세종연구소입구점', address: '경기도 성남시 수정구 시흥동 246-7 1층(일부) ', latitude: 37.41638864, longitude: 127.1021476, distance: 0.32 },
  { name: '리드푸드', address: '경기도 성남시 수정구 시흥동 280-4 지하2층(일부) ', latitude: 37.41300286, longitude: 127.1004949, distance: 0.34 },
  { name: '정원식당', address: '경기도 성남시 수정구 시흥동 280-4 B107호 ', latitude: 37.41300286, longitude: 127.1004949, distance: 0.34 },
  { name: '바캉스', address: '경기도 성남시 수정구 시흥동 324 판교 제2테크노밸리 LH 1단지 지2층 1,2호', latitude: 37.41281205, longitude: 127.0960162, distance: 0.4 },
  { name: '세븐일레븐 판교LH테크노점', address: '경기도 성남시 수정구 시흥동 324 판교 제2테크노밸리 LH 1단지 근린생활시설동 지2층 5호 ', latitude: 37.41281205, longitude: 127.0960162, distance: 0.4 },
  { name: '송원식당 판교', address: '경기도 성남시 수정구 시흥동 324 판교 제2테크노밸리 LH 1단지 지2층 12호 ', latitude: 37.41281205, longitude: 127.0960162, distance: 0.4 },
  { name: '오백국수 판교LH테크노점', address: '경기도 성남시 수정구 시흥동 324 판교 제2테크노밸리 LH 1단지 근린생활시설동 지2층 7호 ', latitude: 37.41281205, longitude: 127.0960162, distance: 0.4 },
  { name: '커스텀커피 판교테크노밸리점', address: '경기도 성남시 수정구 시흥동 324 판교 제2테크노밸리 LH 1단지 근린생활시설동 지하2층 3호 ', latitude: 37.41281205, longitude: 127.0960162, distance: 0.4 },
  { name: '포아이니', address: '경기도 성남시 수정구 시흥동 324 판교 제2테크노밸리 LH 1단지 근린생활시설동 지하2층 11호 ', latitude: 37.41281205, longitude: 127.0960162, distance: 0.4 },
  { name: '모모유부 판교파미어스몰', address: '경기도 성남시 수정구 시흥동 339 판교아이스퀘어 A동 지하1층 B104-1호 ', latitude: 37.41202491, longitude: 127.0977921, distance: 0.42 },
  { name: '밀본 파미어스몰점', address: '경기도 성남시 수정구 시흥동 339 판교아이스퀘어 B동 2층 201-1호 ', latitude: 37.41202491, longitude: 127.0977921, distance: 0.42 },
  { name: '린지커피', address: '경기도 성남시 수정구 시흥동 340 1층 A-102호 ', latitude: 37.41183332, longitude: 127.0961746, distance: 0.48 },
  { name: '메가엠지씨커피 제2테크노밸리점', address: '경기도 성남시 수정구 시흥동 340 1층 A-104호 ', latitude: 37.41183332, longitude: 127.0961746, distance: 0.48 },
  { name: '바돈바 돈가스', address: '경기도 성남시 수정구 시흥동 340 1층 A-105호 ', latitude: 37.41183332, longitude: 127.0961746, distance: 0.48 },
  { name: '스텝밀', address: '경기도 성남시 수정구 시흥동 340 1층 B-105, B-106호(B동) ', latitude: 37.41183332, longitude: 127.0961746, distance: 0.48 },
  { name: '언버튼', address: '경기도 성남시 수정구 시흥동 340 판교글로벌비즈센터 A-107호', latitude: 37.41183332, longitude: 127.0961746, distance: 0.48 },
  { name: '영양사가 차려주는 밥상', address: '경기도 성남시 수정구 시흥동 340 B-110, B-111, B-112호 ', latitude: 37.41183332, longitude: 127.0961746, distance: 0.48 },
  { name: '이에스에프피(ESFP)', address: '경기도 성남시 수정구 시흥동 340 1층 A-101호 ', latitude: 37.41183332, longitude: 127.0961746, distance: 0.48 },
  { name: '판교제일순대국', address: '경기도 성남시 수정구 시흥동 340 판교 글로벌비즈센터 B동 108호', latitude: 37.41183332, longitude: 127.0961746, distance: 0.48 },
  { name: '푸르나다(Frunada)', address: '경기도 성남시 수정구 시흥동 340 1층 B-107호 ', latitude: 37.41183332, longitude: 127.0961746, distance: 0.48 },
  { name: '해루(어)', address: '경기도 성남시 수정구 시흥동 340 1층 B-101호 ', latitude: 37.41183332, longitude: 127.0961746, distance: 0.48 },
  { name: '훅트포케 판교제2테크노밸리점', address: '경기도 성남시 수정구 시흥동 340 판교 글로벌비즈센터 1층 A-108호', latitude: 37.41183332, longitude: 127.0961746, distance: 0.48 },
  { name: '푸주옥설렁탕', address: '경기도 성남시 수정구 시흥동 223 ', latitude: 37.42022579, longitude: 127.1018517, distance: 0.58 },
  { name: '커피나인 판교제2테크노밸리', address: '경기도 성남시 수정구 시흥동 342 판교 디앤써밋 에디션 106호', latitude: 37.41102744, longitude: 127.0951896, distance: 0.6 },
  { name: '컴포즈커피 판교제2테크노밸리점', address: '경기도 성남시 수정구 시흥동 342 104호', latitude: 37.41102744, longitude: 127.0951896, distance: 0.6 },
  { name: '텐퍼센트 제2판교테크노벨리점', address: '경기도 성남시 수정구 시흥동 342 103호', latitude: 37.41102744, longitude: 127.0951896, distance: 0.6 },
  { name: '다이닝테이블', address: '경기도 성남시 수정구 시흥동 75-11 3층 ', latitude: 37.41975859, longitude: 127.1037477, distance: 0.64 },
  { name: '샐러디 판교제2테크노밸리점', address: '경기도 성남시 수정구 시흥동 347 103호', latitude: 37.41061253, longitude: 127.0951743, distance: 0.64 },
  { name: '카페57에비뉴(Cafe 57 Ave)', address: '경기도 성남시 수정구 시흥동 347 1층 102호 ', latitude: 37.41061253, longitude: 127.0951743, distance: 0.64 },
  { name: '판교옥', address: '경기도 성남시 수정구 시흥동 347 104호,105호,106호,107호 ', latitude: 37.41061253, longitude: 127.0951743, distance: 0.64 },
  { name: '주니아 판교it센터점', address: '경기도 성남시 수정구 시흥동 330 판교IT센터 지2층 B208,B209호 ', latitude: 37.41208455, longitude: 127.0926462, distance: 0.66 },
  { name: '홍박사생고기', address: '경기도 성남시 수정구 금토동 272-32 지하1층,1층 ', latitude: 37.40967838, longitude: 127.0982331, distance: 0.67 },
  { name: '청계산 담백미', address: '경기도 성남시 수정구 금토동 272 1층,2층 ', latitude: 37.40922745, longitude: 127.0977511, distance: 0.72 },
  { name: '도월', address: '경기도 성남시 수정구 금토동 272-25 지하1층, 1층 ', latitude: 37.4092195, longitude: 127.0974603, distance: 0.73 },
  { name: '엄마네 돼지마을', address: '경기도 성남시 수정구 시흥동 83-35 1층 ', latitude: 37.42077134, longitude: 127.1038413, distance: 0.73 },
  { name: '판교양평해장국 막국수', address: '경기도 성남시 수정구 시흥동 221-1 1층 ', latitude: 37.42181446, longitude: 127.1027922, distance: 0.77 },
  { name: '돈우모리', address: '경기도 성남시 수정구 시흥동 293 판교 제2테크노밸리 경기 기업성장센터 지하1층 B120, 121호 ', latitude: 37.40868154, longitude: 127.0970774, distance: 0.79 },
  { name: '라라스페이스', address: '경기도 성남시 수정구 시흥동 293 판교 제2테크노밸리 경기 기업성장센터,1층 118호 ', latitude: 37.40868154, longitude: 127.0970774, distance: 0.79 },
  { name: '마리오븐', address: '경기도 성남시 수정구 시흥동 293 1층 117호 ', latitude: 37.40868154, longitude: 127.0970774, distance: 0.79 },
  { name: '마리오븐 2호', address: '경기도 성남시 수정구 시흥동 293 판교 제2테크노밸리 경기 기업성장센터,지하1층B110호 ', latitude: 37.40868154, longitude: 127.0970774, distance: 0.79 },
  { name: '백경 판교본점', address: '경기도 성남시 수정구 시흥동 293 판교 제2테크노밸리 경기 기업성장센터 B117호', latitude: 37.40868154, longitude: 127.0970774, distance: 0.79 },
  { name: '블리스버거 판교2밸리점', address: '경기도 성남시 수정구 시흥동 293 지하1층 116호 ', latitude: 37.40868154, longitude: 127.0970774, distance: 0.79 },
  { name: '신황산벌', address: '경기도 성남시 수정구 금토동 270-9 지층 ', latitude: 37.40890227, longitude: 127.0960003, distance: 0.79 },
  { name: '에스이커피 기업성장센터점', address: '경기도 성남시 수정구 시흥동 293 판교 제2테크노밸리 경기 기업성장센터,1층 107호108호109호 ', latitude: 37.40868154, longitude: 127.0970774, distance: 0.79 },
  { name: '이태리부대찌개 제2판교점', address: '경기도 성남시 수정구 시흥동 293 지하1층 B113호 ', latitude: 37.40868154, longitude: 127.0970774, distance: 0.79 },
  { name: '임진강 메기매운탕', address: '경기도 성남시 수정구 시흥동 83-10 1층 ', latitude: 37.42088184, longitude: 127.1047178, distance: 0.79 },
  { name: '전주콩나물 국밥', address: '경기도 성남시 수정구 시흥동 293 판교 제2테크노밸리 경기 기업성장센터1층 120호 ', latitude: 37.40868154, longitude: 127.0970774, distance: 0.79 },
  { name: '카페리빈 판교점', address: '경기도 성남시 수정구 시흥동 293 1층,122호 ', latitude: 37.40868154, longitude: 127.0970774, distance: 0.79 },
  { name: '판교감자탕보쌈', address: '경기도 성남시 수정구 시흥동 293 판교 제2테크노밸리 경기 기업성장센터 지하1층 B114호 ', latitude: 37.40868154, longitude: 127.0970774, distance: 0.79 },
  { name: '풍경한식뷔페', address: '경기도 성남시 수정구 시흥동 293 판교 제2테크노밸리 경기 기업성장센터,1층 114~116호 ', latitude: 37.40868154, longitude: 127.0970774, distance: 0.79 },
  { name: '풍원장 손칼국수', address: '경기도 성남시 수정구 시흥동 293 판교 제2테크노밸리 경기 기업성장센터,지하1층B115호 ', latitude: 37.40868154, longitude: 127.0970774, distance: 0.79 },
  { name: '프레소 커피 랩(PRESO COFFEE LAB)', address: '경기도 성남시 수정구 시흥동 293 판교 제2테크노밸리 경기 기업성장센터 지1층 B103호 ', latitude: 37.40868154, longitude: 127.0970774, distance: 0.79 },
  { name: '하루엔소쿠 판교점', address: '경기도 성남시 수정구 시흥동 293 1층 121호 ', latitude: 37.40868154, longitude: 127.0970774, distance: 0.79 },
  { name: '유명식당', address: '경기도 성남시 수정구 시흥동 71 1층 일부 ', latitude: 37.41742545, longitude: 127.1079196, distance: 0.84 },
  { name: '(주)에스앤에스컴퍼니 판교파미어스몰 서가앤쿡', address: '경기도 성남시 수정구 시흥동 288-2 판교아이스퀘어 A동 106-1호 ', latitude: 37.40804159, longitude: 127.0981152, distance: 0.85 },
  { name: '101번지 남산돈까스 판교파미어스몰점', address: '경기도 성남시 수정구 시흥동 288-2 C동 지하1층 B109-2호 ', latitude: 37.40804159, longitude: 127.0981152, distance: 0.85 },
  { name: '1992덮밥&짜글이 판교파미어스몰점', address: '경기도 성남시 수정구 시흥동 288-2 2층 203-2호 ', latitude: 37.40804159, longitude: 127.0981152, distance: 0.85 },
  { name: '담소소사골순대육개장 판교4호점', address: '경기도 성남시 수정구 시흥동 288-2 판교아이스퀘어 D동 2층 207-3호 ', latitude: 37.40804159, longitude: 127.0981152, distance: 0.85 },
  { name: '동글이김밥', address: '경기도 성남시 수정구 시흥동 288-2 판교아이스퀘어 F동 211호 ', latitude: 37.40804159, longitude: 127.0981152, distance: 0.85 },
  { name: '동해강릉초당짬뽕순두부 판교파미어스몰점', address: '경기도 성남시 수정구 시흥동 288-2 판교아이스퀘어 E동 206-2호 ', latitude: 37.40804159, longitude: 127.0981152, distance: 0.85 },
  { name: '마당 이구공(MADANG 290)', address: '경기도 성남시 수정구 시흥동 288-2 판교아이스퀘어 F동 303-1호 ', latitude: 37.40804159, longitude: 127.0981152, distance: 0.85 },
  { name: '마스터다이닝 해담가', address: '경기도 성남시 수정구 시흥동 288-2 C2블록 판교아이스퀘어A동 1층 107호 ', latitude: 37.40804159, longitude: 127.0981152, distance: 0.85 },
  { name: '멜티코', address: '경기도 성남시 수정구 시흥동 288-2 판교아이스퀘어 F동 지하1층 B103호 ', latitude: 37.40804159, longitude: 127.0981152, distance: 0.85 },
  { name: '바디쉐프 판교점', address: '경기도 성남시 수정구 시흥동 288-2 판교아이스퀘어 B동 3층 301-3호 ', latitude: 37.40804159, longitude: 127.0981152, distance: 0.85 },
  { name: '본도시락 판교 파미어스점', address: '경기도 성남시 수정구 시흥동 288-2 지하1층 B105-2호 ', latitude: 37.40804159, longitude: 127.0981152, distance: 0.85 },
  { name: '북촌손만두 판교파미어스몰점', address: '경기도 성남시 수정구 시흥동 288-2 판교아이스퀘어 B동 201-4호 ', latitude: 37.40804159, longitude: 127.0981152, distance: 0.85 },
  { name: '삼산회관 파미어스몰점', address: '경기도 성남시 수정구 시흥동 288-2 판교아이스퀘어D동 2층 207-1호 ', latitude: 37.40804159, longitude: 127.0981152, distance: 0.85 },
  { name: '샐러딧 판교파미어스점', address: '경기도 성남시 수정구 시흥동 288-2 판교아이스퀘어 B동 103-1호(1층/c블럭) ', latitude: 37.40804159, longitude: 127.0981152, distance: 0.85 },
  { name: '시나본 판교파미어스점', address: '경기도 성남시 수정구 시흥동 288-2 판교아이스퀘어 B동 지1층 B103-1호 ', latitude: 37.40804159, longitude: 127.0981152, distance: 0.85 },
  { name: '아비꼬 판교파미어스몰점', address: '경기도 성남시 수정구 시흥동 288-2 판교아이스퀘어B동 2층 201-3호 ', latitude: 37.40804159, longitude: 127.0981152, distance: 0.85 },
  { name: '오지(OG)버거', address: '경기도 성남시 수정구 시흥동 288-2 판교아이스퀘어 B동 1층 102-1호 ', latitude: 37.40804159, longitude: 127.0981152, distance: 0.85 },
  { name: '오투닭갈비&부대찌개 판교아이스퀘어점', address: '경기도 성남시 수정구 시흥동 288-2 판교아이스퀘어F동 201호 ', latitude: 37.40804159, longitude: 127.0981152, distance: 0.85 },
  { name: '오한수우육면가 판교파미어스몰점', address: '경기도 성남시 수정구 시흥동 288-2 판교아이스퀘어 A동 2층 203-1호 ', latitude: 37.40804159, longitude: 127.0981152, distance: 0.85 },
  { name: '원유로스페셜티 판교 제2테크노밸리점', address: '경기도 성남시 수정구 시흥동 288-2 C2블록 판교아이스퀘어A동 B104-2 ', latitude: 37.40804159, longitude: 127.0981152, distance: 0.85 },
  { name: '이디야 판교파미어스몰점', address: '경기도 성남시 수정구 시흥동 288-2 C2블록 B103-2호 ', latitude: 37.40804159, longitude: 127.0981152, distance: 0.85 },
  { name: '정미소', address: '경기도 성남시 수정구 시흥동 288-2 B동 1층 104호 ', latitude: 37.40804159, longitude: 127.0981152, distance: 0.85 },
  { name: '제이브이엘(JVL)부대찌개 판교아이스퀘어점', address: '경기도 성남시 수정구 시흥동 288-2 판교아이스퀘어 E동 2층 206-3호', latitude: 37.40804159, longitude: 127.0981152, distance: 0.85 },
  { name: '진심담은 된장찌개 진된장 판교파미어스몰점', address: '경기도 성남시 수정구 시흥동 288-2 판교아이스퀘어 D동 2층 207-2호 ', latitude: 37.40804159, longitude: 127.0981152, distance: 0.85 },
  { name: '청록미나리식당 판교점', address: '경기도 성남시 수정구 시흥동 288-2 C동 1층 110-2호 ', latitude: 37.40804159, longitude: 127.0981152, distance: 0.85 },
  { name: '컴포즈커피 판교파미어스몰점', address: '경기도 성남시 수정구 시흥동 288-2 C2블록 102-2 ', latitude: 37.40804159, longitude: 127.0981152, distance: 0.85 },
  { name: '탄탄면공방 판교아이스퀘어점', address: '경기도 성남시 수정구 시흥동 288-2 판교아이스퀘어 F동 212호 ', latitude: 37.40804159, longitude: 127.0981152, distance: 0.85 },
  { name: '투썸플레이스 판교파미어스몰점', address: '경기도 성남시 수정구 시흥동 288-2 판교아이스퀘어 B동 1층 101호 ', latitude: 37.40804159, longitude: 127.0981152, distance: 0.85 },
  { name: '티니핑 크라상', address: '경기도 성남시 수정구 시흥동 288-2 판교아이스퀘어 E동 지하1층 B108호 ', latitude: 37.40804159, longitude: 127.0981152, distance: 0.85 },
  { name: '파파존스 판교2테크노밸리점', address: '경기도 성남시 수정구 시흥동 288-2 판교아이스퀘어 F동 지1층 B102호 ', latitude: 37.40804159, longitude: 127.0981152, distance: 0.85 },
  { name: '피키샐리', address: '경기도 성남시 수정구 시흥동 288-2 판교아이스퀘어 A동 지1층 B104-3호 ', latitude: 37.40804159, longitude: 127.0981152, distance: 0.85 },
  { name: '홍짜장 판교파미어스점', address: '경기도 성남시 수정구 시흥동 288-2 판교아이스퀘어 F동 2층 202호 ', latitude: 37.40804159, longitude: 127.0981152, distance: 0.85 },
  // ... 나머지 700개 이상의 식당 데이터는 excelReader.js에서 복사
];

// 카테고리 추정 함수
function estimateCategory(name) {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('카페') || lowerName.includes('커피') || lowerName.includes('스타벅스') || lowerName.includes('투썸') || lowerName.includes('탐앤탐스') || lowerName.includes('컴포즈') || lowerName.includes('이디야') || lowerName.includes('메가엠지씨') || lowerName.includes('커피나인') || lowerName.includes('텐퍼센트') || lowerName.includes('카페57') || lowerName.includes('주니아') || lowerName.includes('라라스페이스') || lowerName.includes('에스이커피') || lowerName.includes('카페리빈') || lowerName.includes('프레소') || lowerName.includes('푸르나다') || lowerName.includes('원유로스페셜티') || lowerName.includes('멜티코')) {
    return '카페';
  } else if (lowerName.includes('치킨') || lowerName.includes('bbq') || lowerName.includes('교촌') || lowerName.includes('네네') || lowerName.includes('오투닭')) {
    return '치킨';
  } else if (lowerName.includes('피자') || lowerName.includes('도미노') || lowerName.includes('피자헛') || lowerName.includes('파파존스')) {
    return '피자';
  } else if (lowerName.includes('편의점') || lowerName.includes('씨유') || lowerName.includes('gs25') || lowerName.includes('세븐일레븐')) {
    return '편의점';
  } else if (lowerName.includes('베이커리') || lowerName.includes('파리바게뜨') || lowerName.includes('뚜레쥬르') || lowerName.includes('마리오븐') || lowerName.includes('스텝밀') || lowerName.includes('티니핑')) {
    return '베이커리';
  } else if (lowerName.includes('일식') || lowerName.includes('스시') || lowerName.includes('라멘') || lowerName.includes('돈가스') || lowerName.includes('유부') || lowerName.includes('포케')) {
    return '일식';
  } else if (lowerName.includes('중식') || lowerName.includes('짜장면') || lowerName.includes('탕수육') || lowerName.includes('짬뽕') || lowerName.includes('홍짜장')) {
    return '중식';
  } else if (lowerName.includes('양식') || lowerName.includes('파스타') || lowerName.includes('스테이크') || lowerName.includes('버거') || lowerName.includes('샐러드') || lowerName.includes('샐러딧') || lowerName.includes('피키샐리') || lowerName.includes('다이닝테이블')) {
    return '양식';
  } else if (lowerName.includes('분식') || lowerName.includes('김밥') || lowerName.includes('순두부') || lowerName.includes('국밥') || lowerName.includes('만두')) {
    return '분식';
  } else if (lowerName.includes('패스트푸드') || lowerName.includes('맘스터치') || lowerName.includes('블리스버거') || lowerName.includes('오지버거')) {
    return '패스트푸드';
  } else {
    return '한식';
  }
}

// 백엔드용 데이터로 변환
const backendData = restaurantData.map(restaurant => ({
  name: restaurant.name,
  address: restaurant.address,
  latitude: restaurant.latitude,
  longitude: restaurant.longitude,
  category: estimateCategory(restaurant.name)
}));

// JSON 파일로 내보내기
const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, '..', 'lunch_app', 'restaurants_722.json');
fs.writeFileSync(outputPath, JSON.stringify(backendData, null, 2), 'utf8');

console.log(`✅ ${backendData.length}개 식당 데이터를 ${outputPath}에 저장했습니다.`);
console.log('📊 카테고리별 분포:');
const categoryCount = {};
backendData.forEach(item => {
  categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
});
Object.entries(categoryCount).forEach(([category, count]) => {
  console.log(`  - ${category}: ${count}개`);
});
