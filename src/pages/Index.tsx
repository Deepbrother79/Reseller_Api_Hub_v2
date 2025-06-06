
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Copy } from "lucide-react";

interface Product {
  id: string;
  name: string;
  fornitore_url: string;
  payload_template: any;
  http_method: string;
}

interface Transaction {
  id: string;
  token: string;
  product_id: string;
  qty: number;
  response_data: any;
  status: string;
  timestamp: string;
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
  const { toast } = useToast();

  // Base URL for API calls
  const baseUrl = "https://vvtnzixsxfjzwhjetrfm.supabase.co/functions/v1";

  // Load products on page load
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*');
      
      if (error) throw error;
      setProducts(data || []);
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

  // Generate API URLs
  const generateProcessRequestUrl = () => {
    const productData = getSelectedProductData();
    if (!productData || !token || !quantity) return "";
    
    const payload = {
      product_name: productData.name,
      token: token,
      qty: parseInt(quantity)
    };
    
    return `curl -X POST "${baseUrl}/processa-richiesta" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payload)}'`;
  };

  const generateHistoryUrl = () => {
    if (!historyToken) return "";
    
    const payload = {
      token: historyToken
    };
    
    return `curl -X POST "${baseUrl}/storico" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payload)}'`;
  };

  const generateProductsUrl = () => {
    return `curl -X GET "${baseUrl}/get-products" \\
  -H "Content-Type: application/json"`;
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
    
    try {
      const { data, error } = await supabase.functions.invoke('processa-richiesta', {
        body: {
          product_name: selectedProductData.name,
          token: token,
          qty: parseInt(quantity)
        }
      });

      if (error) throw error;

      if (data.success) {
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
          description: data.message || "Error processing request",
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
      const { data, error } = await supabase.functions.invoke('storico', {
        body: {
          token: historyToken
        }
      });

      if (error) throw error;

      setTransactions(data.transactions || []);
      
      if (!data.transactions || data.transactions.length === 0) {
        toast({
          title: "Info",
          description: "No transactions found for this token",
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

              {/* Show API URL for processing request */}
              {selectedProduct && token && quantity && (
                <div className="mt-6">
                  <Separator className="mb-4" />
                  <h3 className="font-semibold mb-3">HTTP API Call:</h3>
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium">Process Request</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(generateProcessRequestUrl())}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <code className="text-xs bg-white p-2 rounded block whitespace-pre-wrap">
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
                  <h3 className="font-semibold mb-3">HTTP API Call:</h3>
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium">Get History</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(generateHistoryUrl())}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <code className="text-xs bg-white p-2 rounded block whitespace-pre-wrap">
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
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">
                            {transaction.products?.name || 'Unknown product'}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            transaction.status === 'success' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {transaction.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <p>Quantity: {transaction.qty}</p>
                          <p>Date: {new Date(transaction.timestamp).toLocaleString('en-US')}</p>
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
              <CardTitle>API Endpoints</CardTitle>
              <CardDescription>
                HTTP endpoints for external integrations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-100 p-3 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium">Get Products</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(generateProductsUrl())}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <code className="text-xs bg-white p-2 rounded block whitespace-pre-wrap">
                  {generateProductsUrl()}
                </code>
              </div>

              <div className="text-sm text-gray-600 space-y-2">
                <p><strong>Base URL:</strong></p>
                <code className="bg-white p-2 rounded block text-xs break-all">
                  {baseUrl}
                </code>
                
                <p className="mt-4"><strong>Available Endpoints:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li><code>/get-products</code> - GET - Retrieve all products</li>
                  <li><code>/processa-richiesta</code> - POST - Process a request</li>
                  <li><code>/storico</code> - POST - Get transaction history</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
