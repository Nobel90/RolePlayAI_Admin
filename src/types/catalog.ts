// Catalog Type Definitions
// Master catalog structure for R2 bucket

export interface Catalog {
    catalogVersion: string;
    lastUpdated: string;
    generatedBy: string; // "admin-site" or "uploader"
    builds: {
        production?: BuildCatalog;
        staging?: BuildCatalog;
    };
}

export interface BuildCatalog {
    baseGame: BaseGameInfo;
    dlcs: DLCCatalogEntry[];
}

export interface BaseGameInfo {
    version: string;
    manifestUrl: string;
    minLauncherVersion: string;
    lastUpdated?: string;
}

export interface DLCCatalogEntry {
    id: string;
    name: string;
    folderName: string;
    type: 'environment' | 'character';
    level: 1 | 2;
    parentId: string | null;
    parentVersion: string | null;
    version: string;
    manifestUrl: string;
    requiredBaseVersion: string | null;
    requiredDLCs: Array<{ id: string; minVersion: string }>;
    description: string;
    iconUrl: string;
    size: number;
    enabled: boolean;
}

// Helper type for DLC hierarchy display
export interface DLCHierarchyNode {
    dlc: DLCCatalogEntry;
    children: DLCHierarchyNode[];
}

// Build DLC hierarchy from flat list
export function buildDLCHierarchy(dlcs: DLCCatalogEntry[]): DLCHierarchyNode[] {
    const environments = dlcs.filter(d => d.type === 'environment' || d.level === 1);
    const characters = dlcs.filter(d => d.type === 'character' || d.level === 2);
    
    const hierarchy: DLCHierarchyNode[] = [];
    
    // Build environment nodes with their children
    for (const env of environments) {
        const children = characters
            .filter(c => c.parentId === env.id || c.parentId === env.folderName)
            .map(c => ({ dlc: c, children: [] }));
        
        hierarchy.push({
            dlc: env,
            children
        });
    }
    
    // Find orphaned characters (no parent found)
    const assignedCharacterIds = new Set(
        hierarchy.flatMap(h => h.children.map(c => c.dlc.id))
    );
    
    const orphanedCharacters = characters.filter(c => !assignedCharacterIds.has(c.id));
    
    // Add orphaned characters as top-level nodes
    for (const orphan of orphanedCharacters) {
        hierarchy.push({
            dlc: { ...orphan, type: 'character' as const },
            children: []
        });
    }
    
    return hierarchy;
}

// Convert DLC type from manifest to catalog entry
export function manifestDLCToCatalogEntry(
    manifest: any,
    folderName: string,
    manifestUrl: string
): DLCCatalogEntry {
    const dlcInfo = manifest.dlc || {};
    
    return {
        id: dlcInfo.id || folderName,
        name: dlcInfo.name || folderName,
        folderName: dlcInfo.folderName || folderName,
        type: dlcInfo.type || 'environment',
        level: dlcInfo.level || (dlcInfo.type === 'character' ? 2 : 1),
        parentId: dlcInfo.parentId || null,
        parentVersion: dlcInfo.parentVersion || null,
        version: manifest.version || '1.0.0',
        manifestUrl: manifestUrl,
        requiredBaseVersion: dlcInfo.requiredBaseVersion || null,
        requiredDLCs: dlcInfo.requiredDLCs || [],
        description: dlcInfo.description || '',
        iconUrl: dlcInfo.iconUrl || '',
        size: calculateManifestSize(manifest),
        enabled: true
    };
}

// Calculate total size from manifest files
function calculateManifestSize(manifest: any): number {
    if (!manifest.files || !Array.isArray(manifest.files)) {
        return 0;
    }
    
    return manifest.files.reduce((total: number, file: any) => {
        return total + (file.totalSize || 0);
    }, 0);
}

// Create empty catalog
export function createEmptyCatalog(): Catalog {
    return {
        catalogVersion: '1.0',
        lastUpdated: new Date().toISOString(),
        generatedBy: 'admin-site',
        builds: {}
    };
}
