#!/bin/sh
# Build the Release app and install it on a USB-connected iPhone.
# Free Apple IDs sign apps for 7 days, so rerun this before they expire.
#   APPLE_TEAM_ID=XXXXXXXXXX IOS_BUNDLE_ID=com.you.naanstaap DEVICE_ID=<udid> ./scripts/install-iphone.sh
# Find DEVICE_ID with: xcrun devicectl list devices
set -e
: "${APPLE_TEAM_ID:?Set APPLE_TEAM_ID}"
: "${IOS_BUNDLE_ID:?Set IOS_BUNDLE_ID}"
: "${DEVICE_ID:?Set DEVICE_ID}"
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 APPLE_TEAM_ID IOS_BUNDLE_ID

cd "$(dirname "$0")/.."
if [ ! -d ios ]; then
  CI=1 npx expo prebuild --platform ios
fi
(cd ios && pod install)

xcodebuild -workspace ios/NaanStaap.xcworkspace -scheme NaanStaap \
  -configuration Release -destination "id=$DEVICE_ID" \
  -derivedDataPath ios/build/dd -allowProvisioningUpdates \
  DEVELOPMENT_TEAM="$APPLE_TEAM_ID" CODE_SIGN_STYLE=Automatic build

xcrun devicectl device install app --device "$DEVICE_ID" \
  ios/build/dd/Build/Products/Release-iphoneos/NaanStaap.app
echo "Installed on $DEVICE_ID"
