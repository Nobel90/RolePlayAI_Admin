// R2 Sync Service - Detects build types, versions, and DLCs from R2 bucket
// Enhanced to read DLC metadata from manifest files

import type { DLC, DLCType, DLCLevel } from '../types/dlc';
import { detectDLCTypeFromFolderName, generateDisplayNameFromFolderName } from '../types/dlc';
import type { DLCCatalogEntry } from '../types/catalog';

const R2_BASE_URL = 'https://pub-f87e49b41fad4c0fad84e94d65ed13cc.r2.dev';

export interface R2DLCInfo {
    folderName: string;
    version: string;
    manifestUrl: string;
    // Enhanced metadata from manifest
    type?: DLCType;
    level?: DLCLevel;
    name?: string;
    parentId?: string;
    parentVersion?: string;
    requiredBaseVersion?: string;
    description?: string;
    iconUrl?: string;
    size?: number;
    requiredDLCs?: Array<{ id: string; minVersion: string }>;
}

export interface R2SyncPreview {
    buildType: 'production' | 'staging';
    version: {
        current: string | null;
        r2: string | null;
        action: 'add' | 'update' | 'none';
    };
    dlcs: {
        new: R2DLCInfo[];
        updated: Array<R2DLCInfo & { currentVersion: string }>;
        existing: R2DLCInfo[];
    };
}

export interface R2SyncResult {
    success: boolean;
    preview?: R2SyncPreview;
    error?: string;
}

/**
 * Detect build types by trying to read manifests from known build types
 */
export async function detectBuildTypes(): Promise<('production' | 'staging')[]> {
    const buildTypes: ('production' | 'staging')[] = [];
    
    for (const buildType of ['production', 'staging'] as const) {
        try {
            const manifestUrl = `${R2_BASE_URL}/${buildType}/roleplayai_manifest.json`;
            const response = await fetch(manifestUrl, { method: 'HEAD' });
            if (response.ok) {
                buildTypes.push(buildType);
            }
        } catch (error) {
            console.log(`Build type ${buildType} not found in R2`);
        }
    }
    
    return buildTypes;
}

/**
 * Read version from R2 manifest for a specific build type
 */
export async function detectVersion(buildType: 'production' | 'staging'): Promise<string | null> {
    try {
        const manifestUrl = `${R2_BASE_URL}/${buildType}/roleplayai_manifest.json`;
        const response = await fetch(manifestUrl);
        
        if (!response.ok) {
            return null;
        }
        
        const manifest = await response.json();
        return manifest.version || null;
    } catch (error) {
        console.error(`Error reading version for ${buildType}:`, error);
        return null;
    }
}

/**
 * Catalog.json cache (avoids refetching for 5 minutes)
 */
let catalogCache: any = null;
let catalogCacheTime = 0;
const CATALOG_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch catalog.json from R2 (with caching)
 */
async function fetchCatalog(): Promise<any | null> {
    const now = Date.now();
    
    // Return cached catalog if still valid
    if (catalogCache && (now - catalogCacheTime) < CATALOG_CACHE_DURATION) {
        return catalogCache;
    }
    
    try {
        const catalogUrl = `${R2_BASE_URL}/catalog.json?t=${now}`; // Cache busting
        const response = await fetch(catalogUrl);
        
        if (response.ok) {
            catalogCache = await response.json();
            catalogCacheTime = now;
            console.log('[R2Sync] Catalog.json fetched and cached');
            return catalogCache;
        }
    } catch (error) {
        console.log('[R2Sync] Could not fetch catalog.json (will skip versioned lookup)');
    }
    
    return null;
}

/**
 * Read DLC manifest and extract full metadata
 * OPTIMIZED: Uses catalog.json instead of checking 100+ versions
 * Strategy: 1) Try unversioned path 2) Check catalog.json 3) Return null if not found
 */
export async function readDLCManifest(
    buildType: 'production' | 'staging',
    folderName: string
): Promise<R2DLCInfo | null> {
    // Strategy 1: Try unversioned manifest first (most common case)
    let manifestUrl = `${R2_BASE_URL}/${buildType}/${folderName}/manifest.json`;
    
    try {
        const response = await fetch(manifestUrl);
        if (response.ok) {
            const manifest = await response.json();
            return extractDLCInfoFromManifest(manifest, folderName, manifestUrl);
        }
    } catch (error) {
        // Unversioned not found, continue to catalog lookup
    }
    
    // Strategy 2: Check catalog.json for known manifest URL
    const catalog = await fetchCatalog();
    if (catalog?.builds?.[buildType]?.dlcs) {
        const catalogDLC = catalog.builds[buildType].dlcs.find(
            (dlc: any) => dlc.folderName === folderName || dlc.id === folderName
        );
        
        if (catalogDLC?.manifestUrl) {
            // Use the exact manifestUrl from catalog.json
            try {
                const response = await fetch(catalogDLC.manifestUrl);
                if (response.ok) {
                    const manifest = await response.json();
                    console.log(`[R2Sync] Found ${folderName} via catalog.json: ${catalogDLC.manifestUrl}`);
                    return extractDLCInfoFromManifest(manifest, folderName, catalogDLC.manifestUrl);
                }
            } catch (error) {
                console.log(`[R2Sync] Catalog manifest URL failed for ${folderName}`);
            }
        }
    }
    
    // DLC not found - return null (no 100+ version checks!)
    return null;
}

/**
 * Extract DLC info from manifest, handling both old and new formats
 */
function extractDLCInfoFromManifest(
    manifest: any,
    folderName: string,
    manifestUrl: string
): R2DLCInfo {
    const dlcMetadata = manifest.dlc || {};
    const detectedType = detectDLCTypeFromFolderName(folderName);
    
    // Calculate total size from files
    let totalSize = 0;
    if (manifest.files && Array.isArray(manifest.files)) {
        totalSize = manifest.files.reduce((sum: number, file: any) => sum + (file.totalSize || 0), 0);
    }
    
    return {
        folderName: dlcMetadata.folderName || folderName,
        version: manifest.version || '1.0.0',
        manifestUrl,
        // Use manifest metadata if available, otherwise detect from folder name
        type: dlcMetadata.type || detectedType.type,
        level: dlcMetadata.level || detectedType.level,
        name: dlcMetadata.name || generateDisplayNameFromFolderName(folderName),
        parentId: dlcMetadata.parentId || detectedType.parentId,
        parentVersion: dlcMetadata.parentVersion,
        requiredBaseVersion: dlcMetadata.requiredBaseVersion,
        description: dlcMetadata.description || '',
        iconUrl: dlcMetadata.iconUrl || '',
        size: totalSize,
        requiredDLCs: dlcMetadata.requiredDLCs || []
    };
}

/**
 * Detect DLCs from R2 for a specific build type
 * Enhanced to read full metadata from manifest files
 */
export async function detectDLCs(
    buildType: 'production' | 'staging',
    knownDLCs?: Record<string, { folderName: string; version?: string }>
): Promise<R2DLCInfo[]> {
    const detectedDLCs: R2DLCInfo[] = [];
    const checkedFolders = new Set<string>();
    
    console.log(`[R2Sync] Detecting DLCs for build type: ${buildType}`);
    
    // First, check known DLCs
    if (knownDLCs) {
        console.log(`[R2Sync] Checking ${Object.keys(knownDLCs).length} known DLCs`);
        for (const dlc of Object.values(knownDLCs)) {
            if (!dlc.folderName) continue;
            checkedFolders.add(dlc.folderName);
            
            const dlcInfo = await readDLCManifest(buildType, dlc.folderName);
            if (dlcInfo) {
                console.log(`[R2Sync] Found known DLC: ${dlc.folderName} v${dlcInfo.version} (type: ${dlcInfo.type})`);
                detectedDLCs.push(dlcInfo);
            }
        }
    }
    
    // Discovery patterns for new DLCs
    const commonDLCPatterns = [
        'DLC_Hospital',
        'DLC_Hospital_Betty',
        'DLC_Hospital_David',
        'DLC_Hospital_Joshua',
        'DLC_Hospital_Rachael',
        'DLC_Office',
        'DLC_School',
        'DLC_Home',
        // Add more patterns as needed
    ];
    
    console.log(`[R2Sync] Discovering new DLCs using ${commonDLCPatterns.length} patterns...`);
    
    for (const pattern of commonDLCPatterns) {
        if (checkedFolders.has(pattern)) {
            continue;
        }
        
        const dlcInfo = await readDLCManifest(buildType, pattern);
        if (dlcInfo) {
            console.log(`[R2Sync] ✓ Discovered: ${pattern} v${dlcInfo.version} (type: ${dlcInfo.type}, level: ${dlcInfo.level})`);
            detectedDLCs.push(dlcInfo);
        }
    }
    
    console.log(`[R2Sync] Detection complete. Found ${detectedDLCs.length} DLC(s)`);
    return detectedDLCs;
}

// Removed findDLCVersions and compareVersions - no longer needed
// We now use catalog.json lookup instead of checking 100+ version patterns

/**
 * Preview sync changes from R2 for a specific build type
 * Enhanced to include full DLC metadata
 */
export async function previewSyncChanges(
    buildType: 'production' | 'staging',
    currentVersion: string | null | undefined,
    currentDLCs: Record<string, { folderName: string; version: string }>
): Promise<R2SyncPreview> {
    const preview: R2SyncPreview = {
        buildType,
        version: {
            current: currentVersion || null,
            r2: null,
            action: 'none'
        },
        dlcs: {
            new: [],
            updated: [],
            existing: []
        }
    };
    
    // Detect base game version
    const r2Version = await detectVersion(buildType);
    if (r2Version) {
        preview.version.r2 = r2Version;
        if (!currentVersion) {
            preview.version.action = 'add';
        } else if (r2Version !== currentVersion) {
            preview.version.action = 'update';
        }
    }
    
    // Detect DLCs with full metadata
    const r2DLCs = await detectDLCs(buildType, currentDLCs);
    const currentDLCsByFolder = Object.fromEntries(
        Object.entries(currentDLCs).map(([id, dlc]) => [dlc.folderName, { id, ...dlc }])
    );
    
    for (const r2DLC of r2DLCs) {
        const existingDLC = currentDLCsByFolder[r2DLC.folderName];
        
        if (!existingDLC) {
            // New DLC
            preview.dlcs.new.push(r2DLC);
        } else if (existingDLC.version !== r2DLC.version) {
            // Updated DLC
            preview.dlcs.updated.push({
                ...r2DLC,
                currentVersion: existingDLC.version
            });
        } else {
            // Existing DLC (no change)
            preview.dlcs.existing.push(r2DLC);
        }
    }
    
    return preview;
}

/**
 * Convert R2DLCInfo to DLC type for Firebase storage
 * Note: We explicitly omit undefined fields to avoid Firebase errors
 */
export function r2DLCInfoToDLC(info: R2DLCInfo): DLC {
    const dlc: DLC = {
        id: info.folderName,
        name: info.name || info.folderName,
        type: info.type || 'environment',
        level: info.level || 1,
        version: info.version,
        manifestUrl: info.manifestUrl,
        installPath: 'Content/Paks',
        folderName: info.folderName,
        description: info.description || '',
        size: info.size || 0,
        iconUrl: info.iconUrl || '',
        requiredDLCs: info.requiredDLCs || [],
        enabled: true,
        metadata: {
            detectedFromR2: true,
            lastSyncedAt: new Date()
        }
    };
    
    // Only add optional fields if they have values (avoid undefined in Firebase)
    if (info.parentId) dlc.parentId = info.parentId;
    if (info.parentVersion) dlc.parentVersion = info.parentVersion;
    if (info.requiredBaseVersion) dlc.requiredBaseVersion = info.requiredBaseVersion;
    
    return dlc;
}

/**
 * Convert R2DLCInfo to DLCCatalogEntry for catalog publishing
 */
export function r2DLCInfoToCatalogEntry(info: R2DLCInfo): DLCCatalogEntry {
    return {
        id: info.folderName,
        name: info.name || info.folderName,
        folderName: info.folderName,
        type: info.type || 'environment',
        level: info.level || 1,
        parentId: info.parentId || null,
        parentVersion: info.parentVersion || null,
        version: info.version,
        manifestUrl: info.manifestUrl,
        requiredBaseVersion: info.requiredBaseVersion || null,
        requiredDLCs: info.requiredDLCs || [],
        description: info.description || '',
        iconUrl: info.iconUrl || '',
        size: info.size || 0,
        enabled: true
    };
}
