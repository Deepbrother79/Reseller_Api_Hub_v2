import React, { useState, useEffect, useRef } from 'react';
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
  const [useMasterToken, setUseMasterToken] = useState(false);
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
  const [tokenProductId, setTokenProductId] = useState<string>('');
  const [isMasterToken, setIsMasterToken] = useState<boolean>(false);
  const [showOnlyAvailableProducts, setShowOnlyAvailableProducts] = useState(true);
  
  // Refs for scrolling functionality
  const requestFormRef = useRef<HTMLDivElement>(null);
  const transactionsRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();

  const baseUrl = 'https://vvtnzixsxfjzwhjetrfm.supabase.co/functions/v1';

  // Filter products based on selected category and subcategory
  const filteredProducts = products.filter(product => {
    if (selectedCategory === 'All') return true;
    if (product.category !== selectedCategory) return false;
    if (selectedSubcategory === 'All') return true;
    return product.subcategory === selectedSubcategory;
  });

  // Filter full products based on availability
  const filteredFullProducts = fullProducts.filter(product => {
    if (showOnlyAvailableProducts) {
      return product.quantity !== null && product.quantity > 0;
    }
    return true;
  });

  // Handle category change
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSelectedSubcategory('All'); // Reset subcategory when category changes
    setSelectedProduct(''); // Reset selected product
    
    // Show toast to inform user that product selection was cleared
    if (selectedProduct) {
      toast({
        title: "Product Selection Cleared",
        description: `Product selection cleared due to category change`,
      });
    }
  };

  // Handle subcategory change
  const handleSubcategoryChange = (subcategory: string) => {
    setSelectedSubcategory(subcategory);
    setSelectedProduct(''); // Reset selected product
    
    // Show toast to inform user that product selection was cleared
    if (selectedProduct) {
      toast({
        title: "Product Selection Cleared", 
        description: `Product selection cleared due to subcategory change`,
      });
    }
  };

  // Handle product click from inventory table
  const handleProductClick = (productId: string) => {
    // Find the product in the main products array
    const product = products.find(p => p.id === productId);
    
    if (product) {
      // Set the selected product
      setSelectedProduct(productId);
      
      // Update category filters to match the selected product
      setSelectedCategory(product.category);
      setSelectedSubcategory(product.subcategory);
      
      // Scroll to the request form
      if (requestFormRef.current) {
        requestFormRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
      
      // Show success toast
      toast({
        title: "Product Selected",
        description: `Selected: ${product.name}`,
      });
    } else {
      // If product not found in main products array, show warning
      toast({
        title: "Product Not Available",
        description: "This product is not available for requests",
        variant: "destructive",
      });
    }
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
    return `https://api.accshub.org/process?product_id=${encodeURIComponent(selectedProduct)}&token=${encodeURIComponent(token)}&qty=${quantity}`;
  };

  const generateProcessRequestBody = () => {
    if (!selectedProduct || !token || !quantity) return '';
    return JSON.stringify({
      product_id: selectedProduct,
      token: token,
      qty: parseInt(quantity),
      use_master_token: useMasterToken
    });
  };

  const generateHistoryUrl = () => {
    if (!historyToken) return '';
    return `https://api.accshub.org/history?token=${encodeURIComponent(historyToken)}`;
  };

  const generateCreditsUrl = () => {
    if (!historyToken) return '';
    return `https://api.accshub.org/credits?token=${encodeURIComponent(historyToken)}`;
  };

  const generateProductsUrl = () => {
    return `https://api.accshub.org/items`;
  };

  const generateRefundUrl = () => {
    return `https://api.accshub.org/api-refund`;
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
      const response = await fetch(`${baseUrl}/api-process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: selectedProduct,
          token: token,
          qty: parseInt(quantity),
          use_master_token: useMasterToken
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
        
        console.log('Credits API full response data:', data);
        
        // Set product name and other token information
        if (data.product_name && typeof data.product_name === 'string') {
          setTokenProductName(data.product_name);
        } else {
          setTokenProductName('');
        }
        
        // Set master token flag
        const isMaster = Boolean(data.is_master_token);
        setIsMasterToken(isMaster);
        console.log('Set isMasterToken to:', isMaster);
        
        // Set product ID for non-master tokens directly from credits API
        if (!isMaster && data.product_id && typeof data.product_id === 'string') {
          setTokenProductId(data.product_id);
          console.log('Set tokenProductId from credits API to:', data.product_id);
        } else if (!isMaster && data.product_name) {
          // If no product_id but we have product_name, lookup from products array
          console.log('No product_id in credits response, looking up by product_name:', data.product_name);
          
          // First try in products array
          let foundProduct = products.find(p => p.name === data.product_name);
          if (!foundProduct) {
            // Try in fullProducts array as fallback
            foundProduct = fullProducts.find(p => p.name === data.product_name);
          }
          
          if (foundProduct) {
            setTokenProductId(foundProduct.id);
            console.log('Found product_id by name lookup in frontend:', foundProduct.id);
          } else {
            // If not found in loaded arrays, try to fetch from API
            console.log('Product not found in loaded arrays, fetching from API...');
            try {
              const productsResponse = await fetch(`${baseUrl}/api-products-internal-gt45dsqt1plqkwsxcz`);
              const productsData = await productsResponse.json();
              
              if (productsData.success && productsData.products) {
                const apiProduct = productsData.products.find((p: any) => p.name === data.product_name);
                if (apiProduct) {
                  setTokenProductId(apiProduct.id);
                  console.log('Found product_id by API lookup:', apiProduct.id);
                } else {
                  setTokenProductId('');
                  console.log('Product not found even in API lookup:', data.product_name);
                }
              } else {
                setTokenProductId('');
                console.log('Failed to fetch products from API for lookup');
              }
            } catch (error) {
              console.error('Error fetching products for lookup:', error);
              setTokenProductId('');
            }
          }
        } else {
          setTokenProductId('');
          if (!isMaster) {
            console.log('No product_id and no product_name in credits response:', data);
          }
        }
      } else {
        // When API fails or returns error, reset values
        console.log('Credits API returned error or invalid data:', data);
        setCredits(null);
        setTokenProductName('');
        setTokenProductId('');
        setIsMasterToken(false);
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
      setCredits(null);
      setTokenProductName('');
      setTokenProductId('');
      setIsMasterToken(false);
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
    setTokenProductId(''); // Reset product ID when token changes
    setIsMasterToken(false); // Reset master token flag when token changes
  };

  // Handle credit box click to auto-fill request form
  const handleCreditBoxClick = () => {
    console.log('Credit box clicked:', {
      isMasterToken,
      tokenProductId,
      historyToken,
      productsLength: products.length
    });

    if (isMasterToken) {
      // For master tokens: only fill token and set master token flag
      setToken(historyToken);
      setUseMasterToken(true);
      setQuantity('');
      
      toast({
        title: "Form Auto-filled",
        description: "Master token settings applied",
      });
    } else if (tokenProductId) {
      // For regular tokens: fill product, token, and uncheck master token
      console.log('Setting product ID:', tokenProductId);
      
      // First check if product exists in the main products array
      const productInMainArray = products.find(p => p.id === tokenProductId);
      const productInFullArray = fullProducts.find(p => p.id === tokenProductId);
      
      console.log('Product search results:', {
        productInMainArray,
        productInFullArray,
        mainArrayLength: products.length,
        fullArrayLength: fullProducts.length
      });
      
      // Set the selected product regardless of whether it's found in products array
      // The RequestForm will handle the display properly
      setSelectedProduct(tokenProductId);
      setToken(historyToken);
      setUseMasterToken(false);
      setQuantity('');
      
      // Update category filters based on available product data
      const productForCategories = productInMainArray || productInFullArray;
      
      if (productForCategories) {
        // If we found the product in either array, use its categories
        if (productForCategories.category) {
          setSelectedCategory(productForCategories.category);
        } else {
          setSelectedCategory('All');
        }
        
        if (productForCategories.subcategory) {
          setSelectedSubcategory(productForCategories.subcategory);
        } else {
          setSelectedSubcategory('All');
        }
        
        console.log('Updated categories from product:', productForCategories.category, productForCategories.subcategory);
      } else {
        // If product not found in either array, show all categories
        setSelectedCategory('All');
        setSelectedSubcategory('All');
        console.log('Product not found in either array, showing all categories');
      }
      
      toast({
        title: "Form Auto-filled",
        description: productInMainArray 
          ? "Product and token settings applied" 
          : "Token settings applied (product may not be in current filter)",
      });
    } else {
      toast({
        title: "Auto-fill Error",
        description: "No product information available",
        variant: "destructive",
      });
      return;
    }
    
    // Scroll to request form
    if (requestFormRef.current) {
      requestFormRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  };

  // Handle scroll to transactions
  const handleScrollToTransactions = () => {
    if (transactionsRef.current) {
      transactionsRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
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
              📰 News
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" ref={requestFormRef}>
          <RequestForm
            products={filteredProducts}
            fullProducts={fullProducts}
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
            useMasterToken={useMasterToken}
            setUseMasterToken={setUseMasterToken}
          />

          <HistoryForm
            historyToken={historyToken}
            historyLoading={historyLoading}
            credits={credits}
            tokenProductName={tokenProductName}
            tokenProductId={tokenProductId}
            isMasterToken={isMasterToken}
            onHistoryTokenChange={handleHistoryTokenChange}
            onHistorySubmit={handleHistorySubmit}
            onCopyUrl={copyToClipboard}
            generateHistoryUrl={generateHistoryUrl}
            generateCreditsUrl={generateCreditsUrl}
            onCreditBoxClick={handleCreditBoxClick}
            onScrollToTransactions={handleScrollToTransactions}
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

        <div ref={transactionsRef}>
          <TransactionList transactions={transactions} />
        </div>

        {/* Products Table */}
        <div className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Products Inventory</CardTitle>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="availableOnly"
                  checked={showOnlyAvailableProducts}
                  onChange={(e) => setShowOnlyAvailableProducts(e.target.checked)}
                  className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-ring focus:ring-2"
                />
                <label htmlFor="availableOnly" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Show only available products
                </label>
              </div>
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
                  {filteredFullProducts.map((product) => (
                    <TableRow key={product.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell 
                        className="font-mono text-sm cursor-pointer hover:text-blue-600 hover:underline transition-colors" 
                        onClick={() => handleProductClick(product.id)}
                        title="Click to select this product"
                      >
                        {product.id}
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer hover:text-blue-600 hover:underline transition-colors font-medium" 
                        onClick={() => handleProductClick(product.id)}
                        title="Click to select this product"
                      >
                        {product.name}
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer hover:opacity-80 transition-opacity" 
                        onClick={() => handleProductClick(product.id)}
                        title="Click to select this product"
                      >
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
                      <TableCell 
                        className="cursor-pointer hover:opacity-80 transition-opacity" 
                        onClick={() => handleProductClick(product.id)}
                        title="Click to select this product"
                      >
                        <span className="px-2 py-1 rounded text-sm bg-blue-100 text-blue-800">
                          {product.value?.toFixed(4) || '1.0000'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredFullProducts.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  {showOnlyAvailableProducts ? 'No available products found' : 'No products found'}
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
