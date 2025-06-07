import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [historyToken, setHistoryToken] = useState<string>("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [apiResult, setApiResult] = useState<any>(null);
  const { toast } = useToast();

  // Base URL sicuro - usa le Edge Functions come proxy
  const baseUrl = "https://vvtnzixsxfjzwhjetrfm.supabase.co/functions/v1";

  // Load products on page load
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

  // Generate simplified API URLs using secure endpoints
  const generateProcessRequestUrl = () => {
    const productData = getSelectedProductData();
    if (!productData || !token || !quantity) return "";
    
    return `${baseUrl}/api-process?product=${encodeURIComponent(productData.name)}&token=${encodeURIComponent(token)}&qty=${quantity}`;
  };

  const generateHistoryUrl = () => {
    if (!historyToken) return "";
    
    return `${baseUrl}/api-history?token=${encodeURIComponent(historyToken)}`;
  };

  const generateProductsUrl = () => {
    return `${baseUrl}/api-products`;
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

    const selectedProductData = products.find(p => p.id === selectedProduct);
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_name: selectedProductData.name,
          token: token,
          qty: parseInt(quantity)
        })
      });

      const data = await response.json();

      if (data.success) {
        setApiResult(data.api_response);
        toast({
          title: "Success",
          description: data.message || "Request processed successfully",
        });
        
        // Reset form
        setSelectedProduct("");
        setToken("");
        setQuantity("");
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: historyToken
        })
      });

      const data = await response.json();

      console.log('API Response:', data);
      
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
          <p className="text-sm text-green-600 font-medium">🔒 Secure API - Credenziali protette</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main form for request */}
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
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
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
                    type="text"
                    placeholder="Enter your token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="Enter the quantity"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
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

          {/* Form for history */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                View your transaction history by entering your token
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleHistorySubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="historyToken">Token</Label>
                  <Input
                    id="historyToken"
                    type="text"
                    placeholder="Enter your token"
                    value={historyToken}
                    onChange={(e) => setHistoryToken(e.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={historyLoading}>
                  {historyLoading ? "Loading..." : "View History"}
                </Button>
              </form>

              {/* Show API URL for history */}
              {historyToken && (
                <div className="mt-6">
                  <Separator className="mb-4" />
                  <h3 className="font-semibold mb-3">Secure API Endpoint:</h3>
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-blue-600">GET Request</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(generateHistoryUrl())}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <code className="text-xs bg-white p-2 rounded block break-all">
                      {generateHistoryUrl()}
                    </code>
                  </div>
                </div>
              )}

              {transactions.length > 0 && (
                <div className="mt-6">
                  <Separator className="mb-4" />
                  <h3 className="font-semibold mb-3">Transactions Found:</h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {transactions.map((transaction, index) => (
                      <div key={transaction.id || index} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">
                            {transaction.product_name || 'Unknown Product'}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            transaction.status === 'success' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {transaction.status || 'Unknown'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <p>Quantity: {transaction.qty || 0}</p>
                          <p>Date: {new Date(transaction.timestamp).toLocaleString('en-US')}</p>
                          
                          {transaction.output_result && transaction.output_result.length > 0 && (
                            <div className="mt-2">
                              <p className="font-medium">Output:</p>
                              <ul className="bg-white p-2 rounded text-xs font-mono">
                                {transaction.output_result.map((result, idx) => (
                                  <li key={idx}>{result}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* API URLs panel */}
          <Card>
            <CardHeader>
              <CardTitle>🔒 Secure API Endpoints</CardTitle>
              <CardDescription>
                Protected HTTP endpoints - No exposed credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-100 p-3 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-purple-600">GET - Get Products</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(generateProductsUrl())}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <code className="text-xs bg-white p-2 rounded block break-all">
                  {generateProductsUrl()}
                </code>
              </div>

              <div className="text-sm text-gray-600 space-y-2">
                <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                  <p className="font-medium text-green-800 mb-1">🔒 Sicurezza Attivata</p>
                  <p className="text-xs text-green-700">
                    • Credenziali Supabase nascoste<br/>
                    • API protette tramite proxy<br/>
                    • Row Level Security abilitato
                  </p>
                </div>
                
                <p><strong>Base URL:</strong></p>
                <code className="bg-white p-2 rounded block text-xs break-all">
                  {baseUrl}
                </code>
                
                <p className="mt-4"><strong>Available Endpoints:</strong></p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">GET</span>
                    <code className="text-xs">/api-products</code>
                    <span className="text-xs text-gray-500">- Retrieve all products</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">POST</span>
                    <code className="text-xs">/api-process</code>
                    <span className="text-xs text-gray-500">- Process a request</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">GET</span>
                    <code className="text-xs">/api-history</code>
                    <span className="text-xs text-gray-500">- Get transaction history</span>
                  </div>
                </div>

                <div className="mt-4 text-xs text-gray-500">
                  <p><strong>Example URLs:</strong></p>
                  <p>• Process: <code>/api-process?product=Google&token=abc123&qty=5</code></p>
                  <p>• History: <code>/api-history?token=abc123</code></p>
                  <p>• Products: <code>/api-products</code></p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
