// Babel konfigurācija sagatavo Expo un React Native koda transformāciju.
// Šeit tiek pieslēgti nepieciešamie spraudņi, lai lietotne korekti darbotos izstrādes un būvēšanas laikā.
module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-worklets/plugin'],
  };
};
