
import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import RequestForm from "@/components/RequestForm";
import HistoryForm from "@/components/HistoryForm";
import ApiEndpointsPanel from "@/components/ApiEndpointsPanel";
import TransactionList from "@/components/TransactionList";

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
      console.log('Loading products from:', `${baseUrl}/api-products`);
      const response = await fetch(`${baseUrl}/api-products`);
      const data = await response.json();
      
      console.log('Products response:', data);
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load products');
      }
      
      setProducts(data.products || []);
      console.log('Products loaded successfully:', data.products?.length || 0);
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

  const handleProductSelect = (value: string) => {
    console.log('Product selected:', value);
    setSelectedProduct(value);
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
          <p className="text-sm text-green-600 font-medium">🔒 Secure API</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main form for request */}
          <div>
            <RequestForm
              products={products}
              selectedProduct={selectedProduct}
              token={token}
              quantity={quantity}
              loading={loading}
              onProductSelect={handleProductSelect}
              onTokenChange={setToken}
              onQuantityChange={setQuantity}
              onSubmit={handleSubmit}
              onCopyUrl={copyToClipboard}
              generateProcessRequestUrl={generateProcessRequestUrl}
              apiResult={apiResult}
            />
          </div>

          {/* Form for history */}
          <div>
            <HistoryForm
              historyToken={historyToken}
              historyLoading={historyLoading}
              onHistoryTokenChange={setHistoryToken}
              onHistorySubmit={handleHistorySubmit}
              onCopyUrl={copyToClipboard}
              generateHistoryUrl={generateHistoryUrl}
            />
            
            <TransactionList transactions={transactions} />
          </div>

          {/* API URLs panel */}
          <ApiEndpointsPanel
            baseUrl={baseUrl}
            onCopyUrl={copyToClipboard}
            generateProductsUrl={generateProductsUrl}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
