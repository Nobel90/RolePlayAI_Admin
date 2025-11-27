import { useEffect, useState } from 'react'
import { doc, setDoc, onSnapshot } from 'firebase/firestore'
import { db, auth } from '../firebase'
import { signOut } from 'firebase/auth'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2 } from 'lucide-react'

// Define types for our settings
interface HeaderLink {
    text: string;
    url: string;
    order: number;
}

interface BackgroundImage {
    url: string;
    order: number;
}

interface LauncherSettings {
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
            { text: "WEBSITE", url: "https://vrcentre.com.au/", order: 1 },
            { text: "MY ACCOUNT", url: "https://vrcentre.com.au/account/", order: 2 }
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

    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, "settings", "launcher"),
            (doc) => {
                if (doc.exists()) {
                    const data = doc.data() as LauncherSettings;
                    setSettings({
                        ui: {
                            ...DEFAULT_SETTINGS.ui,
                            ...data.ui,
                            buttons: { ...DEFAULT_SETTINGS.ui.buttons, ...data.ui?.buttons },
                            headerLinks: data.ui?.headerLinks || DEFAULT_SETTINGS.ui.headerLinks,
                            backgroundImages: data.ui?.backgroundImages || DEFAULT_SETTINGS.ui.backgroundImages,
                            backgroundTransitionTime: data.ui?.backgroundTransitionTime !== undefined ? data.ui.backgroundTransitionTime : DEFAULT_SETTINGS.ui.backgroundTransitionTime,
                            backgroundDisplayTime: data.ui?.backgroundDisplayTime !== undefined ? data.ui.backgroundDisplayTime : DEFAULT_SETTINGS.ui.backgroundDisplayTime
                        },
                        news: { ...DEFAULT_SETTINGS.news, ...data.news }
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
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setSaveSuccess(false);
        try {
            await setDoc(doc(db, "settings", "launcher"), settings);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error: any) {
            console.error("Error saving settings:", error);
            const errorMessage = error?.code === 'permission-denied' 
                ? "Permission denied. Please check Firestore security rules. The authenticated user needs write access to 'settings/launcher'."
                : error?.message || "Failed to save settings.";
            alert(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    const handleSignOut = () => {
        signOut(auth);
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-slate-400">Loading settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
            
            <div className="container mx-auto p-6 max-w-6xl relative z-10">
                {/* Header */}
                <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-700/50">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                            Launcher Admin
                        </h1>
                        <p className="text-slate-400">Manage your RolePlayAI Launcher configuration in real-time</p>
                    </div>
                    <Button 
                        variant="outline" 
                        onClick={handleSignOut} 
                        className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                    >
                        Sign Out
                    </Button>
                </div>

                <Tabs defaultValue="general" className="w-full space-y-6">
                    <TabsList className="grid w-full grid-cols-5 bg-slate-800/50 p-1.5 rounded-xl border border-slate-700/50 backdrop-blur-sm">
                        <TabsTrigger 
                            value="general" 
                            className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                        >
                            General UI
                        </TabsTrigger>
                        <TabsTrigger 
                            value="visual" 
                            className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                        >
                            Visual Assets
                        </TabsTrigger>
                        <TabsTrigger 
                            value="links" 
                            className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                        >
                            Header Links
                        </TabsTrigger>
                        <TabsTrigger 
                            value="news" 
                            className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                        >
                            News Bar
                        </TabsTrigger>
                        <TabsTrigger 
                            value="buttons" 
                            className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                        >
                            Button Texts
                        </TabsTrigger>
                    </TabsList>

                    {/* General Settings */}
                    <TabsContent value="general" className="space-y-4 animate-fade-in">
                        <Card className="bg-slate-800/80 backdrop-blur-xl border-slate-700/50 shadow-2xl">
                            <CardHeader>
                                <CardTitle className="text-2xl text-white">General UI Settings</CardTitle>
                                <CardDescription className="text-slate-400">
                                    Customize the main title and tagline displayed in the launcher.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
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
                        <Card className="bg-slate-800/80 backdrop-blur-xl border-slate-700/50 shadow-2xl">
                            <CardHeader>
                                <CardTitle className="text-2xl text-white">Visual Assets</CardTitle>
                                <CardDescription className="text-slate-400">
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
                                            className="border-slate-600 text-slate-300 hover:bg-slate-700/50"
                                        >
                                            + Add Image
                                        </Button>
                                    </div>
                                    {settings.ui.backgroundImages && settings.ui.backgroundImages
                                        .sort((a, b) => (a.order || 0) - (b.order || 0))
                                        .map((image, index) => {
                                            const originalIndex = settings.ui.backgroundImages?.findIndex(img => img === image) || index;
                                            return (
                                                <div key={originalIndex} className="p-4 rounded-lg bg-slate-700/30 border border-slate-600/50 space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <Label className="text-slate-300 font-medium">Image #{image.order || originalIndex + 1}</Label>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                const newImages = settings.ui.backgroundImages?.filter((_, i) => i !== originalIndex) || [];
                                                                setSettings({ ...settings, ui: { ...settings.ui, backgroundImages: newImages } });
                                                            }}
                                                            className="border-red-600/50 text-red-400 hover:bg-red-600/10 hover:text-red-300"
                                                        >
                                                            Remove
                                                        </Button>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-sm text-slate-400">Image URL</Label>
                                                        <Input
                                                            className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20"
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
                                                        <Label className="text-sm text-slate-400">Order</Label>
                                                        <Input
                                                            type="number"
                                                            className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20 w-24"
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
                                        <p className="text-xs text-slate-500 text-center py-4">No background images. Add one to enable slideshow. If empty, single background image URL will be used.</p>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700/50">
                                    <div className="space-y-2">
                                        <Label className="text-slate-300 text-base font-medium">Transition Time (ms)</Label>
                                        <Input
                                            type="number"
                                            className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20"
                                            value={settings.ui.backgroundTransitionTime || 1000}
                                            onChange={(e) => setSettings({ ...settings, ui: { ...settings.ui, backgroundTransitionTime: parseInt(e.target.value) || 1000 } })}
                                            placeholder="1000"
                                        />
                                        <p className="text-xs text-slate-500">Fade in/out duration</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-300 text-base font-medium">Display Time (ms)</Label>
                                        <Input
                                            type="number"
                                            className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20"
                                            value={settings.ui.backgroundDisplayTime || 5000}
                                            onChange={(e) => setSettings({ ...settings, ui: { ...settings.ui, backgroundDisplayTime: parseInt(e.target.value) || 5000 } })}
                                            placeholder="5000"
                                        />
                                        <p className="text-xs text-slate-500">Time each image stays</p>
                                    </div>
                                </div>
                                <div className="space-y-2 pt-4 border-t border-slate-700/50">
                                    <Label className="text-slate-300 text-base font-medium">Single Background Image URL (Fallback)</Label>
                                    <Input
                                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20 transition-all"
                                        value={settings.ui.backgroundImageUrl || ''}
                                        onChange={(e) => setSettings({ ...settings, ui: { ...settings.ui, backgroundImageUrl: e.target.value } })}
                                        placeholder="https://example.com/background.jpg"
                                    />
                                    <p className="text-xs text-slate-500">Used if slideshow is empty or disabled</p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-300 text-base font-medium">Sidebar Logo URL</Label>
                                    <Input
                                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20 transition-all"
                                        value={settings.ui.logoUrl || ''}
                                        onChange={(e) => setSettings({ ...settings, ui: { ...settings.ui, logoUrl: e.target.value } })}
                                        placeholder="https://example.com/logo.png"
                                    />
                                    <p className="text-xs text-slate-500">Leave empty to use default logo</p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-300 text-base font-medium">Sidebar Game Name</Label>
                                    <Input
                                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20 transition-all"
                                        value={settings.ui.gameName || ''}
                                        onChange={(e) => setSettings({ ...settings, ui: { ...settings.ui, gameName: e.target.value } })}
                                        placeholder="Role Play AI"
                                    />
                                    <p className="text-xs text-slate-500">Text displayed next to logo in sidebar</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Header Links Settings */}
                    <TabsContent value="links" className="space-y-4 animate-fade-in">
                        <Card className="bg-slate-800/80 backdrop-blur-xl border-slate-700/50 shadow-2xl">
                            <CardHeader>
                                <CardTitle className="text-2xl text-white">Header Links</CardTitle>
                                <CardDescription className="text-slate-400">
                                    Manage the navigation links in the launcher header.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {settings.ui.headerLinks && settings.ui.headerLinks
                                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                                    .map((link, index) => {
                                        const originalIndex = settings.ui.headerLinks?.findIndex(l => l === link) || index;
                                        return (
                                        <div key={originalIndex} className="p-4 rounded-lg bg-slate-700/30 border border-slate-600/50 space-y-3">
                                            <div className="flex justify-between items-center">
                                                <Label className="text-slate-300 font-medium">Link #{link.order || originalIndex + 1}</Label>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        const newLinks = settings.ui.headerLinks?.filter((_, i) => i !== originalIndex) || [];
                                                        setSettings({ ...settings, ui: { ...settings.ui, headerLinks: newLinks } });
                                                    }}
                                                    className="border-red-600/50 text-red-400 hover:bg-red-600/10 hover:text-red-300"
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-2">
                                                    <Label className="text-sm text-slate-400">Link Text</Label>
                                                    <Input
                                                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20"
                                                        value={link.text}
                                                        onChange={(e) => {
                                                            const newLinks = [...(settings.ui.headerLinks || [])];
                                                            newLinks[originalIndex] = { ...link, text: e.target.value };
                                                            setSettings({ ...settings, ui: { ...settings.ui, headerLinks: newLinks } });
                                                        }}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-sm text-slate-400">URL</Label>
                                                    <Input
                                                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20"
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
                                                <Label className="text-sm text-slate-400">Order</Label>
                                                <Input
                                                    type="number"
                                                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20 w-24"
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
                                    className="w-full border-slate-600 text-slate-300 hover:bg-slate-700/50"
                                >
                                    + Add Link
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* News Settings */}
                    <TabsContent value="news" className="space-y-4 animate-fade-in">
                        <Card className="bg-slate-800/80 backdrop-blur-xl border-slate-700/50 shadow-2xl">
                            <CardHeader>
                                <CardTitle className="text-2xl text-white">News Bar</CardTitle>
                                <CardDescription className="text-slate-400">
                                    Manage the news ticker/banner in the launcher.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-700/30 border border-slate-600/50">
                                    <div className="flex items-center space-x-3">
                                        <Switch
                                            id="news-active"
                                            checked={settings.news.active}
                                            onCheckedChange={(checked) => setSettings({ ...settings, news: { ...settings.news, active: checked } })}
                                        />
                                        <Label htmlFor="news-active" className="text-base text-slate-300 cursor-pointer font-medium">
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
                                    <Label className="text-slate-300 text-base font-medium">News Content</Label>
                                    <Textarea
                                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20 transition-all min-h-[120px] resize-none"
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
                        <Card className="bg-slate-800/80 backdrop-blur-xl border-slate-700/50 shadow-2xl">
                            <CardHeader>
                                <CardTitle className="text-2xl text-white">Button Text Configuration</CardTitle>
                                <CardDescription className="text-slate-400">
                                    Customize what the main action button says in different states.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {Object.entries(settings.ui.buttons).map(([key, value]) => (
                                        <div key={key} className="space-y-2">
                                            <Label className="capitalize text-sm text-slate-400 font-medium">
                                                {key.replace(/_/g, ' ')}
                                            </Label>
                                            <Input
                                                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20 transition-all"
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
                </Tabs>

                {/* Save Button */}
                <div className="mt-8 flex justify-end items-center gap-4">
                    {saveSuccess && (
                        <div className="flex items-center gap-2 text-green-400 animate-fade-in">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="text-sm font-medium">Settings saved successfully!</span>
                        </div>
                    )}
                    <Button
                        size="lg"
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-8"
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
