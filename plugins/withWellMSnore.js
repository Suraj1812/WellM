const { withAndroidManifest, withInfoPlist } = require('expo/config-plugins');

function withWellMSnore(config) {
  config = withAndroidManifest(config, (result) => {
    const application = result.modResults.manifest.application[0];
    application.$['android:allowBackup'] = 'false';
    application.$['android:fullBackupContent'] = 'false';
    return result;
  });

  return withInfoPlist(config, (result) => {
    result.modResults.NSMicrophoneUsageDescription =
      'WellM listens for snoring on this phone. Sound is processed locally, and only the loudest 10 seconds are saved.';
    result.modResults.UIBackgroundModes = [
      ...new Set([...(result.modResults.UIBackgroundModes || []), 'audio']),
    ];
    return result;
  });
}

module.exports = withWellMSnore;
