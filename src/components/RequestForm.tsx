
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Copy } from "lucide-react";
import ProductTooltip from './ProductTooltip';

interface Product {
  id: string;
  name: string;
  fornitore_url: string;
  payload_template: any;
  http_method: string;
  short_description?: string;
  quantity?: number;
}

interface RequestFormProps {
  products: Product[];
  selectedProduct: string;
  token: string;
  quantity: string;
  loading: boolean;
  onProductSelect: (value: string) => void;
  onTokenChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCopyUrl: (url: string) => void;
  generateProcessRequestUrl: () => string;
  generateProcessRequestBody: () => string;
  apiResult: any;
  baseUrl: string;
}

const RequestForm: React.FC<RequestFormProps> = ({
  products,
  selectedProduct,
  token,
  quantity,
  loading,
  onProductSelect,
  onTokenChange,
  onQuantityChange,
  onSubmit,
  onCopyUrl,
  generateProcessRequestUrl,
  generateProcessRequestBody,
  apiResult,
  baseUrl
}) => {
  const selectedProductData = products.find(p => p.id === selectedProduct);

  // Extract output_result from apiResult
  const getOutputResult = () => {
    if (!apiResult) return '';
    
    // If api_response exists, try to get it from there
    if (apiResult.api_response) {
      if (Array.isArray(apiResult.api_response)) {
        return apiResult.api_response.join('\n');
      }
      return typeof apiResult.api_response === 'string' 
        ? apiResult.api_response 
        : JSON.stringify(apiResult.api_response, null, 2);
    }
    
    // Fallback to checking if apiResult itself is the output
    if (Array.isArray(apiResult)) {
      return apiResult.join('\n');
    }
    
    return '';
  };

  const outputResult = getOutputResult();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Make Request</CardTitle>
        <CardDescription>
          Select a product, enter your token and desired quantity
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product">Product</Label>
            <Select value={selectedProduct} onValueChange={onProductSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {products.length === 0 && (
              <p className="text-sm text-gray-500">Loading products...</p>
            )}
            
            {/* Mostra descrizione prodotto selezionato con quantità */}
            {selectedProductData && (
              <div className="mt-2">
                <ProductTooltip 
                  productName={selectedProductData.name}
                  description={selectedProductData.short_description || `API endpoint: ${selectedProductData.fornitore_url}`}
                >
                  <div className="text-sm text-gray-600 p-2 bg-blue-50 rounded border-l-4 border-blue-200">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <strong>Selected:</strong> {selectedProductData.name}
                        {selectedProductData.short_description && (
                          <div className="mt-1 text-xs text-gray-500">
                            {selectedProductData.short_description}
                          </div>
                        )}
                      </div>
                      <div className="ml-3 flex-shrink-0">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          selectedProductData.quantity === null || selectedProductData.quantity === undefined
                            ? 'bg-gray-100 text-gray-500' 
                            : selectedProductData.quantity >= 1 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                        }`}>
                          Qty: {selectedProductData.quantity === null || selectedProductData.quantity === undefined ? 'N/A' : selectedProductData.quantity}
                        </span>
                      </div>
                    </div>
                  </div>
                </ProductTooltip>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="token">Token/Voucher</Label>
            <Input
              id="token"
              type="text"
              placeholder="Enter your token"
              value={token}
              onChange={(e) => onTokenChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              placeholder="Enter the quantity"
              value={quantity}
              onChange={(e) => onQuantityChange(e.target.value)}
              min="1"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Processing..." : "Submit Request"}
          </Button>
        </form>

        {/* Show Output Result - New copyable textbox */}
        {apiResult && outputResult && (
          <div className="mt-6">
            <Separator className="mb-4" />
            <h3 className="font-semibold mb-3">Output Result:</h3>
            <div className="bg-gray-100 p-3 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-purple-600">Result Content</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCopyUrl(outputResult)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <textarea
                className="w-full h-32 text-xs bg-white p-2 rounded border resize-none font-mono"
                value={outputResult}
                readOnly
                placeholder="Output result will appear here..."
              />
            </div>
          </div>
        )}

        {/* Show API result */}
        {apiResult && (
          <div className="mt-6">
            <Separator className="mb-4" />
            <h3 className="font-semibold mb-3">API Response:</h3>
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <pre className="text-sm text-green-800 whitespace-pre-wrap overflow-auto max-h-32">
                {typeof apiResult === 'string' 
                  ? apiResult 
                  : JSON.stringify(apiResult, null, 2)
                }
              </pre>
            </div>
          </div>
        )}

        {/* Show API URL and Body for processing request */}
        {selectedProduct && token && quantity && (
          <div className="mt-6">
            <Separator className="mb-4" />
            <h3 className="font-semibold mb-3">Secure API Endpoint:</h3>
            
            {/* POST Request URL */}
            <div className="bg-gray-100 p-3 rounded-lg mb-3">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-green-600">POST Request URL</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCopyUrl(`${baseUrl}/api-process`)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <code className="text-xs bg-white p-2 rounded block break-all">
                {baseUrl}/api-process
              </code>
            </div>

            {/* POST Request Body */}
            <div className="bg-gray-100 p-3 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-blue-600">POST Request Body</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCopyUrl(generateProcessRequestBody())}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <code className="text-xs bg-white p-2 rounded block break-all">
                {generateProcessRequestBody()}
              </code>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RequestForm;
