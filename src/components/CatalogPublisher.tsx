import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Upload, CheckCircle2, AlertTriangle, RefreshCw, Package, Users, FileJson } from 'lucide-react';
import { 
    generateCatalog, 
    getCatalogSummary, 
    validateCatalog, 
    formatCatalogJSON,
    fetchCurrentCatalog,
    compareCatalogs,
    getCatalogUrl
} from '../services/catalogPublisher';
import type { Catalog } from '../types/catalog';
import type { DLC } from '../types/dlc';

interface CatalogPublisherProps {
    buildTypes: {
        production?: { version?: string; dlcs?: Record<string, DLC> };
        staging?: { version?: string; dlcs?: Record<string, DLC> };
    };
}

export function CatalogPublisher({ buildTypes }: CatalogPublisherProps) {
    const [showPreview, setShowPreview] = useState(false);
    const [loading, setLoading] = useState(false);
    const [catalog, setCatalog] = useState<Catalog | null>(null);
    const [currentCatalog, setCurrentCatalog] = useState<Catalog | null>(null);
    const [changes, setChanges] = useState<string[]>([]);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    const handlePreview = async () => {
        setLoading(true);
        try {
            // Generate new catalog from Firebase data
            const newCatalog = generateCatalog(buildTypes);
            setCatalog(newCatalog);

            // Validate
            const validation = validateCatalog(newCatalog);
            setValidationErrors(validation.errors);

            // Fetch current catalog from R2 for comparison
            const existing = await fetchCurrentCatalog();
            setCurrentCatalog(existing);

            // Compare catalogs
            const comparison = compareCatalogs(existing, newCatalog);
            setChanges(comparison.changes);

            setShowPreview(true);
        } catch (error: any) {
            console.error('Error generating preview:', error);
            alert('Failed to generate preview: ' + (error?.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    const handleCopyJSON = () => {
        if (catalog) {
            navigator.clipboard.writeText(formatCatalogJSON(catalog));
            alert('Catalog JSON copied to clipboard!');
        }
    };

    const summary = catalog ? getCatalogSummary(catalog) : null;

    return (
        <>
            <Button
                variant="outline"
                onClick={handlePreview}
                disabled={loading}
                className="border-green-600/50 text-green-400 hover:bg-green-600/10 hover:text-green-300"
            >
                {loading ? (
                    <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                    </>
                ) : (
                    <>
                        <Upload className="w-4 h-4 mr-2" />
                        Publish Catalog
                    </>
                )}
            </Button>

            {showPreview && catalog && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <Card className="bg-slate-800 border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <FileJson className="w-5 h-5 text-green-400" />
                                        Catalog Preview
                                    </CardTitle>
                                    <CardDescription className="text-slate-400">
                                        Review the catalog before publishing to R2
                                    </CardDescription>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setShowPreview(false);
                                        setCatalog(null);
                                    }}
                                    className="text-slate-400 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Validation Errors */}
                            {validationErrors.length > 0 && (
                                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                                    <div className="flex items-center gap-2 text-red-400 mb-2">
                                        <AlertTriangle className="w-5 h-5" />
                                        <span className="font-medium">Validation Errors</span>
                                    </div>
                                    <ul className="list-disc list-inside text-sm text-red-400 space-y-1">
                                        {validationErrors.map((error, idx) => (
                                            <li key={idx}>{error}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Production Summary */}
                                <div className={`p-4 rounded-lg border ${
                                    summary?.production 
                                        ? 'bg-green-500/10 border-green-500/30' 
                                        : 'bg-slate-700/30 border-slate-600/50'
                                }`}>
                                    <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
                                        <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">
                                            PRODUCTION
                                        </span>
                                    </h3>
                                    {summary?.production ? (
                                        <div className="space-y-2 text-sm">
                                            <p className="text-slate-300">
                                                Base Game: <span className="font-mono text-white">v{summary.production.version}</span>
                                            </p>
                                            <div className="flex items-center gap-4 text-slate-400">
                                                <span className="flex items-center gap-1">
                                                    <Package className="w-4 h-4 text-blue-400" />
                                                    {summary.production.envCount} Environments
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-4 h-4 text-purple-400" />
                                                    {summary.production.charCount} Characters
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-500">No production build configured</p>
                                    )}
                                </div>

                                {/* Staging Summary */}
                                <div className={`p-4 rounded-lg border ${
                                    summary?.staging 
                                        ? 'bg-yellow-500/10 border-yellow-500/30' 
                                        : 'bg-slate-700/30 border-slate-600/50'
                                }`}>
                                    <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
                                        <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
                                            STAGING
                                        </span>
                                    </h3>
                                    {summary?.staging ? (
                                        <div className="space-y-2 text-sm">
                                            <p className="text-slate-300">
                                                Base Game: <span className="font-mono text-white">v{summary.staging.version}</span>
                                            </p>
                                            <div className="flex items-center gap-4 text-slate-400">
                                                <span className="flex items-center gap-1">
                                                    <Package className="w-4 h-4 text-blue-400" />
                                                    {summary.staging.envCount} Environments
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-4 h-4 text-purple-400" />
                                                    {summary.staging.charCount} Characters
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-500">No staging build configured</p>
                                    )}
                                </div>
                            </div>

                            {/* Changes */}
                            {changes.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                                        Changes from Current Catalog
                                    </h3>
                                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 space-y-1">
                                        {changes.map((change, idx) => (
                                            <p key={idx} className="text-sm text-blue-400 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                                {change}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {changes.length === 0 && currentCatalog && (
                                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                                    <span className="text-green-400">No changes detected from current catalog</span>
                                </div>
                            )}

                            {/* Catalog JSON Preview */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                                        Catalog JSON
                                    </h3>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleCopyJSON}
                                        className="border-slate-600 text-slate-300 hover:bg-slate-700/50"
                                    >
                                        Copy JSON
                                    </Button>
                                </div>
                                <pre className="p-4 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 overflow-x-auto max-h-60">
                                    {formatCatalogJSON(catalog)}
                                </pre>
                            </div>

                            {/* Publish URL Info */}
                            <div className="p-3 rounded-lg bg-slate-700/30 border border-slate-600/50">
                                <p className="text-sm text-slate-400">
                                    <span className="font-medium text-slate-300">Target URL:</span>{' '}
                                    <span className="font-mono text-xs">{getCatalogUrl()}</span>
                                </p>
                            </div>

                            {/* Important Notice */}
                            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-yellow-400">
                                        <p className="font-medium mb-1">Manual Upload Required</p>
                                        <p className="text-yellow-400/80">
                                            Copy the JSON above and upload it to your R2 bucket as <code className="bg-slate-800 px-1 rounded">catalog.json</code>.
                                            Direct R2 uploads from the browser require CORS configuration and write credentials.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 justify-end pt-4 border-t border-slate-700">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowPreview(false);
                                        setCatalog(null);
                                    }}
                                    className="border-slate-600 text-slate-300"
                                >
                                    Close
                                </Button>
                                <Button
                                    onClick={handleCopyJSON}
                                    className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white"
                                >
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Copy & Close
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </>
    );
}
