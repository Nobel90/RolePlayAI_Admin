import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, CheckCircle2, X, Download, Package, Users, AlertTriangle, Upload } from 'lucide-react';
import { detectDLCs, detectVersion, r2DLCInfoToDLC, type R2DLCInfo } from '../services/r2Sync';
import { generateCatalog } from '../services/catalogPublisher';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { DLC } from '../types/dlc';

interface R2SyncButtonProps {
    appId: string;
    buildType: 'production' | 'staging';
    currentVersion?: string | null;
    currentDLCs: Record<string, DLC>;
    onSyncComplete?: () => void;
}

interface SyncPreview {
    buildType: 'production' | 'staging';
    version: {
        current: string | null;
        r2: string | null;
    };
    detectedDLCs: R2DLCInfo[];
    currentDLCCount: number;
}

export function R2SyncButton({ appId, buildType, currentVersion, currentDLCs, onSyncComplete }: R2SyncButtonProps) {
    const [loading, setLoading] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [preview, setPreview] = useState<SyncPreview | null>(null);
    const [syncing, setSyncing] = useState(false);

    const handleSync = async () => {
        setLoading(true);
        try {
            // Detect version from R2
            const r2Version = await detectVersion(buildType);
            
            // Detect ALL DLCs from R2 (this is now the source of truth)
            const detectedDLCs = await detectDLCs(buildType, {});
            
            // Get current DLC count directly from Firebase (more reliable than prop)
            let currentDLCCount = Object.keys(currentDLCs).length;
            try {
                const appDoc = await getDoc(doc(db, "apps", appId));
                if (appDoc.exists()) {
                    const data = appDoc.data();
                    const buildTypeData = data.buildTypes?.[buildType];
                    const firebaseDLCs = buildTypeData?.dlcs || {};
                    currentDLCCount = Object.keys(firebaseDLCs).length;
                    console.log(`[R2Sync] Firebase has ${currentDLCCount} DLCs for ${buildType}`);
                }
            } catch (e) {
                console.warn('[R2Sync] Could not fetch Firebase DLC count, using prop:', e);
            }
            
            setPreview({
                buildType,
                version: {
                    current: currentVersion || null,
                    r2: r2Version
                },
                detectedDLCs,
                currentDLCCount
            });
            setShowPreview(true);
        } catch (error: any) {
            console.error('Error scanning R2:', error);
            alert('Failed to scan R2: ' + (error?.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    const handleApplySync = async () => {
        if (!preview) return;
        
        setSyncing(true);
        try {
            const appDoc = await getDoc(doc(db, "apps", appId));
            const currentData = appDoc.exists() ? appDoc.data() : {};
            
            // Get existing buildTypes, preserving the OTHER build type's data
            const existingBuildTypes = currentData.buildTypes || {};
            const otherBuildType = buildType === 'production' ? 'staging' : 'production';
            
            // Build new DLCs object from R2 data (COMPLETELY REPLACES existing)
            const newDLCs: Record<string, DLC> = {};
            
            for (const dlcInfo of preview.detectedDLCs) {
                const dlc = r2DLCInfoToDLC(dlcInfo);
                
                // Preserve enabled status if DLC existed before
                const existingDLC = Object.values(currentDLCs).find(
                    (d) => d.folderName === dlcInfo.folderName
                );
                if (existingDLC) {
                    dlc.enabled = existingDLC.enabled;
                }
                
                newDLCs[dlc.id] = dlc;
            }
            
            // Create COMPLETE new buildType data (not merged)
            const newBuildTypeData = {
                version: preview.version.r2 || existingBuildTypes[buildType]?.version || '0.0.0',
                dlcs: newDLCs  // This completely replaces old DLCs
            };
            
            // Build the complete buildTypes object
            const updatedBuildTypes = {
                [otherBuildType]: existingBuildTypes[otherBuildType] || {},
                [buildType]: newBuildTypeData
            };
            
            console.log(`[R2Sync] Saving ${Object.keys(newDLCs).length} DLCs to Firebase for ${buildType}`);
            console.log('[R2Sync] DLC IDs:', Object.keys(newDLCs));
            
            // Save to Firebase - use setDoc WITHOUT merge to fully replace buildTypes
            await setDoc(doc(db, "apps", appId), {
                ...currentData,
                buildTypes: updatedBuildTypes
            });  // NO merge: true - this replaces buildTypes entirely
            
            // Generate and save catalog to Firebase
            await saveCatalogToFirebase(appId, updatedBuildTypes);
            
            setShowPreview(false);
            setPreview(null);
            if (onSyncComplete) {
                onSyncComplete();
            }
            
            const dlcCount = preview.detectedDLCs.length;
            alert(`Sync completed!\n\n✓ ${dlcCount} DLC(s) synced to Firebase\n✓ Catalog generated and saved\n\nNote: The catalog.json in R2 is updated automatically when you add DLCs via the Uploader's "Add to Catalog" popup.`);
        } catch (error: any) {
            console.error('Error applying sync:', error);
            alert('Failed to apply sync: ' + (error?.message || 'Unknown error'));
        } finally {
            setSyncing(false);
        }
    };

    const saveCatalogToFirebase = async (appId: string, buildTypes: any) => {
        try {
            // Generate catalog from current buildTypes data
            const catalog = generateCatalog(buildTypes);
            
            console.log('Generated catalog:', catalog);
            
            // Store catalog in Firebase
            await setDoc(doc(db, "apps", appId), {
                lastCatalog: catalog,
                lastCatalogUpdated: new Date().toISOString()
            }, { merge: true });
            
            console.log('Catalog saved to Firebase successfully.');
            console.log('Note: To upload catalog.json to R2, use the "Add to Catalog" popup after uploading DLCs in the Uploader.');
            
            return catalog;
        } catch (error) {
            console.error('Error saving catalog:', error);
            throw error;
        }
    };

    const renderDLCInfo = (dlcInfo: R2DLCInfo) => {
        const isEnvironment = dlcInfo.type === 'environment' || dlcInfo.level === 1;
        
        return (
            <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isEnvironment ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-purple-500/20 border border-purple-500/30'
                }`}>
                    {isEnvironment ? (
                        <Package className="w-4 h-4 text-blue-400" />
                    ) : (
                        <Users className="w-4 h-4 text-purple-400" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white">{dlcInfo.name || dlcInfo.folderName}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            isEnvironment ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                        }`}>
                            Level {dlcInfo.level || (isEnvironment ? 1 : 2)}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{dlcInfo.folderName}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                        <span>v{dlcInfo.version}</span>
                        {dlcInfo.parentId && (
                            <span className="text-purple-400">
                                Requires: {dlcInfo.parentId}
                                {dlcInfo.parentVersion && ` ≥${dlcInfo.parentVersion}`}
                            </span>
                        )}
                        {dlcInfo.requiredBaseVersion && (
                            <span className="text-slate-500">Base ≥{dlcInfo.requiredBaseVersion}</span>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const hasDetectedContent = preview && preview.detectedDLCs.length > 0;
    const willClearDLCs = preview && preview.detectedDLCs.length === 0 && preview.currentDLCCount > 0;

    return (
        <>
            <Button
                variant="outline"
                onClick={handleSync}
                disabled={loading || syncing}
                className="border-blue-600/50 text-blue-400 hover:bg-blue-600/10 hover:text-blue-300"
            >
                {loading ? (
                    <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Scanning R2...
                    </>
                ) : (
                    <>
                        <Download className="w-4 h-4 mr-2" />
                        Sync from R2
                    </>
                )}
            </Button>

            {showPreview && preview && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <Card className="bg-slate-800 border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        R2 Sync Preview
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                            buildType === 'production' 
                                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                        }`}>
                                            {buildType.toUpperCase()}
                                        </span>
                                    </CardTitle>
                                    <CardDescription className="text-slate-400">
                                        R2 is the source of truth. All data will be synced from R2.
                                    </CardDescription>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setShowPreview(false);
                                        setPreview(null);
                                    }}
                                    className="text-slate-400 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Version Info */}
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Base Game Version</h3>
                                <div className="p-4 rounded-lg bg-slate-700/30 border border-slate-600/50">
                                    <div className="flex justify-between items-center">
                                        <div className="space-y-1">
                                            <p className="text-sm text-slate-400">
                                                Current: <span className="text-white font-mono">{preview.version.current || 'Not set'}</span>
                                            </p>
                                            <p className="text-sm text-slate-400">
                                                R2: <span className="text-white font-mono">{preview.version.r2 || 'Not found'}</span>
                                            </p>
                                        </div>
                                        {preview.version.r2 && (
                                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* DLCs Detected from R2 */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                                    DLCs Detected from R2 ({preview.detectedDLCs.length})
                                </h3>
                                
                                {preview.detectedDLCs.length > 0 ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                                            <p className="text-sm text-blue-400 font-medium">
                                                Will replace {preview.currentDLCCount} existing DLC(s) with {preview.detectedDLCs.length} from R2
                                            </p>
                                        </div>
                                        <div className="space-y-2 max-h-60 overflow-y-auto">
                                            {preview.detectedDLCs.map((dlc, idx) => (
                                                <div key={idx} className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                                                    {renderDLCInfo(dlc)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`p-4 rounded-lg border text-center ${
                                        willClearDLCs 
                                            ? 'bg-red-500/10 border-red-500/30' 
                                            : 'bg-slate-700/30 border-slate-600/50'
                                    }`}>
                                        <AlertTriangle className={`w-8 h-8 mx-auto mb-2 ${
                                            willClearDLCs ? 'text-red-400' : 'text-slate-500'
                                        }`} />
                                        <p className={`text-sm ${willClearDLCs ? 'text-red-400 font-medium' : 'text-slate-400'}`}>
                                            No DLCs found in R2 for {buildType}
                                        </p>
                                        {willClearDLCs ? (
                                            <p className="text-xs text-red-400/80 mt-1">
                                                ⚠️ This will CLEAR {preview.currentDLCCount} existing DLC(s) from Firebase
                                            </p>
                                        ) : (
                                            <p className="text-xs text-slate-500 mt-1">Upload DLCs using the Uploader tool first</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* What will happen */}
                            {(hasDetectedContent || willClearDLCs) && (
                                <div className={`p-4 rounded-lg border ${
                                    willClearDLCs 
                                        ? 'bg-red-500/10 border-red-500/30' 
                                        : 'bg-yellow-500/10 border-yellow-500/30'
                                }`}>
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                                            willClearDLCs ? 'text-red-400' : 'text-yellow-400'
                                        }`} />
                                        <div className={`text-sm ${willClearDLCs ? 'text-red-400' : 'text-yellow-400'}`}>
                                            <p className="font-medium mb-1">This will:</p>
                                            <ul className={`list-disc list-inside space-y-1 ${
                                                willClearDLCs ? 'text-red-400/80' : 'text-yellow-400/80'
                                            }`}>
                                                {willClearDLCs ? (
                                                    <>
                                                        <li><strong>CLEAR all {preview.currentDLCCount} DLC(s)</strong> from Firebase for {buildType}</li>
                                                        <li>R2 has 0 DLCs for this build type</li>
                                                        <li>Update version to {preview.version.r2 || 'current'}</li>
                                                    </>
                                                ) : (
                                                    <>
                                                        <li>Replace all DLC data in Firebase with R2 values</li>
                                                        <li>Update version to {preview.version.r2 || 'current'}</li>
                                                        <li>Generate and save catalog.json</li>
                                                        <li>Preserve only the "enabled" status of existing DLCs</li>
                                                    </>
                                                )}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2 justify-end pt-4 border-t border-slate-700">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowPreview(false);
                                        setPreview(null);
                                    }}
                                    className="border-slate-600 text-slate-300"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleApplySync}
                                    disabled={syncing || (!hasDetectedContent && !willClearDLCs)}
                                    className={`text-white ${
                                        willClearDLCs 
                                            ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700' 
                                            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                                    }`}
                                >
                                    {syncing ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                            Syncing...
                                        </>
                                    ) : willClearDLCs ? (
                                        <>
                                            <AlertTriangle className="w-4 h-4 mr-2" />
                                            Clear DLCs & Sync
                                        </>
                                    ) : hasDetectedContent ? (
                                        <>
                                            <Upload className="w-4 h-4 mr-2" />
                                            Sync & Update Catalog
                                        </>
                                    ) : (
                                        <>
                                            <AlertTriangle className="w-4 h-4 mr-2" />
                                            No Changes
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </>
    );
}
