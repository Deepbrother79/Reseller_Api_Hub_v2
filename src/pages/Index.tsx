import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import RequestForm from '@/components/RequestForm';
import HistoryForm from '@/components/HistoryForm';
import ApiEndpointsPanel from '@/components/ApiEndpointsPanel';
import TransactionList from '@/components/TransactionList';
import RefundForm from '@/components/RefundForm';
import CategoryFilter from '@/components/CategoryFilter';
import { NotificationPopup } from '@/components/NotificationPopup';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  short_description?: string;
  category: string;
  subcategory: string;
  quantity?: number;
  value?: number;
}

interface FullProduct {
  id: string;
  name: string;
  quantity: number | null;
  value?: number;
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
  const [fullProducts, setFullProducts] = useState<FullProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [token, setToken] = useState('');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiResult, setApiResult] = useState<any>(null);
  
  // Category filter states
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSubcategory, setSelectedSubcategory] = useState('All');
  
  const [historyToken, setHistoryToken] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [credits, setCredits] = useState<number | null>(null);
  const [tokenProductName, setTokenProductName] = useState<string>('');
  
  const { toast } = useToast();

  const baseUrl = 'https://vvtnzixsxfjzwhjetrfm.supabase.co/functions/v1';

  // Filter products based on selected category and subcategory
  const filteredProducts = products.filter(product => {
    if (selectedCategory === 'All') return true;
    if (product.category !== selectedCategory) return false;
    if (selectedSubcategory === 'All') return true;
    return product.subcategory === selectedSubcategory;
  });

  // Handle category change
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSelectedSubcategory('All'); // Reset subcategory when category changes
    setSelectedProduct(''); // Reset selected product
  };

  // Handle subcategory change
  const handleSubcategoryChange = (subcategory: string) => {
    setSelectedSubcategory(subcategory);
    setSelectedProduct(''); // Reset selected product
  };

  // Load products on component mount
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const productsUrl = `${baseUrl}/api-products-internal-gt45dsqt1plqkwsxcz`;
        console.log('Loading products from:', productsUrl);
        
        const response = await fetch(productsUrl);
        const data = await response.json();
        console.log('Products response:', data);
        
        if (data.success && data.products) {
          setProducts(data.products);
          console.log('Products loaded successfully:', data.products.length);
        }
      } catch (error) {
        console.error('Error loading products:', error);
        toast({
          title: "Error",
          description: "Failed to load products",
          variant: "destructive",
        });
      }
    };

    const loadFullProducts = async () => {
      try {
        const productsUrl = `${baseUrl}/api-items`;
        console.log('Loading full products from:', productsUrl);
        
        const response = await fetch(productsUrl);
        const data = await response.json();
        console.log('Full products response:', data);
        
        if (data.success && data.products) {
          setFullProducts(data.products);
          console.log('Full products loaded successfully:', data.products.length);
        }
      } catch (error) {
        console.error('Error loading full products:', error);
        toast({
          title: "Error",
          description: "Failed to load product details",
          variant: "destructive",
        });
      }
    };

    loadProducts();
    loadFullProducts();
  }, [toast, baseUrl]);

  // State for tracking which products have updated quantities
  const [updatedProductIds, setUpdatedProductIds] = useState<Set<string>>(new Set());
  
  // State for notification popup visibility
  const [showNotifications, setShowNotifications] = useState(false);

  // Subscribe to realtime updates for products quantity
  useEffect(() => {
    const channel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products'
        },
        (payload) => {
          const updatedProduct = payload.new as FullProduct;
          
          // Add visual feedback for updated quantity
          setUpdatedProductIds(prev => new Set(prev).add(updatedProduct.id));
          
          // Update products list
          setProducts(prev => prev.map(product => 
            product.id === updatedProduct.id 
              ? { ...product, quantity: updatedProduct.quantity }
              : product
          ));
          
          // Update full products list
          setFullProducts(prev => prev.map(product => 
            product.id === updatedProduct.id 
              ? { ...product, quantity: updatedProduct.quantity }
              : product
          ));

          // Note: selectedProduct is just an ID string, no need to update it here

          // Remove visual feedback after animation
          setTimeout(() => {
            setUpdatedProductIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(updatedProduct.id);
              return newSet;
            });
          }, 1000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: "URL copied to clipboard",
      });
    }).catch(() => {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    });
  };

  const generateProcessRequestUrl = () => {
    if (!selectedProduct || !token || !quantity) return '';
    const selectedProductData = products.find(p => p.id === selectedProduct);
    const productName = selectedProductData?.name || '';
    return `${baseUrl}/api-process?product_name=${encodeURIComponent(productName)}&token=${encodeURIComponent(token)}&qty=${quantity}`;
  };

  const generateProcessRequestBody = () => {
    if (!selectedProduct || !token || !quantity) return '';
    const selectedProductData = products.find(p => p.id === selectedProduct);
    const productName = selectedProductData?.name || '';
    return JSON.stringify({
      product_name: productName,
      token: token,
      qty: parseInt(quantity)
    });
  };

  const generateHistoryUrl = () => {
    if (!historyToken) return '';
    return `${baseUrl}/api-history?token=${encodeURIComponent(historyToken)}`;
  };

  const generateCreditsUrl = () => {
    if (!historyToken) return '';
    return `${baseUrl}/api-credits?token=${encodeURIComponent(historyToken)}`;
  };

  const generateProductsUrl = () => {
    return `${baseUrl}/api-items`;
  };

  const generateRefundUrl = () => {
    return `${baseUrl}/api-refund`;
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

    setLoading(true);
    setApiResult(null);
    
    try {
      const selectedProductData = products.find(p => p.id === selectedProduct);
      const productName = selectedProductData?.name || '';

      const response = await fetch(`${baseUrl}/api-process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_name: productName,
          token: token,
          qty: parseInt(quantity)
        })
      });

      const data = await response.json();
      setApiResult(data);

      if (data.success) {
        toast({
          title: "Success",
          description: data.message || "Request processed successfully",
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "Request failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to process request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCreditsForToken = async (tokenValue: string) => {
    try {
      const response = await fetch(`${baseUrl}/api-credits?token=${encodeURIComponent(tokenValue)}`);
      const data = await response.json();
      
      console.log('Credits API response:', data);
      
      if (response.ok && data.success && typeof data.credits === 'number') {
        setCredits(data.credits);
        
        // Set product name associated with this token
        if (data.product_name && typeof data.product_name === 'string') {
          setTokenProductName(data.product_name);
        } else {
          setTokenProductName('');
        }
      } else {
        // When API fails or returns error, reset values
        console.log('Credits API returned error or invalid data:', data);
        setCredits(null);
        setTokenProductName('');
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
      setCredits(null);
      setTokenProductName('');
    }
  };

  const handleHistorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!historyToken) {
      toast({
        title: "Error",
        description: "Please enter a token",
        variant: "destructive",
      });
      return;
    }

    setHistoryLoading(true);
    setTransactions([]);

    try {
      // Fetch credits first
      await fetchCreditsForToken(historyToken);

      const response = await fetch(`${baseUrl}/api-history?token=${encodeURIComponent(historyToken)}`);
      const data = await response.json();

      if (data.success && data.transactions) {
        setTransactions(data.transactions);
        toast({
          title: "Success",
          description: `Found ${data.transactions.length} transactions`,
        });
      } else {
        toast({
          title: "Info",
          description: data.message || "No transactions found",
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to fetch transaction history",
        variant: "destructive",
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleHistoryTokenChange = (value: string) => {
    setHistoryToken(value);
    setCredits(null); // Reset credits when token changes
    setTokenProductName(''); // Reset product name when token changes
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <NotificationPopup forceVisible={showNotifications} onClose={() => setShowNotifications(false)} />
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 relative">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">API Management Dashboard</h1>
          <p className="text-xl text-gray-600 mb-4">Manage your API requests and view transaction history</p>
          
          {/* Top right buttons */}
          <div className="absolute top-0 right-0 flex gap-3">
            <Button 
              onClick={() => setShowNotifications(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 text-lg"
            >
              <Bell className="h-5 w-5 mr-2" />
              Notifiche
            </Button>
            <Button 
              onClick={() => window.location.href = '/services-utils'}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 text-lg"
            >
              Services & Utils
            </Button>
          </div>
          
          {/* Category Filter */}
          <div className="mt-6">
            <CategoryFilter
              products={products}
              selectedCategory={selectedCategory}
              selectedSubcategory={selectedSubcategory}
              onCategoryChange={handleCategoryChange}
              onSubcategoryChange={handleSubcategoryChange}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RequestForm
            products={filteredProducts}
            selectedProduct={selectedProduct}
            token={token}
            quantity={quantity}
            loading={loading}
            onProductSelect={setSelectedProduct}
            onTokenChange={setToken}
            onQuantityChange={setQuantity}
            onSubmit={handleSubmit}
            onCopyUrl={copyToClipboard}
            generateProcessRequestUrl={generateProcessRequestUrl}
            generateProcessRequestBody={generateProcessRequestBody}
            apiResult={apiResult}
            baseUrl={baseUrl}
            updatedProductIds={updatedProductIds}
          />

          <HistoryForm
            historyToken={historyToken}
            historyLoading={historyLoading}
            credits={credits}
            tokenProductName={tokenProductName}
            onHistoryTokenChange={handleHistoryTokenChange}
            onHistorySubmit={handleHistorySubmit}
            onCopyUrl={copyToClipboard}
            generateHistoryUrl={generateHistoryUrl}
            generateCreditsUrl={generateCreditsUrl}
          />
        </div>

        <div className="mt-6">
          <ApiEndpointsPanel
            baseUrl={baseUrl}
            onCopyUrl={copyToClipboard}
            generateProductsUrl={generateProductsUrl}
            generateRefundUrl={generateRefundUrl}
          />
        </div>

        <div className="mt-6">
          <RefundForm baseUrl={baseUrl} onCopyUrl={copyToClipboard} />
        </div>

        <TransactionList transactions={transactions} />

        {/* Products Table */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Products Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Value USD (Credits Master)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fullProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono text-sm">{product.id}</TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-sm transition-all duration-300 ${
                          updatedProductIds.has(product.id)
                            ? 'animate-pulse bg-yellow-200 text-yellow-800 scale-110 shadow-lg' 
                            : product.quantity === null 
                              ? 'bg-gray-100 text-gray-500' 
                              : product.quantity > 0 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                        }`}>
                          {product.quantity === null ? 'N/A' : product.quantity}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded text-sm bg-blue-100 text-blue-800">
                          {product.value?.toFixed(4) || '1.0000'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {fullProducts.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No products found
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
