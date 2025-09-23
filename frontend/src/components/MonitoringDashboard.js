/**
 * 모니터링 대시보드 컴포넌트
 * 실시간 시스템 상태를 시각적으로 표시합니다.
 */

import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

const MonitoringDashboard = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    // 대시보드 데이터 조회
    const fetchDashboardData = async () => {
        try {
            const response = await apiClient.get('/api/monitoring/dashboard');
            setDashboardData(response.data);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // 실시간 데이터 조회
    const fetchRealtimeData = async () => {
        try {
            const response = await apiClient.get('/api/monitoring/realtime');
            setDashboardData(prev => ({
                ...prev,
                realtime: response.data
            }));
        } catch (err) {
            console.error('실시간 데이터 조회 실패:', err);
        }
    };

    // 헬스 체크
    const checkHealth = async () => {
        try {
            const response = await apiClient.get('/api/monitoring/health');
            return response.data;
        } catch (err) {
            return { status: 'error', message: err.message };
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            fetchRealtimeData();
        }, 5000); // 5초마다 업데이트

        return () => clearInterval(interval);
    }, [autoRefresh]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">모니터링 오류</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={fetchDashboardData}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    >
                        다시 시도
                    </button>
                </div>
            </div>
        );
    }

    const { summary, alerts } = dashboardData || {};

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-7xl mx-auto">
                {/* 헤더 */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">시스템 모니터링 대시보드</h1>
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={`px-4 py-2 rounded ${
                                autoRefresh 
                                    ? 'bg-green-500 text-white' 
                                    : 'bg-gray-500 text-white'
                            }`}
                        >
                            {autoRefresh ? '자동 새로고침 ON' : '자동 새로고침 OFF'}
                        </button>
                        <button
                            onClick={fetchDashboardData}
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                        >
                            수동 새로고침
                        </button>
                    </div>
                </div>

                {/* 알림 섹션 */}
                {alerts && alerts.length > 0 && (
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-red-600 mb-4">⚠️ 알림</h2>
                        <div className="grid gap-4">
                            {alerts.map((alert, index) => (
                                <div key={index} className="bg-red-50 border-l-4 border-red-400 p-4">
                                    <div className="flex">
                                        <div className="ml-3">
                                            <p className="text-sm text-red-700">
                                                <strong>{alert.type}:</strong> {alert.message}
                                            </p>
                                            {alert.value && (
                                                <p className="text-xs text-red-600 mt-1">
                                                    현재값: {alert.value} | 임계값: {alert.threshold}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 메트릭 카드들 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* 총 API 호출 수 */}
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                                        <span className="text-white text-sm font-bold">API</span>
                                    </div>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            총 API 호출
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {summary?.total_api_calls?.toLocaleString() || 0}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 활성 사용자 수 */}
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                                        <span className="text-white text-sm font-bold">👥</span>
                                    </div>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            활성 사용자
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {summary?.active_users || 0}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 에러율 */}
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                                        <span className="text-white text-sm font-bold">⚠️</span>
                                    </div>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            에러율
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {summary?.error_rate ? (summary.error_rate * 100).toFixed(2) + '%' : '0%'}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 평균 응답시간 */}
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                                        <span className="text-white text-sm font-bold">⏱️</span>
                                    </div>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            평균 응답시간
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {summary?.avg_response_time ? summary.avg_response_time.toFixed(0) + 'ms' : '0ms'}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 상세 정보 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 인기 엔드포인트 */}
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                인기 엔드포인트
                            </h3>
                            <div className="space-y-3">
                                {summary?.top_endpoints?.slice(0, 5).map((endpoint, index) => (
                                    <div key={index} className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600 truncate">
                                            {endpoint[0]}
                                        </span>
                                        <span className="text-sm font-medium text-gray-900">
                                            {endpoint[1].toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 최근 에러 */}
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                최근 에러
                            </h3>
                            <div className="space-y-3">
                                {summary?.recent_errors_list?.slice(0, 5).map((error, index) => (
                                    <div key={index} className="text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">
                                                {error.endpoint}
                                            </span>
                                            <span className="text-red-600 font-medium">
                                                {error.status_code}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {new Date(error.timestamp).toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 실시간 데이터 */}
                {dashboardData?.realtime && (
                    <div className="mt-6 bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                실시간 데이터
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <span className="text-sm text-gray-500">현재 시간대 호출</span>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {dashboardData.realtime.current_hour_stats?.api_calls || 0}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-500">오늘 총 호출</span>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {dashboardData.realtime.total_calls_today || 0}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-500">활성 사용자</span>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {dashboardData.realtime.active_users || 0}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MonitoringDashboard;
