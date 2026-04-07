import { useEffect, useState } from 'react'
import { doc, setDoc, onSnapshot, collection, query, getDocs, deleteDoc } from 'firebase/firestore'
import { db, auth } from '../firebase'
import { signOut } from 'firebase/auth'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, Plus, Trash2, X } from 'lucide-react'
import { DLCManager } from './DLCManager'
import { R2SyncButton } from './R2SyncButton'
import { CatalogPublisher } from './CatalogPublisher'
import type { LauncherSettings } from '../types/settings'
import { migrateToBuildTypes, needsMigration } from '../utils/migration'

interface AppInfo {
    appId: string;
    name: string;
}

const DEFAULT_SETTINGS: LauncherSettings = {
    ui: {
        gameTitle: "Role Play AI",
        tagline: "SYNTHETIC SCENES™ – Avatar-Led Role Play Platform",
        buttons: {
            uninstalled: "INSTALL",
            installed: "LAUNCH",
            needs_update: "UPDATE",
            needs_sync: "SYNC FILES",
            running: "RUNNING...",
            syncing: "SYNCING...",
            verifying: "VERIFYING...",
            moving: "MOVING...",
            checking_update: "VERIFYING...",
            downloading: "DOWNLOADING...",
            paused: "PAUSED"
        },
        backgroundImageUrl: "",
        backgroundImages: [],
        backgroundTransitionTime: 1000,
        backgroundDisplayTime: 5000,
        logoUrl: "",
        gameName: "",
        headerLinks: [
            { text: "WEBSITE", url: "https://roleplayai.com/", order: 1 },
            { text: "ACCOUNT", url: "https://roleplayai.com/account/", order: 2 }
        ]
    },
    news: {
        active: false,
        text: "News and updates will appear here."
    }
};

export function Dashboard() {
    const [settings, setSettings] = useState<LauncherSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [selectedAppId, setSelectedAppId] = useState<string>('RolePlayAI');
    const [selectedBuildType, setSelectedBuildType] = useState<'production' | 'staging'>('production');
    const [apps, setApps] = useState<AppInfo[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [newAppName, setNewAppName] = useState('');
    const [newAppId, setNewAppId] = useState('');
    const [dlcRefreshKey, setDlcRefreshKey] = useState(0);

    // Load all apps
    useEffect(() => {
        const loadApps = async () => {
            try {
                const appsRef = collection(db, "apps");
                const q = query(appsRef);
                const querySnapshot = await getDocs(q);
                const appsList: AppInfo[] = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    appsList.push({
                        appId: doc.id,
                        name: data.name || doc.id
                    });
                });
                
                // If no apps found, create default RolePlayAI app
                if (appsList.length === 0) {
                    try {
                        // Try to migrate from legacy launcher document
                        const legacyDoc = doc(db, "settings", "launcher");
                        const legacyUnsub = onSnapshot(legacyDoc, async (legacySnapshot) => {
                            if (legacySnapshot.exists()) {
                                const legacySettings = legacySnapshot.data() as LauncherSettings;
                                await setDoc(doc(db, "apps", "RolePlayAI"), {
                                    appId: 'RolePlayAI',
                                    name: 'Role Play AI',
                                    ...legacySettings,
                                    metadata: {
                                        createdAt: new Date(),
                                        updatedAt: new Date()
                                    }
                                });
                                appsList.push({ appId: 'RolePlayAI', name: 'Role Play AI' });
                                setApps(appsList);
                            } else {
                                // Create default RolePlayAI app
                                await setDoc(doc(db, "apps", "RolePlayAI"), {
                                    appId: 'RolePlayAI',
                                    name: 'Role Play AI',
                                    ...DEFAULT_SETTINGS,
                                    metadata: {
                                        createdAt: new Date(),
                                        updatedAt: new Date()
                                    }
                                });
                                appsList.push({ appId: 'RolePlayAI', name: 'Role Play AI' });
                                setApps(appsList);
                            }
                            legacyUnsub();
                        }, () => {
                            // Error reading legacy, create default
                            setDoc(doc(db, "apps", "RolePlayAI"), {
                                appId: 'RolePlayAI',
                                name: 'Role Play AI',
                                ...DEFAULT_SETTINGS,
                                metadata: {
                                    createdAt: new Date(),
                                    updatedAt: new Date()
                                }
                            }).then(() => {
                                appsList.push({ appId: 'RolePlayAI', name: 'Role Play AI' });
                                setApps(appsList);
                            });
                        });
                    } catch (migrateError) {
                        // Create default RolePlayAI app
                        await setDoc(doc(db, "apps", "RolePlayAI"), {
                            appId: 'RolePlayAI',
                            name: 'Role Play AI',
                            ...DEFAULT_SETTINGS,
                            metadata: {
                                createdAt: new Date(),
                                updatedAt: new Date()
                            }
                        });
                        appsList.push({ appId: 'RolePlayAI', name: 'Role Play AI' });
                        setApps(appsList);
                    }
                }
                
                setApps(appsList);
                if (appsList.length > 0 && !appsList.find(a => a.appId === selectedAppId)) {
                    setSelectedAppId(appsList[0].appId);
                }
            } catch (error: any) {
                console.error("Error loading apps:", error);
                // Fallback: create default app
                if (apps.length === 0) {
                    setApps([{ appId: 'RolePlayAI', name: 'Role Play AI' }]);
                }
            }
        };
        loadApps();
    }, []);

    // Load settings for selected app
    useEffect(() => {
        if (!selectedAppId) return;
        
        const unsubscribe = onSnapshot(doc(db, "apps", selectedAppId),
            async (docSnapshot) => {
                if (docSnapshot.exists()) {
                    let data = docSnapshot.data() as LauncherSettings;
                    
                    // Migrate if needed
                    if (needsMigration(data)) {
                        console.log('Migrating data to buildTypes structure...');
                        data = migrateToBuildTypes(data);
                        // Save migrated data back to Firebase
                        try {
                            await setDoc(doc(db, "apps", selectedAppId), data, { merge: true });
                        } catch (error) {
                            console.error('Error saving migrated data:', error);
                        }
                    }
                    
                    setSettings({
                        appId: data.appId || selectedAppId,
                        name: data.name,
                        ui: {
                            ...DEFAULT_SETTINGS.ui,
                            ...data.ui,
                            buttons: { ...DEFAULT_SETTINGS.ui.buttons, ...data.ui?.buttons },
                            headerLinks: data.ui?.headerLinks || DEFAULT_SETTINGS.ui.headerLinks,
                            backgroundImages: data.ui?.backgroundImages || DEFAULT_SETTINGS.ui.backgroundImages,
                            backgroundTransitionTime: data.ui?.backgroundTransitionTime !== undefined ? data.ui.backgroundTransitionTime : DEFAULT_SETTINGS.ui.backgroundTransitionTime,
                            backgroundDisplayTime: data.ui?.backgroundDisplayTime !== undefined ? data.ui.backgroundDisplayTime : DEFAULT_SETTINGS.ui.backgroundDisplayTime
                        },
                        news: { ...DEFAULT_SETTINGS.news, ...data.news },
                        buildTypes: data.buildTypes || {
                            production: {},
                            staging: {}
                        },
                        r2Config: data.r2Config,
                        metadata: data.metadata
                    });
                } else {
                    // App doesn't exist, use defaults
                    setSettings({
                        ...DEFAULT_SETTINGS,
                        appId: selectedAppId,
                        name: apps.find(a => a.appId === selectedAppId)?.name || selectedAppId,
                        buildTypes: {
                            production: {},
                            staging: {}
                        }
                    });
                }
                setLoading(false);
            },
            (error) => {
                console.error("Firestore subscription error:", error);
                if (error.code === 'permission-denied') {
                    console.warn("Permission denied. Falling back to default settings for demonstration.");
                    setLoading(false);
                } else {
                    alert("Failed to load settings: " + error.message);
                    setLoading(false);
                }
            }
        );
        return () => unsubscribe();
    }, [selectedAppId, apps]);

    const handleSave = async () => {
        if (!selectedAppId) return;
        setSaving(true);
        setSaveSuccess(false);
        try {
            // Ensure buildTypes structure exists
            const buildTypes = settings.buildTypes || {
                production: {},
                staging: {}
            };
            
            // Get current build type data
            const currentBuildTypeData = buildTypes[selectedBuildType] || {};
            
            // Prepare data to save - merge with existing buildTypes
            const dataToSave: LauncherSettings = {
                ...settings,
                appId: selectedAppId,
                name: settings.name || apps.find(a => a.appId === selectedAppId)?.name || selectedAppId,
                buildTypes: {
                    ...buildTypes,
                    [selectedBuildType]: currentBuildTypeData
                },
                metadata: {
                    ...settings.metadata,
                    updatedAt: new Date()
                }
            };
            
            // Remove legacy fields if they exist
            delete (dataToSave as any).version;
            delete (dataToSave as any).dlcs;
            
            await setDoc(doc(db, "apps", selectedAppId), dataToSave);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
            
            // Update apps list if name changed
            if (settings.name) {
                setApps(apps.map(a => a.appId === selectedAppId ? { ...a, name: settings.name! } : a));
            }
        } catch (error: any) {
            console.error("Error saving settings:", error);
            const errorMessage = error?.code === 'permission-denied' 
                ? "Permission denied. Please check Firestore security rules. The authenticated user needs write access to 'apps/{appId}'."
                : error?.message || "Failed to save settings.";
            alert(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    const handleCreateApp = async () => {
        if (!newAppId || !newAppName) {
            alert("Please provide both App ID and App Name");
            return;
        }
        
        // Validate appId (alphanumeric and underscores only)
        if (!/^[a-zA-Z0-9_]+$/.test(newAppId)) {
            alert("App ID must contain only letters, numbers, and underscores");
            return;
        }
        
        // Check if app already exists
        const appExists = apps.find(a => a.appId === newAppId);
        if (appExists) {
            alert("An app with this ID already exists");
            return;
        }
        
        try {
            await setDoc(doc(db, "apps", newAppId), {
                appId: newAppId,
                name: newAppName,
                ...DEFAULT_SETTINGS,
                metadata: {
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });
            
            setApps([...apps, { appId: newAppId, name: newAppName }]);
            setSelectedAppId(newAppId);
            setShowCreateModal(false);
            setNewAppId('');
            setNewAppName('');
        } catch (error: any) {
            console.error("Error creating app:", error);
            alert("Failed to create app: " + (error?.message || "Unknown error"));
        }
    };

    const handleDeleteApp = async () => {
        if (!selectedAppId || selectedAppId === 'RolePlayAI') {
            alert("Cannot delete the default RolePlayAI app");
            setShowDeleteModal(false);
            return;
        }
        
        try {
            await deleteDoc(doc(db, "apps", selectedAppId));
            const newApps = apps.filter(a => a.appId !== selectedAppId);
            setApps(newApps);
            if (newApps.length > 0) {
                setSelectedAppId(newApps[0].appId);
            }
            setShowDeleteModal(false);
        } catch (error: any) {
            console.error("Error deleting app:", error);
            alert("Failed to delete app: " + (error?.message || "Unknown error"));
        }
    };

    const handleSignOut = () => {
        signOut(auth);
    };

    if (loading) {
        return (
            <div className="admin-shell flex h-screen items-center justify-center p-4">
                <div className="admin-panel w-full max-w-md p-8 text-center space-y-5 animate-fade-in">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border/80 bg-background">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-xl font-semibold">Loading settings</h2>
                        <p className="text-sm text-muted-foreground">Restoring the selected app and its configuration.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-shell min-h-screen bg-background text-foreground">
            
            <div className="container mx-auto max-w-7xl p-4 sm:p-6 relative z-10">
                {/* Header */}
                <div className="mb-8 flex flex-col gap-5 border-b border-border/80 pb-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="admin-kicker mb-2">Launcher admin</p>
                        <h1 className="admin-title mb-2">RolePlayAI Admin</h1>
                        <p className="admin-subtitle max-w-2xl">
                            Manage your apps, launcher configuration, DLC content, and catalog publishing from one monochrome workspace.
                        </p>
                    </div>
                    <Button 
                        variant="outline" 
                        onClick={handleSignOut} 
                        className="w-full lg:w-auto"
                    >
                        Sign Out
                    </Button>
                </div>

                {/* App Selector */}
                <Card className="admin-panel mb-6">
                    <CardContent className="p-4">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                            <div className="grid flex-1 gap-4 md:grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,240px)] md:items-center">
                                <Label className="admin-kicker whitespace-nowrap">Select app</Label>
                                <select
                                    value={selectedAppId}
                                    onChange={(e) => setSelectedAppId(e.target.value)}
                                    className="h-10 w-full rounded-full border border-input/80 bg-background/80 px-4 text-sm outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    {apps.map((app) => (
                                        <option key={app.appId} value={app.appId}>
                                            {app.name} ({app.appId})
                                        </option>
                                    ))}
                                </select>
                                <Label className="admin-kicker whitespace-nowrap">Build type</Label>
                                <select
                                    value={selectedBuildType}
                                    onChange={(e) => setSelectedBuildType(e.target.value as 'production' | 'staging')}
                                    className="h-10 w-full rounded-full border border-input/80 bg-background/80 px-4 text-sm outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <option value="production">Production</option>
                                    <option value="staging">Staging</option>
                                </select>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowCreateModal(true)}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create App
                                </Button>
                                {selectedAppId !== 'RolePlayAI' && (
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowDeleteModal(true)}
                                        className="border-red-500/30 text-red-600 hover:bg-red-500/5 hover:text-red-700"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Create App Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                        <Card className="admin-panel w-full max-w-md">
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle>Create New App</CardTitle>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setShowCreateModal(false);
                                            setNewAppId('');
                                            setNewAppName('');
                                        }}
                                        className="text-slate-400 hover:text-white"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">App ID</Label>
                                    <Input
                                        value={newAppId}
                                        onChange={(e) => setNewAppId(e.target.value)}
                                        placeholder="e.g., MyNewApp"
                                    />
                                    <p className="text-xs text-muted-foreground">Only letters, numbers, and underscores allowed</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>App Name</Label>
                                    <Input
                                        value={newAppName}
                                        onChange={(e) => setNewAppName(e.target.value)}
                                        placeholder="e.g., My New App"
                                    />
                                </div>
                                <div className="flex gap-2 justify-end pt-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setShowCreateModal(false);
                                            setNewAppId('');
                                            setNewAppName('');
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleCreateApp}
                                    >
                                        Create
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {showDeleteModal && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                        <Card className="admin-panel w-full max-w-md">
                            <CardHeader>
                                <CardTitle className="text-red-600">Delete App</CardTitle>
                                <CardDescription>
                                    Are you sure you want to delete "{apps.find(a => a.appId === selectedAppId)?.name}"? This action cannot be undone.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-2 justify-end pt-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowDeleteModal(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleDeleteApp}
                                        className="bg-red-600 text-white hover:bg-red-700"
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                <Tabs defaultValue="general" className="w-full space-y-6">
                    <TabsList className="grid w-full grid-cols-2 gap-2 overflow-x-auto p-2 lg:grid-cols-7">
                        <TabsTrigger 
                            value="general" 
                            className="text-xs"
                        >
                            General UI
                        </TabsTrigger>
                        <TabsTrigger 
                            value="visual" 
                            className="text-xs"
                        >
                            Visual Assets
                        </TabsTrigger>
                        <TabsTrigger 
                            value="links" 
                            className="text-xs"
                        >
                            Header Links
                        </TabsTrigger>
                        <TabsTrigger 
                            value="news" 
                            className="text-xs"
                        >
                            News Bar
                        </TabsTrigger>
                        <TabsTrigger 
                            value="buttons" 
                            className="text-xs"
                        >
                            Button Texts
                        </TabsTrigger>
                        <TabsTrigger 
                            value="dlc" 
                            className="text-xs"
                        >
                            DLC
                        </TabsTrigger>
                        <TabsTrigger 
                            value="r2settings" 
                            className="text-xs"
                        >
                            R2 Storage
                        </TabsTrigger>
                    </TabsList>

                    {/* General Settings */}
                    <TabsContent value="general" className="space-y-4 animate-fade-in">
                        <Card className="admin-panel">
                            <CardHeader>
                                <CardTitle>General UI Settings</CardTitle>
                                <CardDescription>
                                    Customize the main title and tagline displayed in the launcher.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-slate-300 text-base font-medium">App Name</Label>
                                    <Input
                                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20 transition-all"
                                        value={settings.name || ''}
                                        onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                                        placeholder="Role Play AI"
                                    />
                                    <p className="text-xs text-slate-500">Display name for this app</p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-300 text-base font-medium">Game Title</Label>
                                    <Input
                                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20 transition-all"
                                        value={settings.ui.gameTitle}
                                        onChange={(e) => setSettings({ ...settings, ui: { ...settings.ui, gameTitle: e.target.value } })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-300 text-base font-medium">Tagline</Label>
                                    <Input
                                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20 transition-all"
                                        value={settings.ui.tagline}
                                        onChange={(e) => setSettings({ ...settings, ui: { ...settings.ui, tagline: e.target.value } })}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Visual Assets Settings */}
                    <TabsContent value="visual" className="space-y-4 animate-fade-in">
                        <Card className="admin-panel">
                            <CardHeader>
                                <CardTitle>Visual Assets</CardTitle>
                                <CardDescription>
                                    Customize background image, logo, and game name in the sidebar.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-slate-300 text-base font-medium">Background Images (Slideshow)</Label>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                            onClick={() => {
                                                const newImages = [...(settings.ui.backgroundImages || [])];
                                                const maxOrder = newImages.length > 0 ? Math.max(...newImages.map(img => img.order || 0)) : 0;
                                                newImages.push({ url: "", order: maxOrder + 1 });
                                                setSettings({ ...settings, ui: { ...settings.ui, backgroundImages: newImages } });
                                            }}
                                            >
                                                + Add Image
                                            </Button>
                                    </div>
                                    {settings.ui.backgroundImages && settings.ui.backgroundImages
                                        .sort((a, b) => (a.order || 0) - (b.order || 0))
                                        .map((image, index) => {
                                            const originalIndex = settings.ui.backgroundImages?.findIndex(img => img === image) || index;
                                            return (
                                                <div key={originalIndex} className="admin-muted-panel p-4 space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <Label className="text-slate-300 font-medium">Image #{image.order || originalIndex + 1}</Label>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                const newImages = settings.ui.backgroundImages?.filter((_, i) => i !== originalIndex) || [];
                                                                setSettings({ ...settings, ui: { ...settings.ui, backgroundImages: newImages } });
                                                            }}
                                                            className="border-red-500/30 text-red-600 hover:bg-red-500/5 hover:text-red-700"
                                                        >
                                                            Remove
                                                        </Button>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-sm text-muted-foreground">Image URL</Label>
                                                        <Input
                                                            value={image.url}
                                                            onChange={(e) => {
                                                                const newImages = [...(settings.ui.backgroundImages || [])];
                                                                newImages[originalIndex] = { ...image, url: e.target.value };
                                                                setSettings({ ...settings, ui: { ...settings.ui, backgroundImages: newImages } });
                                                            }}
                                                            placeholder="https://example.com/background.jpg"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-sm text-muted-foreground">Order</Label>
                                                        <Input
                                                            type="number"
                                                            value={image.order || originalIndex + 1}
                                                            onChange={(e) => {
                                                                const newImages = [...(settings.ui.backgroundImages || [])];
                                                                newImages[originalIndex] = { ...image, order: parseInt(e.target.value) || originalIndex + 1 };
                                                                setSettings({ ...settings, ui: { ...settings.ui, backgroundImages: newImages } });
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    {(!settings.ui.backgroundImages || settings.ui.backgroundImages.length === 0) && (
                                        <p className="text-xs text-muted-foreground text-center py-4">No background images. Add one to enable slideshow. If empty, a single background image URL will be used.</p>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 gap-4 pt-4 border-t border-border/80 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label className="text-base font-medium">Transition Time (ms)</Label>
                                        <Input
                                            type="number"
                                            className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20"
                                            value={settings.ui.backgroundTransitionTime || 1000}
                                            onChange={(e) => setSettings({ ...settings, ui: { ...settings.ui, backgroundTransitionTime: parseInt(e.target.value) || 1000 } })}
                                            placeholder="1000"
                                        />
                                        <p className="text-xs text-muted-foreground">Fade in/out duration</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-base font-medium">Display Time (ms)</Label>
                                        <Input
                                            type="number"
                                            className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20"
                                            value={settings.ui.backgroundDisplayTime || 5000}
                                            onChange={(e) => setSettings({ ...settings, ui: { ...settings.ui, backgroundDisplayTime: parseInt(e.target.value) || 5000 } })}
                                            placeholder="5000"
                                        />
                                        <p className="text-xs text-muted-foreground">Time each image stays</p>
                                    </div>
                                </div>
                                <div className="space-y-2 pt-4 border-t border-border/80">
                                    <Label className="text-base font-medium">Single Background Image URL (Fallback)</Label>
                                    <Input
                                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20 transition-all"
                                        value={settings.ui.backgroundImageUrl || ''}
                                        onChange={(e) => setSettings({ ...settings, ui: { ...settings.ui, backgroundImageUrl: e.target.value } })}
                                        placeholder="https://example.com/background.jpg"
                                    />
                                    <p className="text-xs text-muted-foreground">Used if slideshow is empty or disabled</p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-base font-medium">Sidebar Logo URL</Label>
                                    <Input
                                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20 transition-all"
                                        value={settings.ui.logoUrl || ''}
                                        onChange={(e) => setSettings({ ...settings, ui: { ...settings.ui, logoUrl: e.target.value } })}
                                        placeholder="https://example.com/logo.png"
                                    />
                                    <p className="text-xs text-muted-foreground">Leave empty to use default logo</p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-base font-medium">Sidebar Game Name</Label>
                                    <Input
                                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20 transition-all"
                                        value={settings.ui.gameName || ''}
                                        onChange={(e) => setSettings({ ...settings, ui: { ...settings.ui, gameName: e.target.value } })}
                                        placeholder="Role Play AI"
                                    />
                                    <p className="text-xs text-muted-foreground">Text displayed next to logo in sidebar</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Header Links Settings */}
                    <TabsContent value="links" className="space-y-4 animate-fade-in">
                        <Card className="admin-panel">
                            <CardHeader>
                                <CardTitle>Header Links</CardTitle>
                                <CardDescription>
                                    Manage the navigation links in the launcher header.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {settings.ui.headerLinks && settings.ui.headerLinks
                                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                                    .map((link, index) => {
                                        const originalIndex = settings.ui.headerLinks?.findIndex(l => l === link) || index;
                                        return (
                                        <div key={originalIndex} className="admin-muted-panel p-4 space-y-3">
                                            <div className="flex justify-between items-center">
                                                <Label className="font-medium">Link #{link.order || originalIndex + 1}</Label>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        const newLinks = settings.ui.headerLinks?.filter((_, i) => i !== originalIndex) || [];
                                                        setSettings({ ...settings, ui: { ...settings.ui, headerLinks: newLinks } });
                                                    }}
                                                    className="border-red-500/30 text-red-600 hover:bg-red-500/5 hover:text-red-700"
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-2">
                                                    <Label className="text-sm text-muted-foreground">Link Text</Label>
                                                    <Input
                                                        value={link.text}
                                                        onChange={(e) => {
                                                            const newLinks = [...(settings.ui.headerLinks || [])];
                                                            newLinks[originalIndex] = { ...link, text: e.target.value };
                                                            setSettings({ ...settings, ui: { ...settings.ui, headerLinks: newLinks } });
                                                        }}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-sm text-muted-foreground">URL</Label>
                                                    <Input
                                                        value={link.url}
                                                        onChange={(e) => {
                                                            const newLinks = [...(settings.ui.headerLinks || [])];
                                                            newLinks[originalIndex] = { ...link, url: e.target.value };
                                                            setSettings({ ...settings, ui: { ...settings.ui, headerLinks: newLinks } });
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm text-muted-foreground">Order</Label>
                                                <Input
                                                    type="number"
                                                    value={link.order || originalIndex + 1}
                                                    onChange={(e) => {
                                                        const newLinks = [...(settings.ui.headerLinks || [])];
                                                        newLinks[originalIndex] = { ...link, order: parseInt(e.target.value) || originalIndex + 1 };
                                                        setSettings({ ...settings, ui: { ...settings.ui, headerLinks: newLinks } });
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            <Button
                                variant="outline"
                                onClick={() => {
                                    const newLinks = [...(settings.ui.headerLinks || [])];
                                    const maxOrder = newLinks.length > 0 ? Math.max(...newLinks.map(l => l.order || 0)) : 0;
                                    newLinks.push({ text: "NEW LINK", url: "https://example.com", order: maxOrder + 1 });
                                    setSettings({ ...settings, ui: { ...settings.ui, headerLinks: newLinks } });
                                }}
                                className="w-full"
                            >
                                + Add Link
                            </Button>
                        </CardContent>
                    </Card>
                    </TabsContent>

                    {/* News Settings */}
                    <TabsContent value="news" className="space-y-4 animate-fade-in">
                        <Card className="admin-panel">
                            <CardHeader>
                                <CardTitle>News Bar</CardTitle>
                                <CardDescription>
                                    Manage the news ticker/banner in the launcher.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-muted/30 p-4">
                                    <div className="flex items-center space-x-3">
                                        <Switch
                                            id="news-active"
                                            checked={settings.news.active}
                                            onCheckedChange={(checked) => setSettings({ ...settings, news: { ...settings.news, active: checked } })}
                                        />
                                        <Label htmlFor="news-active" className="cursor-pointer text-base font-medium">
                                            Show News Bar
                                        </Label>
                                    </div>
                                    {settings.news.active && (
                                        <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium border border-green-500/30">
                                            Active
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-base font-medium">News Content</Label>
                                    <Textarea
                                        value={settings.news.text}
                                        onChange={(e) => setSettings({ ...settings, news: { ...settings.news, text: e.target.value } })}
                                        rows={4}
                                        placeholder="Enter your news message here..."
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Button Text Settings */}
                    <TabsContent value="buttons" className="space-y-4 animate-fade-in">
                        <Card className="admin-panel">
                            <CardHeader>
                                <CardTitle>Button Text Configuration</CardTitle>
                                <CardDescription>
                                    Customize what the main action button says in different states.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {Object.entries(settings.ui.buttons).map(([key, value]) => (
                                        <div key={key} className="space-y-2">
                                            <Label className="capitalize text-sm font-medium">
                                                {key.replace(/_/g, ' ')}
                                            </Label>
                                            <Input
                                                value={value}
                                                onChange={(e) => {
                                                    const newButtons = { ...settings.ui.buttons, [key]: e.target.value };
                                                    setSettings({ ...settings, ui: { ...settings.ui, buttons: newButtons } });
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Additional Content (DLC) Settings */}
                    <TabsContent value="dlc" className="space-y-4 animate-fade-in">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold">DLC Management</h3>
                            <div className="flex gap-2">
                                <R2SyncButton
                                    appId={selectedAppId}
                                    buildType={selectedBuildType}
                                    currentVersion={settings.buildTypes?.[selectedBuildType]?.version}
                                    currentDLCs={settings.buildTypes?.[selectedBuildType]?.dlcs || {}}
                                    r2Config={settings.r2Config}
                                    onSyncComplete={() => {
                                        // Force DLCManager to refresh by incrementing key
                                        setDlcRefreshKey(prev => prev + 1);
                                    }}
                                />
                                <CatalogPublisher
                                    r2Config={settings.r2Config}
                                    buildTypes={settings.buildTypes || {}}
                                />
                            </div>
                        </div>
                        <DLCManager appId={selectedAppId} buildType={selectedBuildType} key={`dlc-${selectedAppId}-${selectedBuildType}-${dlcRefreshKey}`} />
                    </TabsContent>

                    {/* R2 Storage Settings */}
                    <TabsContent value="r2settings" className="space-y-4 animate-fade-in">
                        <Card className="admin-panel">
                            <CardHeader>
                                <CardTitle>R2 Storage Configuration</CardTitle>
                                <CardDescription>
                                    Configure Cloudflare R2 credentials for automatic catalog.json uploads.
                                    These credentials are stored securely in Firebase.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="mb-4 rounded-2xl border border-border/80 bg-muted/30 p-4">
                                    <p className="text-sm text-foreground">
                                        <strong>Note:</strong> These credentials are used to automatically upload catalog.json to R2 when you sync DLCs.
                                        You can get these from your Cloudflare R2 dashboard → Manage R2 API Tokens.
                                    </p>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label className="text-base font-medium">Account ID</Label>
                                        <Input
                                            value={settings.r2Config?.accountId || ''}
                                            onChange={(e) => setSettings({ 
                                                ...settings, 
                                                r2Config: { ...settings.r2Config, accountId: e.target.value } 
                                            })}
                                            placeholder="Your Cloudflare Account ID"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-base font-medium">Bucket Name</Label>
                                        <Input
                                            value={settings.r2Config?.bucket || 'roleplayai-launcher'}
                                            onChange={(e) => setSettings({ 
                                                ...settings, 
                                                r2Config: { ...settings.r2Config, bucket: e.target.value } 
                                            })}
                                            placeholder="roleplayai-launcher"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-base font-medium">Public R2 Base URL</Label>
                                    <Input
                                        value={settings.r2Config?.publicBaseUrl || ''}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            r2Config: { ...settings.r2Config, publicBaseUrl: e.target.value }
                                        })}
                                        placeholder="https://pub-xxxx.r2.dev"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Used for catalog.json and manifest lookups. Leave empty to use the built-in default.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-base font-medium">R2 Endpoint URL</Label>
                                    <Input
                                        value={settings.r2Config?.endpoint || ''}
                                        onChange={(e) => setSettings({ 
                                            ...settings, 
                                            r2Config: { ...settings.r2Config, endpoint: e.target.value } 
                                        })}
                                        placeholder="https://<account-id>.r2.cloudflarestorage.com"
                                    />
                                    <p className="text-xs text-muted-foreground">Format: https://{'<account-id>'}.r2.cloudflarestorage.com</p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-base font-medium">Access Key ID</Label>
                                    <Input
                                        value={settings.r2Config?.accessKeyId || ''}
                                        onChange={(e) => setSettings({ 
                                            ...settings, 
                                            r2Config: { ...settings.r2Config, accessKeyId: e.target.value } 
                                        })}
                                        placeholder="R2 Access Key ID"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-base font-medium">Secret Access Key</Label>
                                    <Input
                                        type="password"
                                        value={settings.r2Config?.secretAccessKey || ''}
                                        onChange={(e) => setSettings({ 
                                            ...settings, 
                                            r2Config: { ...settings.r2Config, secretAccessKey: e.target.value } 
                                        })}
                                        placeholder="R2 Secret Access Key"
                                    />
                                    <p className="text-xs text-muted-foreground">This is stored encrypted in Firebase</p>
                                </div>
                                <div className="pt-4 border-t border-border/80">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium">Connection Status</p>
                                            <p className="text-xs text-muted-foreground">
                                                {settings.r2Config?.accessKeyId && settings.r2Config?.secretAccessKey 
                                                    ? 'Credentials configured - Save to enable auto-upload' 
                                                    : 'No credentials configured - catalog.json will be saved to Firebase only'}
                                            </p>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                            settings.r2Config?.accessKeyId && settings.r2Config?.secretAccessKey
                                                ? 'bg-green-500/10 text-green-700 border border-green-500/20'
                                                : 'bg-muted text-muted-foreground border border-border/80'
                                        }`}>
                                            {settings.r2Config?.accessKeyId && settings.r2Config?.secretAccessKey ? 'Configured' : 'Not Configured'}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Save Button */}
                <div className="mt-8 flex justify-end items-center gap-4">
                    {saveSuccess && (
                        <div className="flex items-center gap-2 text-green-700 animate-fade-in">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="text-sm font-medium">Settings saved successfully!</span>
                        </div>
                    )}
                    <Button
                        size="lg"
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8"
                    >
                        {saving ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
