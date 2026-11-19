import { useState, useCallback } from "react";
import { FileText, Upload, AlertCircle, CheckCircle, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

// Type for analysis result structure
type AnalysisResult = {
  id: string;
  message: string;
  sections: { key: string; label: string; data: Record<string, unknown> }[];
  [key: string]: unknown;
};

export function CahierDeCharges() {
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const ACCEPT = ".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.xls,.txt,.csv";
  const MAX_SIZE = 15 * 1024 * 1024;

  const handleFiles = useCallback((accepted: File[]) => {
    setFiles(accepted);
    setResult(null);
    setError(null);
    setSaved(null);
    setAnalyzing(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const accepted = Array.from(e.dataTransfer.files).filter((f) =>
        ACCEPT.includes(f.name.toLowerCase().slice(f.name.lastIndexOf("."))),
      );
      if (accepted.length) handleFiles(accepted);
    },
    [handleFiles],
  );

  const handleUpload = useCallback(() => {
    if (!files.length) return;
    handleFiles(files);
  }, [files, handleFiles]);

  const formatSize = (n: number) => {
    if (n < 1024) return `${n} o`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} Ko`;
    return `${(n / 1024 / 1024).toFixed(1)} Mo`;
  };

  const analyze = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(null);

    try {
      // Read and upload file to get data URL
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const formData = new FormData();
      formData.append("projectId", import.meta.env["VITE_SUPABASE_PROJECT_ID"] || "");
      // In a real app, projectId would come from the route param
      formData.append("documentData", dataUrl);
      formData.append("title", file.name.replace(/\.[^.]+$/, ""));

      const res = await fetch("/api/cahier-decharges", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Erreur HTTP ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
      setLoading(false);
      setAnalyzing(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'analyse.");
      setLoading(false);
      setAnalyzing(false);
    }
  }, []);

  const saveToProject = useCallback(
    async (projectId: string) => {
      if (!result?.id) return;
      setSaved(null);
      try {
        const res = await fetch("/api/cahier-decharges/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, cahierId: result.id }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Erreur lors de la sauvegarde.");
        }
        setSaved(result.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur lors de la sauvegarde.");
      }
    },
    [result],
  );

  const reset = useCallback(() => {
    setFiles([]);
    setResult(null);
    setError(null);
    setSaved(null);
    setAnalyzing(false);
  }, []);

  const sections = [
    { key: "generalInformation", label: "Informations générales" },
    { key: "objectives", label: "Objectifs" },
    { key: "scope", label: "Périmètre" },
    { key: "functionalRequirements", label: "Exigences fonctionnelles" },
    { key: "technicalRequirements", label: "Exigences techniques" },
    { key: "constraints", label: "Contraintes" },
    { key: "timeline", label: "Planning" },
    { key: "deliverables", label: "Livrables" },
    { key: "risks", label: "Risques" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FileText className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Cahier de Charges</h1>
          <p className="text-muted-foreground text-sm">
            Analysez et structurez un cahier des charges (CCTP, brief, spécifications)
          </p>
        </div>
      </div>

      {/* Upload zone */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Nouveau cahier de charges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition ${
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <Upload className={`h-8 w-8 ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
            <p className="text-sm font-medium">
              Glissez-déposez ou cliquez pour sélectionner un fichier
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, DOCX, TXT, CSV ou image (max 15 Mo)
            </p>
            <Button variant="default" size="sm" onClick={handleUpload} disabled={!files.length}>
              <Upload className="h-4 w-4 mr-2" />
              Choisir un fichier
            </Button>
          </div>

          {files.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {files.map((f) => (
                <Badge key={f.name} variant="secondary" className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {f.name} ({formatSize(f.size)})
                  <button
                    onClick={() => {
                      setFiles(files.filter((f) => f !== f));
                      reset();
                    }}
                    className="ml-2 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis status */}
      {analyzing && result && (
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Analyse terminée</p>
                <p className="text-sm text-muted-foreground">
                  {typeof result.message === "string" ? result.message.length : 0} sections
                  structurées
                </p>
              </div>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={() => saveToProject("PLACEHOLDER_PROJECT_ID")}
            >
              <Save className="h-4 w-4 mr-2" />
              Enregistrer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && !analyzing && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Résultat de l'analyse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {sections.map(({ key, label }) => {
                  const value = result[key];
                  if (!value) return null;
                  return (
                    <Card key={key} className="flex-1">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-semibold">{label}</CardTitle>
                        <Badge variant="outline">
                          {typeof value === "object" ? Object.keys(value).length : "1"}
                        </Badge>
                      </CardHeader>
                      <CardContent>
                        {typeof value === "object" && Array.isArray(value) ? (
                          <ul className="space-y-2">
                            {value.map((item: { id: string; title: string }, i: number) => (
                              <li key={i} className="text-sm">
                                <span className="font-mono text-muted-foreground">{item.id}</span>
                                <span className="ml-2 text-foreground">{item.title}</span>
                              </li>
                            ))}
                          </ul>
                        ) : typeof value === "object" ? (
                          <pre className="text-xs whitespace-pre-wrap font-mono">
                            {JSON.stringify(value, null, 2)}
                          </pre>
                        ) : (
                          <p className="text-sm">{String(value)}</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Error */}
      {error && (
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
