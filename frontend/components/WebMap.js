import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

// 실제 지도를 표시하는 웹뷰 컴포넌트
const WebMap = ({ 
  region, 
  markers = [], 
  style, 
  onPress,
  onMarkerPress,
  currentLocation,
  ...props 
}) => {
  // 현재 위치를 중심으로 하는 지도 HTML 생성
  const generateMapHTML = () => {
    const centerLat = region?.latitude || 37.5665;
    const centerLng = region?.longitude || 126.9780;
    
    // 마커 데이터를 JavaScript 배열로 변환
    const markersData = markers.map(marker => ({
      lat: marker.coordinate?.latitude || marker.latitude,
      lng: marker.coordinate?.longitude || marker.longitude,
      title: marker.title || marker.name,
      description: marker.description || marker.category
    }));

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>식당 지도</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
          body { margin: 0; padding: 0; }
          #map { width: 100%; height: 100vh; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
          // Leaflet 지도 초기화
          const map = L.map('map').setView([${centerLat}, ${centerLng}], 13);
          
          // OpenStreetMap 타일 레이어 추가
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);
          
          // 마커들 추가
          const markers = ${JSON.stringify(markersData)};
          
          // 현재 위치 마커 추가 (작은 빨간색 동그라미)
          if (${JSON.stringify(currentLocation)}) {
            const currentLoc = ${JSON.stringify(currentLocation)};
            const currentMarker = L.marker([currentLoc.latitude, currentLoc.longitude], {
              icon: L.divIcon({
                className: 'current-location-marker',
                html: '<div style="background: #FF0000; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>',
                iconSize: [12, 12],
                iconAnchor: [6, 6]
              })
            }).addTo(map);
            
            currentMarker.bindPopup('현재 위치');
          }

          // 식당 마커들 추가 (파란색 마커) - 성능 최적화
          const markerGroup = L.layerGroup();
          markers.forEach((markerData, index) => {
            const marker = L.marker([markerData.lat, markerData.lng], {
              icon: L.divIcon({
                className: 'restaurant-marker',
                html: '<div style="background: #3B82F6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
              })
            });
            
            // 팝업 생성
            const popup = L.popup().setContent(
              '<div style="padding:5px; font-size:12px;">' + 
              '<strong>' + markerData.title + '</strong><br>' +
              markerData.description + '</div>'
            );
            
            marker.bindPopup(popup);
            
            // 마커 클릭 이벤트
            marker.on('click', function() {
              // React Native로 마커 클릭 이벤트 전송
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'markerClick',
                index: index,
                data: markerData
              }));
            });
            
            markerGroup.addLayer(marker);
          });
          
          // 마커 그룹을 지도에 추가
          markerGroup.addTo(map);
          
          // 줌 레벨에 따른 마커 표시 최적화
          map.on('zoomend', function() {
            const zoom = map.getZoom();
            if (zoom < 10) {
              // 줌 레벨이 낮으면 마커 숨김 (성능 향상)
              markerGroup.setOpacity(0.3);
            } else {
              // 줌 레벨이 높으면 마커 표시
              markerGroup.setOpacity(1);
            }
          });
          
          // 지도 클릭 이벤트
          map.on('click', function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'mapClick'
            }));
          });
        </script>
      </body>
      </html>
    `;
  };

  // 웹뷰 메시지 처리
  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'markerClick' && onMarkerPress) {
        onMarkerPress(data.data, data.index);
      } else if (data.type === 'mapClick' && onPress) {
        onPress();
      }
    } catch (error) {
      console.warn('지도 메시지 처리 오류:', error);
    }
  };

  return (
    <View style={[styles.container, style]} {...props}>
      <WebView
        source={{ html: generateMapHTML() }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>🗺️ 지도를 불러오는 중...</Text>
          </View>
        )}
        renderError={() => (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>지도를 불러올 수 없습니다</Text>
            <Text style={styles.errorSubtext}>네트워크 연결을 확인해주세요</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default WebMap;
