import Constants from 'expo-constants';

export interface AppVersionInfo {
  version: string;
  buildNumber?: string;
  appName: string;
  formattedVersion: string;
}

export class VersionService {
  /**
   * Get app version information from Expo Constants
   */
  static getVersionInfo(): AppVersionInfo {
    const expoConfig = Constants.expoConfig;

    // Try to get version from expoConfig, fallback to default
    const version = expoConfig?.version || '1.0.0';
    const appName = expoConfig?.name || 'PolyLingo';

    // Build number (iOS) or version code (Android)
    const buildNumber =
      Constants.nativeAppVersion || Constants.nativeBuildVersion;

    return {
      version,
      buildNumber,
      appName,
      formattedVersion: `v${version}${buildNumber ? ` (${buildNumber})` : ''}`,
    };
  }

  /**
   * Get formatted version string for display
   */
  static getFormattedVersion(): string {
    return this.getVersionInfo().formattedVersion;
  }

  /**
   * Get app name
   */
  static getAppName(): string {
    return this.getVersionInfo().appName;
  }

  /**
   * Get raw version number
   */
  static getVersion(): string {
    return this.getVersionInfo().version;
  }

  /**
   * Get build information
   */
  static getBuildInfo(): string {
    const { version, buildNumber } = this.getVersionInfo();
    const buildDate = new Date().toISOString().split('T')[0]; // Current date as build date

    return `Version ${version}${
      buildNumber ? ` (Build ${buildNumber})` : ''
    }\nBuilt on ${buildDate}`;
  }
}
