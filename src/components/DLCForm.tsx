import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Package, Users, Info } from 'lucide-react';
import type { DLC, DLCFormData } from '../types/dlc';

interface DLCFormProps {
    dlc?: DLC;
    environments: DLC[]; // Available environments for character DLCs
    onSave: (dlcData: DLCFormData) => void;
    onCancel: () => void;
}

export function DLCForm({ dlc, environments, onSave, onCancel }: DLCFormProps) {
    const [formData, setFormData] = useState<DLCFormData>({
        name: dlc?.name || '',
        type: dlc?.type || 'environment',
        level: dlc?.level || 1,
        parentId: dlc?.parentId || '',
        parentVersion: dlc?.parentVersion || '',
        version: dlc?.version || '1.0.0',
        manifestUrl: dlc?.manifestUrl || '',
        folderName: dlc?.folderName || '',
        description: dlc?.description || '',
        iconUrl: dlc?.iconUrl || '',
        requiredBaseVersion: dlc?.requiredBaseVersion || '',
        enabled: dlc?.enabled ?? true,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Auto-detect type and parent from folder name
    useEffect(() => {
        if (formData.folderName && !dlc) {
            const folderName = formData.folderName;
            if (folderName.startsWith('DLC_')) {
                const nameWithoutPrefix = folderName.substring(4);
                const parts = nameWithoutPrefix.split('_');
                
                if (parts.length === 1) {
                    // Environment: DLC_Hospital
                    setFormData(prev => ({
                        ...prev,
                        type: 'environment',
                        level: 1,
                        parentId: '',
                        parentVersion: ''
                    }));
                } else {
                    // Character: DLC_Hospital_Rachael
                    const parentFolderName = `DLC_${parts[0]}`;
                    const parentEnv = environments.find(e => e.folderName === parentFolderName);
                    
                    setFormData(prev => ({
                        ...prev,
                        type: 'character',
                        level: 2,
                        parentId: parentEnv?.id || parentFolderName,
                        parentVersion: parentEnv?.version || prev.parentVersion
                    }));
                }
            }
        }
    }, [formData.folderName, environments, dlc]);

    // Auto-generate display name from folder name
    useEffect(() => {
        if (formData.folderName && !formData.name && !dlc) {
            const folderName = formData.folderName;
            if (folderName.startsWith('DLC_')) {
                const nameWithoutPrefix = folderName.substring(4);
                const parts = nameWithoutPrefix.split('_');
                
                if (parts.length === 1) {
                    setFormData(prev => ({ ...prev, name: `${parts[0]} Environment` }));
                } else {
                    const env = parts[0];
                    const char = parts.slice(1).join(' ');
                    setFormData(prev => ({ ...prev, name: `${char} (${env})` }));
                }
            }
        }
    }, [formData.folderName, dlc]);

    // Update parent version when parent changes
    useEffect(() => {
        if (formData.parentId && formData.type === 'character') {
            const parentEnv = environments.find(e => e.id === formData.parentId || e.folderName === formData.parentId);
            if (parentEnv && !formData.parentVersion) {
                setFormData(prev => ({ ...prev, parentVersion: parentEnv.version }));
            }
        }
    }, [formData.parentId, formData.type, environments]);

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        }

        if (!formData.version.trim()) {
            newErrors.version = 'Version is required';
        }

        if (!formData.manifestUrl.trim()) {
            newErrors.manifestUrl = 'Manifest URL is required';
        } else {
            try {
                new URL(formData.manifestUrl);
            } catch {
                newErrors.manifestUrl = 'Invalid URL format';
            }
        }

        if (!formData.folderName.trim()) {
            newErrors.folderName = 'Folder name is required';
        } else if (!/^[a-zA-Z0-9_]+$/.test(formData.folderName)) {
            newErrors.folderName = 'Folder name can only contain letters, numbers, and underscores';
        }

        if (formData.type === 'character') {
            if (!formData.parentId) {
                newErrors.parentId = 'Parent environment is required for character DLCs';
            }
            if (!formData.parentVersion) {
                newErrors.parentVersion = 'Required parent version is needed';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            onSave(formData);
        }
    };

    const selectedParentEnv = environments.find(e => e.id === formData.parentId || e.folderName === formData.parentId);

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <Card className="bg-slate-800 border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                formData.type === 'environment' 
                                    ? 'bg-blue-500/20 border border-blue-500/30' 
                                    : 'bg-purple-500/20 border border-purple-500/30'
                            }`}>
                                {formData.type === 'environment' 
                                    ? <Package className="w-5 h-5 text-blue-400" />
                                    : <Users className="w-5 h-5 text-purple-400" />
                                }
                            </div>
                            <div>
                                <CardTitle className="text-white">
                                    {dlc ? 'Edit DLC' : 'Create New DLC'}
                                </CardTitle>
                                <CardDescription className="text-slate-400">
                                    {formData.type === 'environment' ? 'Environment (Level 1)' : 'Character (Level 2)'}
                                </CardDescription>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onCancel}
                            className="text-slate-400 hover:text-white"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* DLC Type Selection */}
                        <div className="space-y-2">
                            <Label className="text-slate-300">DLC Type *</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ 
                                        ...formData, 
                                        type: 'environment', 
                                        level: 1,
                                        parentId: '',
                                        parentVersion: ''
                                    })}
                                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                                        formData.type === 'environment'
                                            ? 'border-blue-500 bg-blue-500/10'
                                            : 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Package className={`w-5 h-5 ${formData.type === 'environment' ? 'text-blue-400' : 'text-slate-400'}`} />
                                        <div>
                                            <p className={`font-medium ${formData.type === 'environment' ? 'text-blue-400' : 'text-slate-300'}`}>
                                                Environment
                                            </p>
                                            <p className="text-xs text-slate-500">Level 1 DLC</p>
                                        </div>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ 
                                        ...formData, 
                                        type: 'character',
                                        level: 2
                                    })}
                                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                                        formData.type === 'character'
                                            ? 'border-purple-500 bg-purple-500/10'
                                            : 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Users className={`w-5 h-5 ${formData.type === 'character' ? 'text-purple-400' : 'text-slate-400'}`} />
                                        <div>
                                            <p className={`font-medium ${formData.type === 'character' ? 'text-purple-400' : 'text-slate-300'}`}>
                                                Character
                                            </p>
                                            <p className="text-xs text-slate-500">Level 2 DLC</p>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Folder Name (Primary Identifier) */}
                        <div className="space-y-2">
                            <Label className="text-slate-300">Folder Name *</Label>
                            <Input
                                className="bg-slate-700/50 border-slate-600 text-white font-mono"
                                value={formData.folderName}
                                onChange={(e) => setFormData({ ...formData, folderName: e.target.value })}
                                placeholder="e.g., DLC_Hospital or DLC_Hospital_Rachael"
                            />
                            {errors.folderName && (
                                <p className="text-xs text-red-400">{errors.folderName}</p>
                            )}
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                <Info className="w-3 h-3" />
                                Used as the DLC ID and R2 folder path
                            </p>
                        </div>

                        {/* Display Name */}
                        <div className="space-y-2">
                            <Label className="text-slate-300">Display Name *</Label>
                            <Input
                                className="bg-slate-700/50 border-slate-600 text-white"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Hospital Environment or Rachael (Hospital)"
                            />
                            {errors.name && (
                                <p className="text-xs text-red-400">{errors.name}</p>
                            )}
                        </div>

                        {/* Parent Environment (Character only) */}
                        {formData.type === 'character' && (
                            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30 space-y-4">
                                <div className="flex items-center gap-2 text-purple-400">
                                    <Info className="w-4 h-4" />
                                    <span className="text-sm font-medium">Parent Environment Required</span>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Parent Environment *</Label>
                                    <select
                                        className="w-full bg-slate-700/50 border border-slate-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                                        value={formData.parentId}
                                        onChange={(e) => {
                                            const parentEnv = environments.find(env => env.id === e.target.value);
                                            setFormData({ 
                                                ...formData, 
                                                parentId: e.target.value,
                                                parentVersion: parentEnv?.version || formData.parentVersion
                                            });
                                        }}
                                    >
                                        <option value="">Select an environment...</option>
                                        {environments.map((env) => (
                                            <option key={env.id} value={env.id}>
                                                {env.name} ({env.folderName}) - v{env.version}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.parentId && (
                                        <p className="text-xs text-red-400">{errors.parentId}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-300">Required Parent Version *</Label>
                                    <Input
                                        className="bg-slate-700/50 border-slate-600 text-white"
                                        value={formData.parentVersion}
                                        onChange={(e) => setFormData({ ...formData, parentVersion: e.target.value })}
                                        placeholder="e.g., 1.0.0"
                                    />
                                    {errors.parentVersion && (
                                        <p className="text-xs text-red-400">{errors.parentVersion}</p>
                                    )}
                                    <p className="text-xs text-slate-500">
                                        Minimum version of {selectedParentEnv?.name || 'parent'} required
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Version */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-300">Version *</Label>
                                <Input
                                    className="bg-slate-700/50 border-slate-600 text-white"
                                    value={formData.version}
                                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                                    placeholder="e.g., 1.0.0"
                                />
                                {errors.version && (
                                    <p className="text-xs text-red-400">{errors.version}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Required Base Game Version</Label>
                                <Input
                                    className="bg-slate-700/50 border-slate-600 text-white"
                                    value={formData.requiredBaseVersion}
                                    onChange={(e) => setFormData({ ...formData, requiredBaseVersion: e.target.value })}
                                    placeholder="e.g., 1.0.1.0"
                                />
                                <p className="text-xs text-slate-500">Minimum base game version</p>
                            </div>
                        </div>

                        {/* Manifest URL */}
                        <div className="space-y-2">
                            <Label className="text-slate-300">Manifest URL *</Label>
                            <Input
                                className="bg-slate-700/50 border-slate-600 text-white font-mono text-sm"
                                value={formData.manifestUrl}
                                onChange={(e) => setFormData({ ...formData, manifestUrl: e.target.value })}
                                placeholder="https://pub-xxx.r2.dev/production/DLC_Hospital/manifest.json"
                            />
                            {errors.manifestUrl && (
                                <p className="text-xs text-red-400">{errors.manifestUrl}</p>
                            )}
                            <p className="text-xs text-slate-500">URL to the latest DLC manifest</p>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label className="text-slate-300">Description</Label>
                            <Textarea
                                className="bg-slate-700/50 border-slate-600 text-white"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Optional description of this DLC"
                                rows={3}
                            />
                        </div>

                        {/* Icon URL */}
                        <div className="space-y-2">
                            <Label className="text-slate-300">Icon URL</Label>
                            <Input
                                className="bg-slate-700/50 border-slate-600 text-white"
                                value={formData.iconUrl}
                                onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })}
                                placeholder="https://example.com/icon.png"
                            />
                            <p className="text-xs text-slate-500">Optional icon for the DLC in launcher</p>
                        </div>

                        {/* Enabled Toggle */}
                        <div className="flex items-center justify-between p-4 rounded-lg bg-slate-700/30 border border-slate-600/50">
                            <div className="flex items-center space-x-3">
                                <Switch
                                    id="dlc-enabled"
                                    checked={formData.enabled}
                                    onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                                />
                                <Label htmlFor="dlc-enabled" className="text-slate-300 cursor-pointer font-medium">
                                    Available for Download
                                </Label>
                            </div>
                            {formData.enabled ? (
                                <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium border border-green-500/30">
                                    Active
                                </span>
                            ) : (
                                <span className="px-3 py-1 rounded-full bg-slate-600/50 text-slate-400 text-xs font-medium">
                                    Hidden
                                </span>
                            )}
                        </div>

                        {/* Form Actions */}
                        <div className="flex gap-2 justify-end pt-4 border-t border-slate-700">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onCancel}
                                className="border-slate-600 text-slate-300"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                            >
                                {dlc ? 'Update DLC' : 'Create DLC'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
