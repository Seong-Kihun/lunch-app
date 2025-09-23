import { StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 공통 색상 팔레트
export const COLORS = {
  // 라이트 모드
  light: {
    primary: '#3B82F6',      // 파란색 (메인 컬러)
    primaryLight: 'rgba(59, 130, 246, 0.1)',
    secondary: '#10B981',    // 에메랄드 (강조/파티생성)
    accent: '#8B5CF6',       // 보라 (성공/확인)
    background: '#F1F5F9',   // 연한 블루 그레이
    surface: '#FFFFFF',
    text: '#1E293B',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    gray: '#64748B',
    lightGray: '#E2E8F0',
    red: '#EF4444',
    disabled: '#CBD5E0',
    blue: '#3B82F6',         // 파란색 (메인)
    indigo: '#6366F1',       // 인디고 (단골파티)
    cyan: '#06B6D4',         // 시안 (맛집)
    deepBlue: '#1D5D9B',      // 진한 파란색
    skyBlue: '#75C2F6',       // 연한 파란색
    yellow: '#F4D160',        // 밝은 노란색
    paleYellow: '#FBEEAC',     // 연한 노란색
    white: '#FFFFFF',         // 흰색
    success: '#10B981',       // 성공
    warning: '#F59E0B',       // 경고
    error: '#EF4444',         // 오류
  },
  // 다크 모드
  dark: {
    primary: '#60A5FA',      // 밝은 파란색
    primaryLight: 'rgba(96, 165, 250, 0.1)',
    secondary: '#34D399',    // 밝은 에메랄드
    accent: '#A78BFA',       // 밝은 보라
    background: '#0F172A',   // 진한 네이비
    surface: '#1E293B',      // 어두운 그레이
    text: '#F8FAFC',         // 밝은 텍스트
    textSecondary: '#94A3B8', // 회색 텍스트
    border: '#334155',       // 어두운 보더
    gray: '#94A3B8',
    lightGray: '#334155',
    red: '#F87171',
    disabled: '#475569',
    blue: '#60A5FA',
    indigo: '#818CF8',
    cyan: '#22D3EE',
    deepBlue: '#3B82F6',
    skyBlue: '#7DD3FC',
    yellow: '#FCD34D',
    paleYellow: '#FEF3C7',
    white: '#FFFFFF',         // 흰색
    success: '#34D399',       // 성공
    warning: '#FBBF24',       // 경고
    error: '#F87171',         // 오류
  }
};

// 공통 스페이싱
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// 공통 폰트 크기
export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// 공통 폰트 웨이트
export const FONT_WEIGHTS = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};

// 공통 테두리 반경
export const BORDER_RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 50,
};

// 공통 그림자
export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
};

// 공통 컴포넌트 스타일
export const COMPONENT_STYLES = {
  // 카드 스타일
  card: {
    backgroundColor: COLORS.light.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginVertical: SPACING.sm,
    ...SHADOWS.md,
    borderWidth: 1,
    borderColor: COLORS.light.border,
  },
  
  // 버튼 스타일
  button: {
    primary: {
      backgroundColor: COLORS.light.primary,
      borderRadius: BORDER_RADIUS.md,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.lg,
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOWS.sm,
    },
    secondary: {
      backgroundColor: COLORS.light.secondary,
      borderRadius: BORDER_RADIUS.md,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.lg,
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOWS.sm,
    },
    outline: {
      backgroundColor: 'transparent',
      borderRadius: BORDER_RADIUS.md,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.lg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: COLORS.light.primary,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderRadius: BORDER_RADIUS.md,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
  },
  
  // 입력 필드 스타일
  input: {
    backgroundColor: COLORS.light.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.light.border,
    fontSize: FONT_SIZES.md,
    color: COLORS.light.text,
  },
  
  // 헤더 스타일
  header: {
    backgroundColor: COLORS.light.surface,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light.border,
    ...SHADOWS.sm,
  },
  
  // 리스트 아이템 스타일
  listItem: {
    backgroundColor: COLORS.light.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginVertical: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.light.border,
    ...SHADOWS.sm,
  },
  
  // 모달 스타일
  modal: {
    centeredView: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalView: {
      margin: SPACING.md,
      backgroundColor: COLORS.light.surface,
      borderRadius: BORDER_RADIUS.xl,
      padding: SPACING.xl,
      alignItems: 'center',
      width: '90%',
      ...SHADOWS.xl,
    },
  },
};

// 반응형 디자인을 위한 유틸리티
export const RESPONSIVE = {
  // 화면 너비에 따른 반응형 값
  getResponsiveValue: (mobile, tablet, desktop) => {
    if (SCREEN_WIDTH >= 768) return desktop;
    if (SCREEN_WIDTH >= 480) return tablet;
    return mobile;
  },
  
  // 화면 높이에 따른 반응형 값
  getResponsiveHeight: (mobile, tablet, desktop) => {
    if (SCREEN_HEIGHT >= 1024) return desktop;
    if (SCREEN_HEIGHT >= 768) return tablet;
    return mobile;
  },
  
  // 터치 영역 최소 크기 (접근성)
  minTouchArea: 44,
  
  // 스크롤 가능한 최소 높이
  minScrollHeight: 200,
};

// 애니메이션 관련 상수
export const ANIMATION = {
  duration: {
    fast: 200,
    normal: 300,
    slow: 500,
  },
  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

// 접근성 관련 상수
export const ACCESSIBILITY = {
  // 최소 터치 영역
  minTouchArea: 44,
  
  // 최소 폰트 크기
  minFontSize: 16,
  
  // 최소 대비 비율
  minContrastRatio: 4.5,
  
  // 포커스 표시 지속 시간
  focusDuration: 2000,
};

// 성능 최적화 관련 상수
export const PERFORMANCE = {
  // 이미지 캐시 크기
  imageCacheSize: 100,
  
  // 리스트 렌더링 최적화
  listItemHeight: 80,
  
  // 무한 스크롤 페이지 크기
  infiniteScrollPageSize: 20,
  
  // 디바운스 지연 시간
  debounceDelay: 300,
  
  // 스로틀 지연 시간
  throttleDelay: 100,
};

// 테마별 스타일 생성 함수
export const createThemeStyles = (isDarkMode = false) => {
  const colors = isDarkMode ? COLORS.dark : COLORS.light;
  
  return {
    ...COMPONENT_STYLES,
    colors,
    // 테마별 추가 스타일
    themeSpecific: {
      background: colors.background,
      surface: colors.surface,
      text: colors.text,
      textSecondary: colors.textSecondary,
      border: colors.border,
    },
  };
};

// 공통 유틸리티 함수
export const StyleUtils = {
  // 색상 투명도 조정
  withOpacity: (color, opacity) => {
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return color;
  },
  
  // 색상 밝기 조정
  adjustBrightness: (color, percent) => {
    // 간단한 밝기 조정 (실제로는 더 정교한 알고리즘 필요)
    return color;
  },
  
  // 반응형 패딩 생성
  responsivePadding: (mobile, tablet, desktop) => {
    return {
      paddingHorizontal: RESPONSIVE.getResponsiveValue(mobile, tablet, desktop),
      paddingVertical: RESPONSIVE.getResponsiveValue(mobile, tablet, desktop),
    };
  },
  
  // 반응형 마진 생성
  responsiveMargin: (mobile, tablet, desktop) => {
    return {
      marginHorizontal: RESPONSIVE.getResponsiveValue(mobile, tablet, desktop),
      marginVertical: RESPONSIVE.getResponsiveValue(mobile, tablet, desktop),
    };
  },
};

export default {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  SHADOWS,
  COMPONENT_STYLES,
  RESPONSIVE,
  ANIMATION,
  ACCESSIBILITY,
  PERFORMANCE,
  createThemeStyles,
  StyleUtils,
};
