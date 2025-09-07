import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, HelpCircle, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  tags: string[];
}

interface FAQProps {
  isOpen: boolean;
  onClose: () => void;
}

const faqData: FAQItem[] = [
  // Getting Started
  {
    id: "what-is-hub",
    category: "🔰 Getting Started",
    question: "What is the Token Transaction Hub?",
    answer: "The Token Transaction Hub is a React-based web application for managing digital token transactions and API services. It provides a dashboard for processing requests, viewing transaction history, checking balances, and accessing utility services like 2FA generation and email inbox reading.",
    tags: ["overview", "introduction", "hub"]
  },
  {
    id: "what-are-tokens",
    category: "🔰 Getting Started",
    question: "What are tokens and how do they work?",
    answer: "Tokens are authorization credentials that come in two types:\n• **Regular Tokens**: Tied to specific products, have limited credits, and can only be used for their designated product\n• **Master Tokens**: Universal tokens that work with any product and have elevated privileges",
    tags: ["tokens", "authorization", "credits"]
  },
  {
    id: "check-balance",
    category: "🔰 Getting Started",
    question: "How do I check my token balance and information?",
    answer: "Enter your token in the \"Search Token - Transaction History & Balance\" section and click \"View History & Balance\". This will show your credit balance, associated product name (for regular tokens), and transaction history.",
    tags: ["balance", "credits", "history"]
  },

  // Product Selection
  {
    id: "select-product",
    category: "📦 Product Selection",
    question: "How do I find and select a product?",
    answer: "You can select products in multiple ways:\n1. **Search by name or ID**: Type in the product search box - it supports partial matches\n2. **Category filtering**: Use the category and subcategory filters\n3. **Click from inventory**: Click any product in the \"Products Inventory\" table\n4. **Auto-fill from token**: After checking your token balance, click the credit box",
    tags: ["products", "search", "selection", "auto-fill"]
  },
  {
    id: "quantity-colors",
    category: "📦 Product Selection",
    question: "What do the quantity colors mean in the product inventory?",
    answer: "• **Green**: Product is available (quantity > 0)\n• **Red**: Product is out of stock (quantity = 0)\n• **Gray**: Quantity information not available\n• **Yellow pulsing**: Product quantity was recently updated",
    tags: ["inventory", "quantity", "availability", "colors"]
  },
  {
    id: "missing-products",
    category: "📦 Product Selection",
    question: "Why can't I see some products in the dropdown?",
    answer: "Products are filtered based on:\n• Selected category and subcategory filters\n• The main product list only shows products available for requests\n• Use the \"Products Inventory\" table to see all products with their current quantities",
    tags: ["products", "filters", "visibility"]
  },

  // Transaction Processing
  {
    id: "submit-request",
    category: "💳 Transaction Processing",
    question: "How do I submit a request?",
    answer: "1. Select a product using search or filters\n2. Enter your token/voucher\n3. Check \"Use Master Token\" if applicable\n4. Enter the desired quantity\n5. Review the total credit cost calculation\n6. Click \"Submit Request\"",
    tags: ["submit", "request", "transaction", "process"]
  },
  {
    id: "after-submit",
    category: "💳 Transaction Processing",
    question: "What happens after I submit a request?",
    answer: "The system will:\n• Process your request through the secure API\n• Display a transaction ID if successful\n• Show the output results in a copyable format\n• Update your transaction history\n• Deduct credits from your token (for regular tokens)",
    tags: ["transaction", "processing", "results", "credits"]
  },
  {
    id: "calculate-cost",
    category: "💳 Transaction Processing",
    question: "How do I calculate the total cost before submitting?",
    answer: "The system automatically calculates the total cost as: `quantity × product value (in credits)`. This is displayed in yellow below the quantity field when both product and quantity are selected.",
    tags: ["cost", "calculation", "credits", "pricing"]
  },
  {
    id: "copy-api",
    category: "💳 Transaction Processing",
    question: "Can I copy the API request details?",
    answer: "Yes, when you have filled out the form, the system displays:\n• POST request URL (https://api.accshub.org/process)\n• JSON request body with all parameters\n• Both can be copied with the copy button for external API usage",
    tags: ["api", "copy", "request", "integration"]
  },

  // Transaction History
  {
    id: "view-history",
    category: "📊 Transaction History",
    question: "How do I view my transaction history?",
    answer: "1. Enter your token in the history section\n2. Click \"View History & Balance\"\n3. Your transactions will appear below with details like status, quantity, results, and timestamps\n4. Click \"View Transactions\" in the credit box to scroll to the transactions list",
    tags: ["history", "transactions", "view", "timeline"]
  },
  {
    id: "request-refund",
    category: "📊 Transaction History",
    question: "How do I request a refund?",
    answer: "1. Locate your transaction ID from the transaction history\n2. Go to the \"💰 Refund Request\" section\n3. Enter the transaction ID\n4. Click \"Request Refund\"\n5. The system will process your refund request and show the status",
    tags: ["refund", "transaction", "request", "id"]
  },
  {
    id: "transaction-status",
    category: "📊 Transaction History",
    question: "What transaction statuses exist?",
    answer: "Common statuses include:\n• **Success**: Request completed successfully\n• **Failed**: Request failed due to various reasons\n• **Processing**: Request is still being processed\n• **Refunded**: Transaction has been refunded",
    tags: ["status", "transaction", "success", "failed"]
  },

  // Services & Utilities
  {
    id: "generate-2fa",
    category: "⚡ Services & Utilities",
    question: "How do I generate 2FA codes?",
    answer: "1. Go to Services & Utils → Get 2FA\n2. Enter your authenticator string (supports Google Authenticator otpauth:// URLs or base32 secrets)\n3. Click \"Generate 2FA Code\"\n4. Copy the 6-digit code (valid for 30 seconds)",
    tags: ["2fa", "authenticator", "totp", "security"]
  },
  {
    id: "read-inbox",
    category: "⚡ Services & Utilities",
    question: "How does the Read Inbox Mail service work?",
    answer: "This service has two modes:\n• **Transaction IDs mode**: Enter transaction IDs from inbox-compatible products (HOTMAIL-NEW-LIVE-1-12H, OUTLOOK-NEW-LIVE-1-12H)\n• **Email Strings mode**: Enter email addresses and provide an EMAIL-INBOX-READER token",
    tags: ["inbox", "email", "mail", "transaction", "hotmail", "outlook"]
  },
  {
    id: "oauth2-service",
    category: "⚡ Services & Utilities",
    question: "What is the Get OAuth2 Token service?",
    answer: "This service extracts OAuth2 refresh tokens and client IDs from Outlook/Hotmail credentials:\n1. Enter email:password or email|password combinations (one per line)\n2. Provide your GET-OAUTH2-TOKEN service token\n3. Results appear in real-time with success/fail status\n4. Export successful results for use in other applications",
    tags: ["oauth2", "refresh", "token", "outlook", "hotmail", "credentials"]
  },

  // Troubleshooting
  {
    id: "token-not-working",
    category: "🔧 Troubleshooting",
    question: "Why is my token not working?",
    answer: "Check the following:\n• Ensure you're using the correct token format\n• Verify the token hasn't expired or been exhausted\n• For regular tokens, make sure you're selecting the correct associated product\n• For services, ensure you have the right service-specific token",
    tags: ["token", "error", "troubleshooting", "expired"]
  },
  {
    id: "cant-select-product",
    category: "🔧 Troubleshooting",
    question: "Why can't I select a product?",
    answer: "Common reasons:\n• Product is out of stock (quantity = 0)\n• Product is not in the current category/subcategory filter\n• Your token is not compatible with the selected product\n• Try clearing filters or checking the \"Products Inventory\" table",
    tags: ["product", "selection", "stock", "filters", "compatibility"]
  },
  {
    id: "transaction-failed",
    category: "🔧 Troubleshooting",
    question: "My transaction failed - what should I do?",
    answer: "1. Check the error message in the API response\n2. Verify your token has sufficient credits\n3. Ensure the product is available\n4. Try again after a few minutes\n5. If still failing, submit a refund request using the transaction ID",
    tags: ["failed", "transaction", "error", "refund", "credits"]
  },
  {
    id: "quantity-na",
    category: "🔧 Troubleshooting",
    question: "Why are some products showing \"N/A\" for quantity?",
    answer: "This means:\n• The product doesn't have quantity tracking enabled\n• There's a temporary issue with inventory data\n• The product may be service-based rather than quantity-limited",
    tags: ["quantity", "na", "inventory", "tracking"]
  },

  // Security
  {
    id: "safe-tokens",
    category: "🔒 Security & Best Practices",
    question: "Is it safe to enter my tokens?",
    answer: "Yes, the application uses:\n• HTTPS encryption for all communications\n• Secure API endpoints (api.accshub.org)\n• No token storage in browser (tokens are only used for requests)\n• Supabase authentication and authorization",
    tags: ["security", "https", "encryption", "safe"]
  },
  {
    id: "share-tokens",
    category: "🔒 Security & Best Practices",
    question: "Should I share my tokens?",
    answer: "No, never share your tokens as they:\n• Provide access to your credits and services\n• Can be used to make requests on your behalf\n• May contain sensitive account information",
    tags: ["security", "sharing", "privacy", "tokens"]
  },
  {
    id: "master-vs-regular",
    category: "🔒 Security & Best Practices",
    question: "What's the difference between master tokens and regular tokens?",
    answer: "• **Master Tokens**: Work with any product, have elevated privileges, typically used for testing or admin purposes\n• **Regular Tokens**: Tied to specific products, have limited credits, designed for end-user consumption",
    tags: ["master", "regular", "tokens", "privileges", "credits"]
  },

  // Advanced Features
  {
    id: "auto-fill",
    category: "📈 Advanced Features",
    question: "How do I use the auto-fill functionality?",
    answer: "After checking your token balance:\n1. Click the green/gray credit information box\n2. The system automatically fills the request form with your token and associated product\n3. You only need to enter the desired quantity",
    tags: ["auto-fill", "balance", "form", "automation"]
  },
  {
    id: "live-updates",
    category: "📈 Advanced Features",
    question: "Can I monitor live updates?",
    answer: "Yes, the system provides real-time updates for:\n• Product quantity changes (shown with yellow pulsing animation)\n• OAuth2 processing status updates\n• New notifications via the News button\n• Transaction status changes",
    tags: ["live", "updates", "real-time", "notifications"]
  },
  {
    id: "export-oauth2",
    category: "📈 Advanced Features",
    question: "How do I export results from OAuth2 service?",
    answer: "Use the export buttons:\n• **Export Success**: Downloads successful OAuth2 tokens in format `email|password|refresh_token|client_id|`\n• **Export Fail**: Downloads failed attempts in format `email|password|Fail`",
    tags: ["export", "oauth2", "download", "results"]
  },

  // API Integration
  {
    id: "api-integration",
    category: "🔄 API Integration",
    question: "Can I use these services programmatically?",
    answer: "Yes, all services expose REST API endpoints:\n• **Process**: POST to https://api.accshub.org/process\n• **History**: GET https://api.accshub.org/unified?token=YOUR_TOKEN&action=history\n• **Credits**: GET https://api.accshub.org/unified?token=YOUR_TOKEN&action=credits\n• **Products**: GET https://api.accshub.org/items\n• **Refund**: POST to https://api.accshub.org/refund\n• **OAuth2**: POST to https://api.accshub.org/refreshtoken",
    tags: ["api", "endpoints", "integration", "programmatic", "rest"]
  },
  {
    id: "rate-limiting",
    category: "🔄 API Integration",
    question: "What's the rate limiting?",
    answer: "The system implements reasonable rate limiting:\n• OAuth2 service processes up to 10 requests in parallel\n• Maximum 100 credentials per OAuth2 request\n• Transaction processing depends on your token credits",
    tags: ["rate", "limiting", "parallel", "limits"]
  }
];

const categories = Array.from(new Set(faqData.map(item => item.category)));

const FAQ: React.FC<FAQProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const filteredFAQs = faqData.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === '' || item.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const formatAnswer = (answer: string) => {
    return answer.split('\n').map((line, index) => {
      if (line.startsWith('• **') && line.includes('**:')) {
        const parts = line.split('**:');
        const title = parts[0].replace('• **', '');
        const content = parts[1];
        return (
          <div key={index} className="mb-1">
            <span className="font-semibold text-blue-600">• {title}:</span>
            <span>{content}</span>
          </div>
        );
      } else if (line.startsWith('• ')) {
        return (
          <div key={index} className="mb-1 text-gray-700">
            {line}
          </div>
        );
      } else if (line.match(/^\d+\./)) {
        return (
          <div key={index} className="mb-1 font-medium text-gray-800">
            {line}
          </div>
        );
      } else if (line.includes('`') && line.includes('`')) {
        const parts = line.split('`');
        return (
          <div key={index} className="mb-1">
            {parts.map((part, i) => 
              i % 2 === 1 ? 
                <code key={i} className="bg-gray-100 px-1 rounded text-sm font-mono">{part}</code> : 
                <span key={i}>{part}</span>
            )}
          </div>
        );
      } else {
        return line ? <div key={index} className="mb-1">{line}</div> : <div key={index} className="mb-2"></div>;
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-blue-600" />
            Frequently Asked Questions
          </DialogTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pr-2">
          {/* Search and Filters */}
          <div className="space-y-3 sticky top-0 bg-white z-10 pb-3 border-b">
            <Input
              type="text"
              placeholder="Search FAQ questions, answers, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
            
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === '' ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory('')}
              >
                All Categories
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="text-xs"
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* FAQ Items */}
          <div className="space-y-3">
            {filteredFAQs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No FAQ items found matching your search criteria.
              </div>
            ) : (
              filteredFAQs.map((item) => {
                const isExpanded = expandedItems.has(item.id);
                return (
                  <Card key={item.id} className="border border-gray-200">
                    <CardHeader 
                      className="cursor-pointer hover:bg-gray-50 pb-3"
                      onClick={() => toggleExpanded(item.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="text-xs">
                              {item.category}
                            </Badge>
                          </div>
                          <CardTitle className="text-sm font-medium text-gray-900 leading-relaxed">
                            {item.question}
                          </CardTitle>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    {isExpanded && (
                      <CardContent className="pt-0">
                        <Separator className="mb-4" />
                        <div className="text-sm text-gray-700 leading-relaxed">
                          {formatAnswer(item.answer)}
                        </div>
                        {item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-4 pt-3 border-t border-gray-100">
                            {item.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-500 pt-4 border-t">
            <p>Can't find what you're looking for? Check the product documentation or contact support.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FAQ;