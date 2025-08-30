
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Copy, Search, X, ChevronDown } from "lucide-react";
import ProductTooltip from './ProductTooltip';
import { Checkbox } from "@/components/ui/checkbox";

interface Product {
  id: string;
  name: string;
  short_description?: string;
  quantity?: number;
  value?: number;
  category?: string;
  subcategory?: string;
}

interface RequestFormProps {
  products: Product[];
  fullProducts?: Product[];
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
  updatedProductIds?: Set<string>;
  useMasterToken: boolean;
  setUseMasterToken: (v: boolean) => void;
}

const RequestForm: React.FC<RequestFormProps> = ({
  products,
  fullProducts = [],
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
  baseUrl,
  updatedProductIds = new Set(),
  useMasterToken,
  setUseMasterToken
}) => {
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const productDropdownRef = useRef<HTMLDivElement>(null);
  
  // Try to find the selected product in the main products array first, then fallback to fullProducts
  const selectedProductData = products.find(p => p.id === selectedProduct) || 
                              fullProducts.find(p => p.id === selectedProduct);
  
  // Debug logging for product selection
  if (selectedProduct && !selectedProductData) {
    console.log('RequestForm: Selected product not found in either array:', {
      selectedProduct,
      productsCount: products.length,
      fullProductsCount: fullProducts.length,
      productsIds: products.map(p => p.id).slice(0, 5),
      fullProductsIds: fullProducts.map(p => p.id).slice(0, 5)
    });
  } else if (selectedProduct && selectedProductData) {
    console.log('RequestForm: Found selected product:', {
      selectedProduct,
      productName: selectedProductData.name,
      foundInMainArray: !!products.find(p => p.id === selectedProduct),
      foundInFullArray: !!fullProducts.find(p => p.id === selectedProduct)
    });
  }

  // Filter products based on search query (supports name, ID, and description)
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    
    const query = productSearch.toLowerCase().trim();
    return products.filter(product => {
      const nameMatch = product.name.toLowerCase().includes(query);
      const idMatch = product.id.toLowerCase().includes(query);
      const descriptionMatch = product.short_description?.toLowerCase().includes(query) || false;
      return nameMatch || idMatch || descriptionMatch;
    });
  }, [products, productSearch]);

  // Hook for click-outside functionality
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update search input when product is selected externally
  useEffect(() => {
    if (selectedProductData) {
      setProductSearch(selectedProductData.name);
    } else {
      // Clear search input when no product is selected
      setProductSearch('');
    }
  }, [selectedProductData]);

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
          <div className="space-y-2" ref={productDropdownRef}>
            <Label htmlFor="product-search">Product Name or Id</Label>
            
            {/* Advanced search input with custom dropdown */}
            <div className="relative">
              <Input
                id="product-search"
                type="text"
                placeholder="Type product name or ID..."
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setShowProductDropdown(true);
                }}
                onFocus={() => setShowProductDropdown(true)}
                className="pr-20"
              />
              
              {/* Clear button (X) */}
              {productSearch && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-10 top-1 h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                  onClick={() => {
                    setProductSearch('');
                    onProductSelect('');
                    setShowProductDropdown(false);
                  }}
                  title="Clear selection"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              
              {/* Dropdown toggle button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-8 w-8 p-0 hover:bg-gray-100"
                onClick={() => {
                  setShowProductDropdown(!showProductDropdown);
                }}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>

            {/* Custom dropdown with filtered products */}
            {showProductDropdown && (
              <div className="relative">
                <div className="absolute top-0 left-0 right-0 z-10 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        className="p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        onClick={() => {
                          onProductSelect(product.id);
                          setProductSearch(product.name);
                          setShowProductDropdown(false);
                        }}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{product.name}</span>
                          <span className="text-xs text-gray-400 mt-0.5">ID: {product.id}</span>
                          {product.short_description && (
                            <span className="text-xs text-gray-500 mt-1">
                              {product.short_description}
                            </span>
                          )}
                          {product.quantity !== undefined && (
                            <div className="flex items-center mt-1 gap-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                updatedProductIds.has(product.id)
                                  ? 'animate-pulse bg-yellow-200 text-yellow-800'
                                  : product.quantity === null || product.quantity === undefined
                                    ? 'bg-gray-100 text-gray-500' 
                                    : product.quantity >= 1 
                                      ? 'bg-green-100 text-green-700' 
                                      : 'bg-red-100 text-red-700'
                              }`}>
                                Qty: {product.quantity === null || product.quantity === undefined ? 'N/A' : product.quantity}
                              </span>
                              {product.value && (
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                  {product.value.toFixed(4)} credits
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-gray-500 text-sm">
                      {productSearch.trim() === '' ? 'Type product name or ID...' : `No products found for "${productSearch}"`}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Fallback traditional select (hidden by default, can be shown if needed) */}
            <div className="hidden">
              <Select value={selectedProduct} onValueChange={(value) => {
                onProductSelect(value);
                const selectedProduct = products.find(p => p.id === value);
                if (selectedProduct) {
                  setProductSearch(selectedProduct.name);
                }
              }}>
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
            
            {products.length === 0 && (
              <p className="text-sm text-gray-500">Loading products...</p>
            )}
            
            {/* Show selected product description with quantity */}
            {selectedProductData && (
              <div className="mt-2">
                <ProductTooltip 
                  productName={selectedProductData.name}
                  description={selectedProductData.short_description || 'No description available'}
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
                        <span className={`px-2 py-1 rounded text-xs font-medium transition-all duration-300 ${
                          updatedProductIds.has(selectedProductData.id)
                            ? 'animate-pulse bg-yellow-200 text-yellow-800 scale-110 shadow-lg'
                            : selectedProductData.quantity === null || selectedProductData.quantity === undefined
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
            <div className="flex items-center gap-2 pt-1">
              <Checkbox id="use-master" checked={useMasterToken} onCheckedChange={(v) => setUseMasterToken(Boolean(v))} />
              <Label htmlFor="use-master" className="text-sm">Use Master Token</Label>
            </div>
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
            
            {/* Show total value calculation */}
            {selectedProductData && quantity && !isNaN(parseInt(quantity)) && (
              <div className="mt-2 p-2 bg-yellow-50 rounded border-l-4 border-yellow-200">
                <div className="text-sm">
                  <span className="text-gray-600">Total Value USD (Credits Master): </span>
                  <span className="font-semibold text-yellow-700">
                    {(parseInt(quantity) * (selectedProductData.value || 1)).toFixed(4)} credits master
                  </span>
                  {selectedProductData.value && selectedProductData.value !== 1 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {quantity} × {selectedProductData.value.toFixed(4)} credits per unit
                    </div>
                  )}
                </div>
              </div>
            )}
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

        {/* Show Transaction ID if available */}
        {apiResult && apiResult.transaction_id && (
          <div className="mt-4">
            <h3 className="font-semibold mb-3">Transaction ID:</h3>
            <div className="bg-gray-100 p-3 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-green-600">Transaction ID</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCopyUrl(apiResult.transaction_id)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <input
                className="w-full text-xs bg-white p-2 rounded border font-mono"
                value={apiResult.transaction_id}
                readOnly
                placeholder="Transaction ID will appear here..."
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
                  onClick={() => onCopyUrl(`https://api.accshub.org/process`)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <code className="text-xs bg-white p-2 rounded block break-all">
                https://api.accshub.org/process
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
