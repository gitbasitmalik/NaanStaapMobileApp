// Extends app.json so a personal device build can use its own Apple team and
// bundle ID without changing the store identifiers the client will publish with.
//   APPLE_TEAM_ID=XXXXXXXXXX IOS_BUNDLE_ID=com.example.naanstaap npx expo run:ios ...
module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    bundleIdentifier: process.env.IOS_BUNDLE_ID || config.ios.bundleIdentifier,
    appleTeamId: process.env.APPLE_TEAM_ID || config.ios.appleTeamId,
  },
});
