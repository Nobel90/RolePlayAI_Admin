// Migration utility to convert legacy Firebase structure to buildTypes structure

import type { LauncherSettings } from '../types/settings';

/**
 * Migrates legacy LauncherSettings to new buildTypes structure
 * If data already has buildTypes, returns as-is
 * If data has version/dlcs at root, migrates to buildTypes.production
 */
export function migrateToBuildTypes(data: any): LauncherSettings {
    // If already migrated (has buildTypes), return as-is
    if (data.buildTypes && (data.buildTypes.production || data.buildTypes.staging)) {
        return data as LauncherSettings;
    }

    // Create new structure
    const migrated: LauncherSettings = {
        ...data,
        buildTypes: {
            production: {},
            staging: {}
        }
    };

    // Migrate root-level version to buildTypes.production.version
    if (data.version) {
        migrated.buildTypes!.production!.version = data.version;
        // Remove from root after migration
        delete (migrated as any).version;
    }

    // Migrate root-level dlcs to buildTypes.production.dlcs
    if (data.dlcs && Object.keys(data.dlcs).length > 0) {
        migrated.buildTypes!.production!.dlcs = data.dlcs;
        // Remove from root after migration
        delete (migrated as any).dlcs;
    }

    // Ensure staging has empty structure
    if (!migrated.buildTypes!.staging) {
        migrated.buildTypes!.staging = {};
    }

    return migrated;
}

/**
 * Checks if data needs migration
 */
export function needsMigration(data: any): boolean {
    // Needs migration if:
    // 1. No buildTypes structure exists, OR
    // 2. Has version/dlcs at root level
    return !data.buildTypes || 
           (data.version !== undefined || (data.dlcs && Object.keys(data.dlcs).length > 0));
}

