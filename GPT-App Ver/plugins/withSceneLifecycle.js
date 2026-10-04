/**
 * Adopts the UIKit scene lifecycle for Expo SDK 57 so iOS 27 does not kill
 * the app at launch for missing UIScene adoption.
 *
 * Applies the verified manual fix on every `npx expo prebuild`:
 * 1. AppDelegate conforms to ExpoReactNativeFactoryProvider
 * 2. Legacy UIWindow / startReactNative startup is removed (scene delegate owns it)
 * 3. Info.plist points UIApplicationSceneManifest at EXExpoAppSceneDelegate
 */

const { withAppDelegate, withInfoPlist, createRunOncePlugin } = require('expo/config-plugins');

const PLUGIN_NAME = 'withSceneLifecycle';

const ORIGINAL_APP_DELEGATE = 'class AppDelegate: ExpoAppDelegate {';
const SCENE_APP_DELEGATE = 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {';

/** Matches the SDK 57 template window creation line. */
const WINDOW_STATEMENT = /^[ \t]*window = UIWindow\(frame: UIScreen\.main\.bounds\)\r?\n/m;
/**
 * Matches factory.startReactNative(...) whether written on one line or the
 * multi-line form from the published bare-minimum template.
 */
const START_STATEMENT = /^[ \t]*factory\.startReactNative\([\s\S]*?\)\r?\n/m;
/** Left behind after removing the two statements inside the template #if wrapper. */
const EMPTY_OS_WRAPPER = /^[ \t]*#if os\(iOS\) \|\| os\(tvOS\)\r?\n[ \t]*#endif\r?\n/m;
const BLANK_LINES_AFTER_FACTORY = /(reactNativeFactory = factory\r?\n)(?:[ \t]*\r?\n)+/;

const SCENE_MANIFEST = {
  UIApplicationSupportsMultipleScenes: false,
  UISceneConfigurations: {
    UIWindowSceneSessionRoleApplication: [
      {
        UISceneConfigurationName: 'Default Configuration',
        UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
      },
    ],
  },
};

function hasWindowStatement(contents) {
  WINDOW_STATEMENT.lastIndex = 0;
  return WINDOW_STATEMENT.test(contents);
}

function hasStartStatement(contents) {
  START_STATEMENT.lastIndex = 0;
  return START_STATEMENT.test(contents);
}

function isOwnedManifest(manifest) {
  return JSON.stringify(manifest) === JSON.stringify(SCENE_MANIFEST);
}

function updateAppDelegate(contents) {
  const alreadyConforms = contents.includes(SCENE_APP_DELEGATE);
  const hasLegacyWindow = hasWindowStatement(contents);
  const hasLegacyStart = hasStartStatement(contents);

  // Idempotent: already adopted and no legacy startup left.
  if (alreadyConforms && !hasLegacyWindow && !hasLegacyStart) {
    return contents;
  }

  if (!contents.includes(ORIGINAL_APP_DELEGATE) && !alreadyConforms) {
    throw new Error(
      `[${PLUGIN_NAME}] Expected AppDelegate to declare ` +
        `"${ORIGINAL_APP_DELEGATE}" or already conform to ExpoReactNativeFactoryProvider. ` +
        `The Expo prebuild template may have changed; update this plugin.`
    );
  }

  if (!hasLegacyWindow || !hasLegacyStart) {
    throw new Error(
      `[${PLUGIN_NAME}] Expected both UIWindow creation and factory.startReactNative(...) ` +
        `in AppDelegate.didFinishLaunchingWithOptions. Found window=${hasLegacyWindow}, ` +
        `startReactNative=${hasLegacyStart}. The Expo prebuild template may have changed; update this plugin.`
    );
  }

  let next = contents;
  if (!alreadyConforms) {
    next = next.replace(ORIGINAL_APP_DELEGATE, SCENE_APP_DELEGATE);
  }

  next = next
    .replace(WINDOW_STATEMENT, '')
    .replace(START_STATEMENT, '')
    .replace(EMPTY_OS_WRAPPER, '')
    .replace(BLANK_LINES_AFTER_FACTORY, '$1\n');

  if (!next.includes(SCENE_APP_DELEGATE)) {
    throw new Error(
      `[${PLUGIN_NAME}] Failed to add ExpoReactNativeFactoryProvider conformance to AppDelegate.`
    );
  }
  if (hasWindowStatement(next) || /factory\.startReactNative\(/.test(next)) {
    throw new Error(
      `[${PLUGIN_NAME}] Failed to remove the legacy startReactNative startup block from AppDelegate.`
    );
  }

  return next;
}

const withSceneLifecycleAppDelegate = (config) =>
  withAppDelegate(config, (config) => {
    if (config.modResults.language !== 'swift') {
      throw new Error(
        `[${PLUGIN_NAME}] Requires the standard Expo SDK 57 Swift AppDelegate ` +
          `(found language=${config.modResults.language}).`
      );
    }
    config.modResults.contents = updateAppDelegate(config.modResults.contents);
    return config;
  });

const withSceneLifecycleInfoPlist = (config) =>
  withInfoPlist(config, (config) => {
    const existing = config.modResults.UIApplicationSceneManifest;
    if (existing !== undefined && !isOwnedManifest(existing)) {
      throw new Error(
        `[${PLUGIN_NAME}] Cannot set UIApplicationSceneManifest because it is already declared ` +
          `with a different value. Resolve the conflict before enabling this plugin.`
      );
    }
    config.modResults.UIApplicationSceneManifest = SCENE_MANIFEST;
    return config;
  });

function withSceneLifecycle(config) {
  config = withSceneLifecycleAppDelegate(config);
  config = withSceneLifecycleInfoPlist(config);
  return config;
}

module.exports = createRunOncePlugin(withSceneLifecycle, PLUGIN_NAME, '1.0.0');
