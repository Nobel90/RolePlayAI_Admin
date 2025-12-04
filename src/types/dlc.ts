// DLC Type Definitions

export type DLCType = "environment" | "character";
export type DLCLevel = 1 | 2;

export type DLC = {
    id: string;
    name: string;
    type: DLCType;
    level: DLCLevel; // 1 = Environment, 2 = Character
    parentId?: string; // For character DLCs, references parent environment
    parentVersion?: string; // Required version of parent DLC
    version: string;
    manifestUrl: string; // URL to chunk-based manifest
    installPath: string; // Relative path in Plugins folder (default: "Content/Paks")
    folderName: string; // e.g., "DLC_Hospital" or "DLC_Hospital_Rachael"
    description?: string;
    size?: number; // Total size in bytes
    iconUrl?: string;
    requiredBaseVersion?: string; // Minimum base game version
    requiredDLCs?: Array<{ id: string; minVersion: string }>; // DLC dependencies
    enabled: boolean;
    metadata?: {
        createdAt?: any;
        updatedAt?: any;
        detectedFromR2?: boolean;
        lastSyncedAt?: any;
    };
};

export type DLCFormData = {
    name: string;
    type: DLCType;
    level?: DLCLevel;
    parentId?: string;
    parentVersion?: string;
    version: string;
    manifestUrl: string;
    folderName: string;
    description: string;
    iconUrl: string;
    requiredBaseVersion: string;
    enabled: boolean;
};

// Helper to determine DLC type from folder name
export function detectDLCTypeFromFolderName(folderName: string): { type: DLCType; level: DLCLevel; parentId?: string } {
    if (!folderName.startsWith('DLC_')) {
        return { type: 'environment', level: 1 };
    }
    
    const nameWithoutPrefix = folderName.substring(4); // Remove "DLC_"
    const parts = nameWithoutPrefix.split('_');
    
    if (parts.length === 1) {
        // Single part = Environment (e.g., DLC_Hospital)
        return { type: 'environment', level: 1 };
    } else {
        // Multiple parts = Character (e.g., DLC_Hospital_Rachael)
        const parentName = `DLC_${parts[0]}`;
        return { type: 'character', level: 2, parentId: parentName };
    }
}

// Helper to generate display name from folder name
export function generateDisplayNameFromFolderName(folderName: string): string {
    if (!folderName.startsWith('DLC_')) {
        return folderName;
    }
    
    const nameWithoutPrefix = folderName.substring(4);
    const parts = nameWithoutPrefix.split('_');
    
    if (parts.length === 1) {
        // Environment: "Hospital" -> "Hospital Environment"
        return `${parts[0]} Environment`;
    } else {
        // Character: "Hospital_Rachael" -> "Rachael (Hospital)"
        const environment = parts[0];
        const character = parts.slice(1).join(' ');
        return `${character} (${environment})`;
    }
}

// Convert DLC to form data for editing
export function dlcToFormData(dlc: DLC): DLCFormData {
    return {
        name: dlc.name,
        type: dlc.type,
        level: dlc.level,
        parentId: dlc.parentId,
        parentVersion: dlc.parentVersion,
        version: dlc.version,
        manifestUrl: dlc.manifestUrl,
        folderName: dlc.folderName,
        description: dlc.description || '',
        iconUrl: dlc.iconUrl || '',
        requiredBaseVersion: dlc.requiredBaseVersion || '',
        enabled: dlc.enabled
    };
}

// Create DLC from form data
export function formDataToDLC(formData: DLCFormData, existingDLC?: Partial<DLC>): DLC {
    const typeInfo = detectDLCTypeFromFolderName(formData.folderName);
    
    return {
        id: existingDLC?.id || formData.folderName,
        name: formData.name,
        type: formData.type || typeInfo.type,
        level: formData.level || typeInfo.level,
        parentId: formData.parentId || typeInfo.parentId,
        parentVersion: formData.parentVersion,
        version: formData.version,
        manifestUrl: formData.manifestUrl,
        installPath: existingDLC?.installPath || 'Content/Paks',
        folderName: formData.folderName,
        description: formData.description,
        iconUrl: formData.iconUrl,
        requiredBaseVersion: formData.requiredBaseVersion || undefined,
        requiredDLCs: formData.parentId && formData.parentVersion 
            ? [{ id: formData.parentId, minVersion: formData.parentVersion }] 
            : [],
        enabled: formData.enabled,
        metadata: {
            ...existingDLC?.metadata,
            updatedAt: new Date()
        }
    };
}
