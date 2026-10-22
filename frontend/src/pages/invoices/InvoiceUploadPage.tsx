import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateInvoice } from '@/hooks/useInvoices';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload } from 'lucide-react';

export const InvoiceUploadPage = () => {
  const navigate = useNavigate();
  const createMutation = useCreateInvoice();
  const [file, setFile] = useState<File | null>(null);

  const handleUpload = () => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.includes(',') ? result.split(',')[1] : result;

      createMutation.mutate(
        {
          originalFilename: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/pdf',
          fileData: base64Data,
        },
        {
          onSuccess: (data) => {
            navigate(`/invoices/${data.data?.id}`);
          },
        }
      );
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/invoices')} className="text-navy hover:bg-cream/40">
          Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-navy">Upload Inbound Invoice</h1>
      </div>

      <Card className="border border-bluegray/40 bg-white shadow-sm">
        <CardHeader className="border-b border-bluegray/20 pb-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-navy">Document Intake</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-bluegray rounded-lg cursor-pointer bg-cream/30 hover:bg-cream/50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <div className="p-3 bg-white rounded-full border border-bluegray/40 mb-3 shadow-sm">
                  <Upload className="w-6 h-6 text-navy" />
                </div>
                <p className="mb-1 text-xs text-navy font-semibold"><span className="underline">Click to browse</span> or drag and drop invoice</p>
                <p className="text-[10px] text-navy/60 font-mono">Supported: PDF, PNG, JPG (MAX. 10MB)</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          {file && (
            <div className="p-3 bg-cream/40 border border-bluegray/30 rounded-md flex justify-between items-center text-xs">
              <span className="font-semibold text-navy font-mono">{file.name}</span>
              <span className="text-navy/60 font-mono">{(file.size / 1024).toFixed(2)} KB</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-bluegray/20">
            <Button variant="outline" onClick={() => navigate('/invoices')} className="border-bluegray/40 text-navy text-xs font-semibold hover:bg-cream/40">
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!file || createMutation.isPending} className="bg-navy hover:bg-navy-dark text-white text-xs font-semibold shadow-sm">
              {createMutation.isPending ? 'Uploading & Ingesting...' : 'Upload and Ingest Document'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
