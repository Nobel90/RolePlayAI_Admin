// Catalog Publisher Service
// Generates and publishes catalog.json to R2 bucket

import type { Catalog, BuildCatalog, DLCCatalogEntry } from '../types/catalog';
import type { DLC } from '../types/dlc';

const R2_BASE_URL = 'https://pub-f87e49b41fad4c0fad84e94d65ed13cc.r2.dev';

export interface CatalogPublishResult {
    success: boolean;
    catalogUrl?: string;
    error?: string;
    catalog?: Catalog;
}

/**
 * Generate a catalog structure from Firebase data
 */
export function generateCatalog(
    buildTypes: {
        production?: { version?: string; dlcs?: Record<string, DLC> };
        staging?: { version?: string; dlcs?: Record<string, DLC> };
    }
): Catalog {
    const catalog: Catalog = {
        catalogVersion: '1.0',
        lastUpdated: new Date().toISOString(),
        generatedBy: 'admin-site',
        builds: {}
    };

    // Generate production catalog
    if (buildTypes.production) {
        catalog.builds.production = generateBuildCatalog(
            'production',
            buildTypes.production.version,
            buildTypes.production.dlcs
        );
    }

    // Generate staging catalog
    if (buildTypes.staging) {
        catalog.builds.staging = generateBuildCatalog(
            'staging',
            buildTypes.staging.version,
            buildTypes.staging.dlcs
        );
    }

    return catalog;
}

/**
 * Generate catalog for a single build type
 */
function generateBuildCatalog(
    buildType: 'production' | 'staging',
    version?: string,
    dlcs?: Record<string, DLC>
): BuildCatalog {
    const buildCatalog: BuildCatalog = {
        baseGame: {
            version: version || '0.0.0',
            manifestUrl: `${R2_BASE_URL}/${buildType}/roleplayai_manifest.json`,
            minLauncherVersion: '1.0.0',
            lastUpdated: new Date().toISOString()
        },
        dlcs: []
    };

    if (dlcs) {
        // Convert DLCs to catalog entries and sort by hierarchy
        const dlcEntries = Object.values(dlcs)
            .filter(dlc => dlc.enabled) // Only include enabled DLCs
            .map(dlc => dlcToCatalogEntry(dlc, buildType))
            .sort((a, b) => {
                // Sort by level first (environments before characters)
                if (a.level !== b.level) {
                    return a.level - b.level;
                }
                // Then by name
                return a.name.localeCompare(b.name);
            });

        buildCatalog.dlcs = dlcEntries;
    }

    return buildCatalog;
}

/**
 * Convert DLC to catalog entry
 */
function dlcToCatalogEntry(dlc: DLC, buildType: 'production' | 'staging'): DLCCatalogEntry {
    // Determine the best manifest URL
    let manifestUrl = dlc.manifestUrl;
    if (!manifestUrl || !manifestUrl.startsWith('http')) {
        // Generate URL if not provided
        manifestUrl = `${R2_BASE_URL}/${buildType}/${dlc.folderName}/manifest.json`;
    }

    return {
        id: dlc.id || dlc.folderName,
        name: dlc.name,
        folderName: dlc.folderName,
        type: dlc.type,
        level: dlc.level || (dlc.type === 'character' ? 2 : 1),
        parentId: dlc.parentId || null,
        parentVersion: dlc.parentVersion || null,
        version: dlc.version,
        manifestUrl: manifestUrl,
        requiredBaseVersion: dlc.requiredBaseVersion || null,
        requiredDLCs: dlc.requiredDLCs || (dlc.parentId && dlc.parentVersion 
            ? [{ id: dlc.parentId, minVersion: dlc.parentVersion }] 
            : []),
        description: dlc.description || '',
        iconUrl: dlc.iconUrl || '',
        size: dlc.size || 0,
        enabled: dlc.enabled
    };
}

/**
 * Preview the catalog that would be published
 */
export function previewCatalog(
    buildTypes: {
        production?: { version?: string; dlcs?: Record<string, DLC> };
        staging?: { version?: string; dlcs?: Record<string, DLC> };
    }
): Catalog {
    return generateCatalog(buildTypes);
}

/**
 * Get catalog summary for display
 */
export function getCatalogSummary(catalog: Catalog): {
    production: { version: string; dlcCount: number; envCount: number; charCount: number } | null;
    staging: { version: string; dlcCount: number; envCount: number; charCount: number } | null;
} {
    const getSummary = (build?: BuildCatalog) => {
        if (!build) return null;
        const dlcs = build.dlcs || [];
        return {
            version: build.baseGame.version,
            dlcCount: dlcs.length,
            envCount: dlcs.filter(d => d.level === 1).length,
            charCount: dlcs.filter(d => d.level === 2).length
        };
    };

    return {
        production: getSummary(catalog.builds.production),
        staging: getSummary(catalog.builds.staging)
    };
}

/**
 * Validate catalog structure
 */
export function validateCatalog(catalog: Catalog): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!catalog.catalogVersion) {
        errors.push('Missing catalog version');
    }

    if (!catalog.lastUpdated) {
        errors.push('Missing lastUpdated timestamp');
    }

    // Validate each build
    for (const [buildType, buildCatalog] of Object.entries(catalog.builds)) {
        if (!buildCatalog) continue;

        // Check base game
        if (!buildCatalog.baseGame?.version) {
            errors.push(`${buildType}: Missing base game version`);
        }

        // Check DLCs
        const dlcs = buildCatalog.dlcs || [];
        const dlcIds = new Set<string>();

        for (const dlc of dlcs) {
            // Check for duplicate IDs
            if (dlcIds.has(dlc.id)) {
                errors.push(`${buildType}: Duplicate DLC ID: ${dlc.id}`);
            }
            dlcIds.add(dlc.id);

            // Check required fields
            if (!dlc.folderName) {
                errors.push(`${buildType}: DLC ${dlc.id} missing folderName`);
            }

            if (!dlc.version) {
                errors.push(`${buildType}: DLC ${dlc.id} missing version`);
            }

            // Check character DLC has parent
            if (dlc.level === 2 && !dlc.parentId) {
                errors.push(`${buildType}: Character DLC ${dlc.id} missing parentId`);
            }

            // Check parent exists if referenced
            if (dlc.parentId && !dlcs.some(d => d.id === dlc.parentId || d.folderName === dlc.parentId)) {
                errors.push(`${buildType}: DLC ${dlc.id} references non-existent parent: ${dlc.parentId}`);
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Format catalog for display (pretty JSON)
 */
export function formatCatalogJSON(catalog: Catalog): string {
    return JSON.stringify(catalog, null, 2);
}

/**
 * Get the catalog URL for a given R2 bucket
 */
export function getCatalogUrl(): string {
    return `${R2_BASE_URL}/catalog.json`;
}

/**
 * Fetch current catalog from R2
 */
export async function fetchCurrentCatalog(): Promise<Catalog | null> {
    try {
        const response = await fetch(getCatalogUrl());
        if (!response.ok) {
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching catalog:', error);
        return null;
    }
}

/**
 * Compare two catalogs and return differences
 */
export function compareCatalogs(
    current: Catalog | null,
    proposed: Catalog
): {
    hasChanges: boolean;
    changes: string[];
} {
    const changes: string[] = [];

    if (!current) {
        changes.push('Creating new catalog (none exists)');
        return { hasChanges: true, changes };
    }

    // Compare builds
    for (const buildType of ['production', 'staging'] as const) {
        const currentBuild = current.builds[buildType];
        const proposedBuild = proposed.builds[buildType];

        if (!currentBuild && proposedBuild) {
            changes.push(`Adding ${buildType} build`);
            continue;
        }

        if (currentBuild && !proposedBuild) {
            changes.push(`Removing ${buildType} build`);
            continue;
        }

        if (currentBuild && proposedBuild) {
            // Compare base game version
            if (currentBuild.baseGame.version !== proposedBuild.baseGame.version) {
                changes.push(`${buildType}: Base game version ${currentBuild.baseGame.version} → ${proposedBuild.baseGame.version}`);
            }

            // Compare DLC counts
            const currentDLCs = currentBuild.dlcs || [];
            const proposedDLCs = proposedBuild.dlcs || [];

            if (currentDLCs.length !== proposedDLCs.length) {
                changes.push(`${buildType}: DLC count ${currentDLCs.length} → ${proposedDLCs.length}`);
            }

            // Find new and removed DLCs
            const currentIds = new Set(currentDLCs.map(d => d.id));
            const proposedIds = new Set(proposedDLCs.map(d => d.id));

            for (const id of proposedIds) {
                if (!currentIds.has(id)) {
                    const dlc = proposedDLCs.find(d => d.id === id);
                    changes.push(`${buildType}: Adding DLC ${dlc?.name || id}`);
                }
            }

            for (const id of currentIds) {
                if (!proposedIds.has(id)) {
                    const dlc = currentDLCs.find(d => d.id === id);
                    changes.push(`${buildType}: Removing DLC ${dlc?.name || id}`);
                }
            }

            // Check for version updates
            for (const proposedDLC of proposedDLCs) {
                const currentDLC = currentDLCs.find(d => d.id === proposedDLC.id);
                if (currentDLC && currentDLC.version !== proposedDLC.version) {
                    changes.push(`${buildType}: ${proposedDLC.name} version ${currentDLC.version} → ${proposedDLC.version}`);
                }
            }
        }
    }

    return {
        hasChanges: changes.length > 0,
        changes
    };
}
