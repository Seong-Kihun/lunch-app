/**
 * 모니터링 페이지
 * 시스템 모니터링 대시보드를 표시합니다.
 */

import React from 'react';
import MonitoringDashboard from '../components/MonitoringDashboard';
import AuthGuard from '../components/AuthGuard';

const MonitoringPage = () => {
    return (
        <AuthGuard>
            <MonitoringDashboard />
        </AuthGuard>
    );
};

export default MonitoringPage;



