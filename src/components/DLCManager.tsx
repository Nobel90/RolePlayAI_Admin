import { useState, useEffect } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Edit2, Package, Users, ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, Info, HardDrive } from 'lucide-react';
import { DLCForm } from './DLCForm';
import type { DLC, DLCFormData } from '../types/dlc';

interface DLCManagerProps {
    appId: string;
    buildType: 'production' | 'staging';
}

// Format bytes to human readable
function formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '—';
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let size = bytes;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function DLCManager({ appId, buildType }: DLCManagerProps) {
    const [dlcs, setDlcs] = useState<Record<string, DLC>>({});
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingDlc, setEditingDlc] = useState<DLC | undefined>(undefined);
    const [deletingDlc, setDeletingDlc] = useState<string | null>(null);
    const [expandedEnvs, setExpandedEnvs] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!appId) return;

        const loadDLCs = async () => {
            try {
                const appDoc = await getDoc(doc(db, "apps", appId));
                if (appDoc.exists()) {
                    const data = appDoc.data();
                    const buildTypes = data.buildTypes || {};
                    const buildTypeData = buildTypes[buildType] || {};
                    const legacyDlcs = data.dlcs || {};
                    
                    const loadedDlcs = buildTypeData.dlcs || (buildType === 'production' ? legacyDlcs : {});
                    setDlcs(loadedDlcs);
                    
                    // Auto-expand environments with characters
                    const envIds = Object.values(loadedDlcs as Record<string, DLC>)
                        .filter(d => d.type === 'environment')
                        .map(d => d.id);
                    setExpandedEnvs(new Set(envIds));
                }
            } catch (error: any) {
                console.error("Error loading DLCs:", error);
            } finally {
                setLoading(false);
            }
        };

        loadDLCs();
    }, [appId, buildType]);

    const saveDLC = async (dlcData: DLCFormData) => {
        try {
            const appDoc = await getDoc(doc(db, "apps", appId));
            const currentData = appDoc.exists() ? appDoc.data() : {};
            
            const buildTypes = currentData.buildTypes || {
                production: {},
                staging: {}
            };
            const buildTypeData = buildTypes[buildType] || {};
            const currentDlcs = buildTypeData.dlcs || {};

            const dlcId = editingDlc?.id || dlcData.folderName;
            const newDLC: DLC = {
                id: dlcId,
                name: dlcData.name,
                type: dlcData.type,
                level: dlcData.type === 'character' ? 2 : 1,
                parentId: dlcData.parentId,
                parentVersion: dlcData.parentVersion,
                version: dlcData.version,
                manifestUrl: dlcData.manifestUrl,
                installPath: 'Content/Paks',
                folderName: dlcData.folderName,
                description: dlcData.description,
                iconUrl: dlcData.iconUrl,
                requiredBaseVersion: dlcData.requiredBaseVersion,
                requiredDLCs: dlcData.parentId && dlcData.parentVersion 
                    ? [{ id: dlcData.parentId, minVersion: dlcData.parentVersion }]
                    : [],
                enabled: dlcData.enabled,
                metadata: editingDlc?.metadata ? {
                    ...editingDlc.metadata,
                    updatedAt: new Date()
                } : {
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            };

            await setDoc(doc(db, "apps", appId), {
                ...currentData,
                buildTypes: {
                    ...buildTypes,
                    [buildType]: {
                        ...buildTypeData,
                        dlcs: {
                            ...currentDlcs,
                            [dlcId]: newDLC
                        }
                    }
                }
            }, { merge: true });

            setDlcs({ ...currentDlcs, [dlcId]: newDLC });
            setShowForm(false);
            setEditingDlc(undefined);
        } catch (error: any) {
            console.error("Error saving DLC:", error);
            alert("Failed to save DLC: " + (error?.message || "Unknown error"));
        }
    };

    const deleteDLC = async (dlcId: string) => {
        try {
            const appDoc = await getDoc(doc(db, "apps", appId));
            const currentData = appDoc.exists() ? appDoc.data() : {};
            
            const buildTypes = currentData.buildTypes || {
                production: {},
                staging: {}
            };
            const buildTypeData = buildTypes[buildType] || {};
            const currentDlcs = { ...(buildTypeData.dlcs || {}) };

            const dlc = currentDlcs[dlcId];
            if (dlc?.type === 'environment') {
                const dependentCharacters = Object.values(currentDlcs).filter(
                    (d: any) => d.type === 'character' && (d.parentId === dlcId || d.parentId === dlc.folderName)
                );
                if (dependentCharacters.length > 0) {
                    const confirmMessage = `This environment has ${dependentCharacters.length} character DLC(s) that depend on it. Deleting it will also remove those characters. Continue?`;
                    if (!confirm(confirmMessage)) {
                        setDeletingDlc(null);
                        return;
                    }
                    dependentCharacters.forEach((char: any) => {
                        delete currentDlcs[char.id];
                    });
                }
            }

            delete currentDlcs[dlcId];

            await setDoc(doc(db, "apps", appId), {
                ...currentData,
                buildTypes: {
                    ...buildTypes,
                    [buildType]: {
                        ...buildTypeData,
                        dlcs: currentDlcs
                    }
                }
            }, { merge: true });

            setDlcs(currentDlcs);
            setDeletingDlc(null);
        } catch (error: any) {
            console.error("Error deleting DLC:", error);
            alert("Failed to delete DLC: " + (error?.message || "Unknown error"));
            setDeletingDlc(null);
        }
    };

    const toggleEnvExpand = (envId: string) => {
        const newExpanded = new Set(expandedEnvs);
        if (newExpanded.has(envId)) {
            newExpanded.delete(envId);
        } else {
            newExpanded.add(envId);
        }
        setExpandedEnvs(newExpanded);
    };

    const environments = Object.values(dlcs).filter(d => d.type === 'environment' || d.level === 1);
    const characters = Object.values(dlcs).filter(d => d.type === 'character' || d.level === 2);

    // Group characters by their parent
    const charactersByParent: Record<string, DLC[]> = {};
    characters.forEach(char => {
        const parentKey = char.parentId || 'orphaned';
        if (!charactersByParent[parentKey]) {
            charactersByParent[parentKey] = [];
        }
        charactersByParent[parentKey].push(char);
    });

    // Find orphaned characters
    const orphanedCharacters = characters.filter(c => {
        if (!c.parentId) return true;
        // Check if parent exists (by id or folderName)
        return !environments.some(env => env.id === c.parentId || env.folderName === c.parentId);
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-slate-400">Loading DLCs...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="bg-slate-800/80 backdrop-blur-xl border-slate-700/50 shadow-2xl">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-2xl text-white">Additional Content (DLC)</CardTitle>
                            <CardDescription className="text-slate-400">
                                Manage downloadable content for <span className="font-medium text-purple-400">{buildType}</span> build
                            </CardDescription>
                        </div>
                        <Button
                            onClick={() => {
                                setEditingDlc(undefined);
                                setShowForm(true);
                            }}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add DLC
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Stats Summary */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                            <div className="flex items-center gap-3">
                                <Package className="w-5 h-5 text-blue-400" />
                                <div>
                                    <p className="text-2xl font-bold text-white">{environments.length}</p>
                                    <p className="text-xs text-slate-400">Environments</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                            <div className="flex items-center gap-3">
                                <Users className="w-5 h-5 text-purple-400" />
                                <div>
                                    <p className="text-2xl font-bold text-white">{characters.length}</p>
                                    <p className="text-xs text-slate-400">Characters</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="w-5 h-5 text-green-400" />
                                <div>
                                    <p className="text-2xl font-bold text-white">
                                        {Object.values(dlcs).filter(d => d.enabled).length}
                                    </p>
                                    <p className="text-xs text-slate-400">Enabled</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* DLC Hierarchy */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Package className="w-5 h-5 text-purple-400" />
                            DLC Hierarchy
                        </h3>

                        {environments.length === 0 && characters.length === 0 ? (
                            <div className="text-center py-8 rounded-lg bg-slate-700/20 border border-slate-600/30">
                                <Package className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                                <p className="text-slate-400">No DLCs configured yet</p>
                                <p className="text-sm text-slate-500 mt-1">Click "Add DLC" or use "Sync from R2" to get started</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* Environments with nested Characters */}
                                {environments.map((env) => {
                                    const envCharacters = charactersByParent[env.id] || charactersByParent[env.folderName] || [];
                                    const isExpanded = expandedEnvs.has(env.id);
                                    const hasCharacters = envCharacters.length > 0;

                                    return (
                                        <div key={env.id} className="rounded-lg bg-slate-700/30 border border-slate-600/50 overflow-hidden">
                                            {/* Environment Header */}
                                            <div className="p-4">
                                                <div className="flex items-start gap-3">
                                                    {/* Expand Toggle */}
                                                    <button
                                                        onClick={() => toggleEnvExpand(env.id)}
                                                        className={`mt-1 p-1 rounded hover:bg-slate-600/50 transition-colors ${hasCharacters ? '' : 'invisible'}`}
                                                    >
                                                        {isExpanded ? (
                                                            <ChevronDown className="w-4 h-4 text-slate-400" />
                                                        ) : (
                                                            <ChevronRight className="w-4 h-4 text-slate-400" />
                                                        )}
                                                    </button>

                                                    {/* Icon */}
                                                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                                                        <Package className="w-5 h-5 text-blue-400" />
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h4 className="text-white font-medium">{env.name}</h4>
                                                            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">
                                                                Level 1
                                                            </span>
                                                            {!env.enabled && (
                                                                <span className="px-2 py-0.5 rounded-full bg-slate-600/50 text-slate-400 text-xs">
                                                                    Disabled
                                                                </span>
                                                            )}
                                                            {env.metadata?.detectedFromR2 && (
                                                                <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs">
                                                                    Synced
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-slate-400 mt-1 truncate">{env.description || 'No description'}</p>
                                                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
                                                            <span className="font-mono">{env.folderName}</span>
                                                            <span>v{env.version}</span>
                                                            {env.requiredBaseVersion && (
                                                                <span className="flex items-center gap-1">
                                                                    <Info className="w-3 h-3" />
                                                                    Base ≥ {env.requiredBaseVersion}
                                                                </span>
                                                            )}
                                                            {env.size && (
                                                                <span className="flex items-center gap-1">
                                                                    <HardDrive className="w-3 h-3" />
                                                                    {formatBytes(env.size)}
                                                                </span>
                                                            )}
                                                            {hasCharacters && (
                                                                <span className="text-purple-400">{envCharacters.length} character(s)</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex gap-2 flex-shrink-0">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setEditingDlc(env);
                                                                setShowForm(true);
                                                            }}
                                                            className="border-slate-600 text-slate-300 hover:bg-slate-700/50"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setDeletingDlc(env.id)}
                                                            className="border-red-600/50 text-red-400 hover:bg-red-600/10 hover:text-red-300"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Nested Characters */}
                                            {isExpanded && hasCharacters && (
                                                <div className="border-t border-slate-600/30 bg-slate-800/30">
                                                    <div className="ml-8 py-3 space-y-2">
                                                        {envCharacters.map((char) => (
                                                            <div 
                                                                key={char.id} 
                                                                className="flex items-start gap-3 p-3 mx-4 rounded-lg bg-slate-700/30 border border-slate-600/30"
                                                            >
                                                                {/* Connector Line */}
                                                                <div className="relative">
                                                                    <div className="absolute -left-7 top-1/2 w-5 h-px bg-purple-500/30"></div>
                                                                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                                                                        <Users className="w-4 h-4 text-purple-400" />
                                                                    </div>
                                                                </div>

                                                                {/* Info */}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <h5 className="text-sm text-white font-medium">{char.name}</h5>
                                                                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs font-medium">
                                                                            Level 2
                                                                        </span>
                                                                        {!char.enabled && (
                                                                            <span className="px-2 py-0.5 rounded-full bg-slate-600/50 text-slate-400 text-xs">
                                                                                Disabled
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-xs text-slate-400 mt-1 truncate">{char.description || 'No description'}</p>
                                                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                                                                        <span className="font-mono">{char.folderName}</span>
                                                                        <span>v{char.version}</span>
                                                                        {char.parentVersion && (
                                                                            <span className="flex items-center gap-1 text-purple-400">
                                                                                Requires {env.folderName} ≥ {char.parentVersion}
                                                                            </span>
                                                                        )}
                                                                        {char.size && (
                                                                            <span className="flex items-center gap-1">
                                                                                <HardDrive className="w-3 h-3" />
                                                                                {formatBytes(char.size)}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Actions */}
                                                                <div className="flex gap-2 flex-shrink-0">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            setEditingDlc(char);
                                                                            setShowForm(true);
                                                                        }}
                                                                        className="border-slate-600 text-slate-300 hover:bg-slate-700/50 h-7 px-2"
                                                                    >
                                                                        <Edit2 className="w-3 h-3" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => setDeletingDlc(char.id)}
                                                                        className="border-red-600/50 text-red-400 hover:bg-red-600/10 hover:text-red-300 h-7 px-2"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Orphaned Characters */}
                                {orphanedCharacters.length > 0 && (
                                    <div className="space-y-3 mt-6">
                                        <div className="flex items-center gap-2 text-yellow-400">
                                            <AlertTriangle className="w-5 h-5" />
                                            <h4 className="font-medium">Orphaned Characters</h4>
                                            <span className="text-xs text-yellow-400/70">
                                                ({orphanedCharacters.length} with missing parent environment)
                                            </span>
                                        </div>
                                        {orphanedCharacters.map((char) => (
                                            <div key={char.id} className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
                                                            <Users className="w-4 h-4 text-yellow-400" />
                                                        </div>
                                                        <div>
                                                            <h5 className="text-white font-medium">{char.name}</h5>
                                                            <p className="text-sm text-yellow-400/80 mt-1">
                                                                Missing parent: {char.parentId || 'None specified'}
                                                            </p>
                                                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                                                <span className="font-mono">{char.folderName}</span>
                                                                <span>v{char.version}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setEditingDlc(char);
                                                                setShowForm(true);
                                                            }}
                                                            className="border-slate-600 text-slate-300 hover:bg-slate-700/50"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setDeletingDlc(char.id)}
                                                            className="border-red-600/50 text-red-400 hover:bg-red-600/10 hover:text-red-300"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Form Modal */}
            {showForm && (
                <DLCForm
                    dlc={editingDlc}
                    environments={environments}
                    onSave={saveDLC}
                    onCancel={() => {
                        setShowForm(false);
                        setEditingDlc(undefined);
                    }}
                />
            )}

            {/* Delete Confirmation */}
            {deletingDlc && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <Card className="bg-slate-800 border-slate-700 w-full max-w-md">
                        <CardHeader>
                            <CardTitle className="text-white text-red-400">Delete DLC</CardTitle>
                            <CardDescription className="text-slate-400">
                                Are you sure you want to delete "{dlcs[deletingDlc]?.name}"? This action cannot be undone.
                                {dlcs[deletingDlc]?.type === 'environment' && charactersByParent[deletingDlc]?.length > 0 && (
                                    <span className="block mt-2 text-yellow-400">
                                        ⚠️ This will also delete {charactersByParent[deletingDlc].length} dependent character(s).
                                    </span>
                                )}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-2 justify-end pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setDeletingDlc(null)}
                                    className="border-slate-600 text-slate-300"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => deleteDLC(deletingDlc)}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                    Delete
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
