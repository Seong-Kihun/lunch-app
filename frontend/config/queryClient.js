import { QueryClient } from '@tanstack/react-query';

// React Query 클라이언트 설정
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 기본 설정
      staleTime: 5 * 60 * 1000, // 5분
      cacheTime: 10 * 60 * 1000, // 10분
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      // 뮤테이션 기본 설정
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// 에러 핸들링을 위한 전역 설정
queryClient.setDefaultOptions({
  queries: {
    onError: (error) => {
      console.error('Query error:', error);
    },
  },
  mutations: {
    onError: (error) => {
      console.error('Mutation error:', error);
    },
  },
});
