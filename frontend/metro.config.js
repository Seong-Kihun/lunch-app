const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 터널 모드 최적화 설정
config.resolver.platforms = ['ios', 'android', 'native', 'web'];
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// 웹에서 문제가 되는 네이티브 모듈들을 웹 호환 모듈로 교체
config.resolver.alias = {
  'react-native-maps': 'react-native-web-maps',
};

// 웹에서 제외할 모듈들
config.resolver.blockList = [
  /node_modules\/react-native-maps\/lib\/MapMarkerNativeComponent\.js$/,
  /node_modules\/react-native-maps\/lib\/MapViewNativeComponent\.js$/,
  /node_modules\/react-native-maps\/lib\/MapCalloutNativeComponent\.js$/,
  /node_modules\/react-native-maps\/lib\/MapPolylineNativeComponent\.js$/,
  /node_modules\/react-native-maps\/lib\/MapPolygonNativeComponent\.js$/,
  /node_modules\/react-native-maps\/lib\/MapCircleNativeComponent\.js$/,
];

// 터널 모드를 위한 서버 설정
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // 터널 모드에서 CORS 헤더 추가
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
      }
      
      return middleware(req, res, next);
    };
  },
};

module.exports = config;
