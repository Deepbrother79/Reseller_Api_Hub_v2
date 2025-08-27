
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy } from "lucide-react";

interface ApiEndpointsPanelProps {
  baseUrl: string;
  onCopyUrl: (url: string) => void;
  generateProductsUrl: () => string;
  generateRefundUrl?: () => string;
}

const ApiEndpointsPanel: React.FC<ApiEndpointsPanelProps> = ({
  baseUrl,
  onCopyUrl,
  generateProductsUrl,
  generateRefundUrl
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>🔒 Secure API Endpoints</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-gray-100 p-3 rounded-lg">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-medium text-purple-600">GET - Get Products</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onCopyUrl(generateProductsUrl())}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <code className="text-xs bg-white p-2 rounded block break-all">
            {generateProductsUrl()}
          </code>
        </div>

        <div className="text-sm text-gray-600 space-y-2">
          
          <p><strong>Base URL:</strong></p>
          <code className="bg-white p-2 rounded block text-xs break-all">
            https://api.accshub.org
          </code>
          
          <p className="mt-4"><strong>Available Endpoints:</strong></p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">GET</span>
              <code className="text-xs">/items</code>
              <span className="text-xs text-gray-500">- Retrieve all products</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">POST</span>
              <code className="text-xs">/process</code>
              <span className="text-xs text-gray-500">- Process a request</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">GET</span>
              <code className="text-xs">/history</code>
              <span className="text-xs text-gray-500">- Get transaction history</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded">POST</span>
              <code className="text-xs">/refund</code>
              <span className="text-xs text-gray-500">- Request refund</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApiEndpointsPanel;
