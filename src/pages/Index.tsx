import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Copy } from "lucide-react";

interface Product {
  id: string;
  name: string;
  fornitore_url: string;
  payload_template: any;
  http_method: string;
}

interface Transaction {
  transaction_id: string;
  timestamp: string;
  status: string;
  quantity: number;
  qty: number;
  product_id: string;
  product_name: string;
  results?: string[];
  output_result?: string[];
  formatted_results?: string;
  token: string;
  id?: string;
  response_data?: any;
  products?: { name: string };
}

const Index = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [historyToken, setHistoryToken] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [apiResult, setApiResult] = useState<any>(null);
  const { toast } = useToast();

  const baseUrl = "https://vvtnzixsxfjzwhjetrfm.supabase.co/functions/v1";

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await fetch(`${baseUrl}/api-products`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load products');
      }

      setProducts(data.products || []);
    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: "Error",
        description: "Unable to load products",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "URL copied to clipboard",
    });
  };

  const getSelectedProductData = () => {
    return products.find(p => p.id === selectedProduct);
  };

  const generateProcessRequestUrl = () => {
    const productData = getSelectedProductData();
    if (!productData || !token || !quantity) return "";

    return `${baseUrl}/api-process?product=${encodeURIComponent(productData.name)}&token=${encodeURIComponent(token)}&qty=${quantity}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct || !token || !quantity) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const selectedProductData = getSelectedProductData();
    if (!selectedProductData) {
      toast({
        title: "Error",
        description: "Product not found",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setApiResult(null);

    try {
      const response = await fetch(`${baseUrl}/api-process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_name: selectedProductData.name,
          token: token,
          qty: parseInt(quantity),
        })
      });

      const data = await response.json();

      if (data.success) {
        setApiResult(data.api_response);
        toast({
          title: "Success",
          description: data.message || "Request processed successfully",
        });

        setSelectedProduct('');
        setToken('');
        setQuantity('');
      } else {
        toast({
          title: "Error",
          description: data.message || data.error || "Error processing request",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Communication error with server",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleHistorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!historyToken) {
      toast({
        title: "Error",
        description: "Please enter the token",
        variant: "destructive",
      });
      return;
    }

    setHistoryLoading(true);

    try {
      const response = await fetch(`${baseUrl}/api-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: historyToken }),
      });

      const data = await response.json();

      setTransactions(data.transactions || []);

      if (!data.transactions || data.transactions.length === 0) {
        toast({
          title: "Info",
          description: "No transactions found for this token",
        });
      } else {
        toast({
          title: "Success",
          description: `Found ${data.total_transactions || data.transactions.length} transactions`,
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Error retrieving history",
        variant: "destructive",
      });
      setTransactions([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">API SERVICE</h1>
          <p className="text-sm text-green-600 font-medium">🔒 Secure API</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Make Request</CardTitle>
              <CardDescription>
                Select a product, enter your token and desired quantity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="product">Product</Label>
                  <Select value={selectedProduct} onValueChange={(value) => setSelectedProduct(value)}>
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="token">Token/Voucher</Label>
                  <Input
                    id="token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Enter your token"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Enter the quantity"
                    min={1}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Processing..." : "Submit Request"}
                </Button>
              </form>

              {apiResult && (
                <div className="mt-6">
                  <Separator className="mb-4" />
                  <h3 className="font-semibold mb-3">API Response:</h3>
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                    <pre className="text-sm text-green-800 whitespace-pre-wrap overflow-auto max-h-32">
                      {typeof apiResult === 'string'
                        ? apiResult
                        : JSON.stringify(apiResult, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

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
                        onClick={() => copyToClipboard(generateProcessRequestUrl())}
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

          {/* History section omitted for brevity */}
        </div>
      </div>
    </div>
  );
};

export default Index;
