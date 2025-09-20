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

    const buildNumber =
      Constants.nativeAppVersion || Constants.nativeBuildVersion;

    return {
      version,
      buildNumber,
      appName,
      formattedVersion: `v${version}${buildNumber ? ` (${buildNumber})` : ''}`,
    };
  }

  static getFormattedVersion(): string {
    return this.getVersionInfo().formattedVersion;
  }

  static getAppName(): string {
    return this.getVersionInfo().appName;
  }

  static getVersion(): string {
    return this.getVersionInfo().version;
  }

  static getBuildInfo(): string {
    const { version, buildNumber } = this.getVersionInfo();
    const buildDate = new Date().toISOString().split('T')[0]; // Current date as build date

    return `Version ${version}${
      buildNumber ? ` (Build ${buildNumber})` : ''
    }\nBuilt on ${buildDate}`;
  }
}
