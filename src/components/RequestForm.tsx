
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Copy } from "lucide-react";

interface Product {
  id: string;
  name: string;
  fornitore_url: string;
  payload_template: any;
  http_method: string;
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
  apiResult: any;
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
  apiResult
}) => {
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

        {/* Show API URL for processing request */}
        {selectedProduct && token && quantity && (
          <div className="mt-6">
            <Separator className="mb-4" />
            <h3 className="font-semibold mb-3">Secure API Endpoint:</h3>
            <div className="bg-gray-100 p-3 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-green-600">POST Request</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCopyUrl(generateProcessRequestUrl())}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <code className="text-xs bg-white p-2 rounded block break-all">
                {generateProcessRequestUrl()}
              </code>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RequestForm;
