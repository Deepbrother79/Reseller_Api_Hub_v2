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
import FAQ from '@/components/FAQ';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [activated, setActivated] = useState<boolean | undefined>(undefined);
  const [locked, setLocked] = useState<boolean | undefined>(undefined);
  const [activationStatus, setActivationStatus] = useState<string>('');
  const [showOnlyAvailableProducts, setShowOnlyAvailableProducts] = useState(true);
  const [productFilter, setProductFilter] = useState('');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
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

  // Filter full products based on availability and search filter
  const filteredFullProducts = fullProducts.filter(product => {
    // First apply availability filter
    if (showOnlyAvailableProducts) {
      if (product.quantity === null || product.quantity <= 0) {
        return false;
      }
    }
    
    // Then apply search filter
    if (productFilter.trim()) {
      const searchTerm = productFilter.toLowerCase().trim();
      const matchesId = product.id.toLowerCase().includes(searchTerm);
      const matchesName = product.name.toLowerCase().includes(searchTerm);
      return matchesId || matchesName;
    }
    
    return true;
  });

  // Pagination logic
  const totalProducts = filteredFullProducts.length;
  const totalPages = Math.ceil(totalProducts / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedProducts = filteredFullProducts.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [productFilter, showOnlyAvailableProducts, pageSize]);

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
  const [showFAQ, setShowFAQ] = useState(false);

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
        
        // Set activated and locked states
        setActivated(data.activated);
        setLocked(data.locked);
        console.log('Set token states - activated:', data.activated, 'locked:', data.locked);
        
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
        setActivated(undefined);
        setLocked(undefined);
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
      setCredits(null);
      setTokenProductName('');
      setTokenProductId('');
      setIsMasterToken(false);
      setActivated(undefined);
      setLocked(undefined);
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
      const response = await fetch(`${baseUrl}/api-history?token=${encodeURIComponent(historyToken)}`);
      const data = await response.json();

      if (data.success) {
        // Set credits and token info from the unified response
        if (typeof data.credits === 'number') {
          setCredits(data.credits);
        } else {
          setCredits(null);
        }

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
        
        // Set activated and locked states
        setActivated(data.activated);
        setLocked(data.locked);
        setActivationStatus(''); // Reset activation status for successful cases
        console.log('Set token states from history - activated:', data.activated, 'locked:', data.locked);

        // Set product ID for non-master tokens
        if (!isMaster && data.product_id && typeof data.product_id === 'string') {
          setTokenProductId(data.product_id);
          console.log('Set tokenProductId from history API to:', data.product_id);
        } else if (!isMaster && data.product_name) {
          // If no product_id but we have product_name, lookup from products array
          console.log('No product_id in history response, looking up by product_name:', data.product_name);
          
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
            console.log('No product_id and no product_name in history response:', data);
          }
        }

        // Set transactions
        if (data.transactions && Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
          toast({
            title: "Success",
            description: `Found ${data.transactions.length} transactions`,
          });
        } else {
          setTransactions([]);
          toast({
            title: "Info",
            description: data.message || "No transactions found",
          });
        }
      } else {
        // Check if this is a pending or rejected activation case (has token data despite error)
        if ((data.activation_status === 'Pending' || data.activation_status === 'Rejected') && data.credits !== undefined) {
          // Handle pending/rejected activation - show token data but display appropriate message
          setCredits(data.credits);
          setTokenProductName(data.product_name || '');
          setTokenProductId(data.product_id || '');
          setIsMasterToken(Boolean(data.is_master_token));
          setActivated(data.activated);
          setLocked(data.locked);
          setActivationStatus(data.activation_status);
          setTransactions([]); // No transactions for pending/rejected tokens
          
          const isRejected = data.activation_status === 'Rejected';
          toast({
            title: isRejected ? "Activation Rejected" : "Activation Pending",
            description: data.error || (isRejected ? "Activation Rejected - Contact the dealer" : "Activation Pending - Contact the dealer"),
            variant: "destructive",
          });
        } else {
          // When API fails or returns other errors, reset values
          console.log('History API returned error or invalid data:', data);
          setCredits(null);
          setTokenProductName('');
          setTokenProductId('');
          setIsMasterToken(false);
          setActivated(undefined);
          setLocked(undefined);
          setActivationStatus('');
          setTransactions([]);
          
          toast({
            title: "Info",
            description: data.message || data.error || "No data found",
          });
        }
      }
    } catch (error) {
      console.error('Error:', error);
      
      // Reset all values on error
      setCredits(null);
      setTokenProductName('');
      setTokenProductId('');
      setIsMasterToken(false);
      setActivated(undefined);
      setLocked(undefined);
      setActivationStatus('');
      setTransactions([]);
      
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
    setActivated(undefined); // Reset activated state when token changes
    setLocked(undefined); // Reset locked state when token changes
    setActivationStatus(''); // Reset activation status when token changes
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
        <div className="mb-8">
          {/* Header with title and buttons */}
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-6">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                API Hub Dashboard
              </h1>
              <p className="text-gray-600 text-lg">Manage your API requests and view transaction history</p>
            </div>
            
            {/* Navigation buttons */}
            <div className="flex flex-wrap justify-center lg:justify-end gap-2 lg:gap-3">
              <Button 
                onClick={() => setShowFAQ(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 lg:px-4 lg:py-3 text-sm lg:text-base flex items-center gap-2"
              >
                <HelpCircle className="h-4 w-4" />
                <span className="hidden sm:inline">FAQ</span>
              </Button>
              <Button 
                onClick={() => window.location.href = '/services-utils'}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 lg:px-6 lg:py-3 text-sm lg:text-base"
              >
                Services & Utils
              </Button>
            </div>
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
            activated={activated}
            locked={locked}
            activationStatus={activationStatus}
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
            <CardHeader className="flex flex-col space-y-4 pb-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                <CardTitle>Products Inventory</CardTitle>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="Filter by ID or name..."
                      value={productFilter}
                      onChange={(e) => setProductFilter(e.target.value)}
                      className="w-48"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-gray-600 whitespace-nowrap">per page</span>
                  </div>
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
                </div>
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
                  {paginatedProducts.map((product) => (
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
              
              {/* Pagination Controls */}
              {totalProducts > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    Showing {startIndex + 1}-{Math.min(endIndex, totalProducts)} of {totalProducts} products
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* FAQ Modal */}
      <FAQ isOpen={showFAQ} onClose={() => setShowFAQ(false)} />
    </div>
  );
};

export default Index;
