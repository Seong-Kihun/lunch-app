/**
 * 파티 관련 커스텀 훅
 * 파티 데이터와 관련 함수들을 관리합니다.
 */

import { useState, useEffect, useCallback } from 'react';
import partyService from '../services/partyService';
import useAuth from './useAuth';

const useParties = () => {
    const { isAuthenticated, user } = useAuth();
    const [parties, setParties] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // 파티 목록 조회
    const fetchParties = useCallback(async (params = {}) => {
        if (!isAuthenticated) return;

        try {
            setLoading(true);
            setError(null);
            const response = await partyService.getParties(params);
            setParties(response.parties || []);
            return response;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    // 파티 생성
    const createParty = useCallback(async (partyData) => {
        if (!isAuthenticated) {
            throw new Error('인증이 필요합니다.');
        }

        try {
            setLoading(true);
            setError(null);
            const response = await partyService.createParty(partyData);
            
            // 파티 목록 새로고침
            await fetchParties();
            
            return response;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, fetchParties]);

    // 파티 참여
    const joinParty = useCallback(async (partyId) => {
        if (!isAuthenticated) {
            throw new Error('인증이 필요합니다.');
        }

        try {
            setLoading(true);
            setError(null);
            const response = await partyService.joinParty(partyId);
            
            // 파티 목록 새로고침
            await fetchParties();
            
            return response;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, fetchParties]);

    // 파티 나가기
    const leaveParty = useCallback(async (partyId) => {
        if (!isAuthenticated) {
            throw new Error('인증이 필요합니다.');
        }

        try {
            setLoading(true);
            setError(null);
            const response = await partyService.leaveParty(partyId);
            
            // 파티 목록 새로고침
            await fetchParties();
            
            return response;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, fetchParties]);

    // 파티 수정
    const updateParty = useCallback(async (partyId, updateData) => {
        if (!isAuthenticated) {
            throw new Error('인증이 필요합니다.');
        }

        try {
            setLoading(true);
            setError(null);
            const response = await partyService.updateParty(partyId, updateData);
            
            // 파티 목록 새로고침
            await fetchParties();
            
            return response;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, fetchParties]);

    // 파티 삭제
    const deleteParty = useCallback(async (partyId) => {
        if (!isAuthenticated) {
            throw new Error('인증이 필요합니다.');
        }

        try {
            setLoading(true);
            setError(null);
            const response = await partyService.deleteParty(partyId);
            
            // 파티 목록 새로고침
            await fetchParties();
            
            return response;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, fetchParties]);

    // 내 파티 목록 조회
    const fetchMyParties = useCallback(async () => {
        if (!isAuthenticated || !user?.employee_id) return;

        try {
            setLoading(true);
            setError(null);
            const response = await partyService.getMyParties(user.employee_id);
            return response;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, user?.employee_id]);

    // 초기 파티 목록 로드
    useEffect(() => {
        if (isAuthenticated) {
            fetchParties();
        }
    }, [isAuthenticated, fetchParties]);

    return {
        parties,
        loading,
        error,
        fetchParties,
        createParty,
        joinParty,
        leaveParty,
        updateParty,
        deleteParty,
        fetchMyParties,
        setError
    };
};

export default useParties;



