// Launcher Settings Type Definitions

import type { DLC } from './dlc';

export interface HeaderLink {
    text: string;
    url: string;
    order: number;
}

export interface BackgroundImage {
    url: string;
    order: number;
}

export interface BuildTypeData {
    version?: string;
    dlcs?: Record<string, DLC>;
}

export interface R2Config {
    endpoint?: string;
    accountId?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    bucket?: string;
}

export interface LauncherSettings {
    appId?: string;
    name?: string;
    ui: {
        gameTitle: string;
        tagline: string;
        buttons: Record<string, string>;
        backgroundImageUrl?: string;
        backgroundImages?: BackgroundImage[];
        backgroundTransitionTime?: number;
        backgroundDisplayTime?: number;
        logoUrl?: string;
        gameName?: string;
        headerLinks?: HeaderLink[];
    };
    news: {
        active: boolean;
        text: string;
    };
    // New structure: buildTypes with nested data
    buildTypes?: {
        production?: BuildTypeData;
        staging?: BuildTypeData;
    };
    // R2 Configuration for catalog upload
    r2Config?: R2Config;
    // Legacy fields (for migration compatibility)
    version?: string;
    dlcs?: Record<string, DLC>;
    metadata?: {
        createdAt?: any;
        updatedAt?: any;
    };
    // Catalog backup
    lastCatalog?: any;
    lastCatalogUpdated?: string;
}

