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

    // In a real app, you would upload the file to S3/storage first,
    // then pass the metadata to the backend.
    // For this UI mockup based on provided types, we simulate it:
    createMutation.mutate({
      originalFilename: file.name,
      // supplierId, purchaseId, items could be added manually here or parsed by backend
    }, {
      onSuccess: (data) => {
        navigate(`/invoices/${data.data?.id}`);
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Upload Invoice</h1>

      <Card>
        <CardHeader><CardTitle>Select File</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-4 text-gray-500" />
                <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                <p className="text-xs text-gray-500">PDF, PNG, JPG (MAX. 10MB)</p>
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
            <div className="p-3 bg-muted rounded-md flex justify-between items-center">
              <span className="text-sm font-medium">{file.name}</span>
              <span className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => navigate('/invoices')}>Cancel</Button>
            <Button onClick={handleUpload} disabled={!file || createMutation.isPending}>
              Upload and Process
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
