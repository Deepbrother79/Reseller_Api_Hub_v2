
import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Copy, Eye } from "lucide-react";

interface HistoryFormProps {
  historyToken: string;
  historyLoading: boolean;
  credits: number | null;
  tokenProductName?: string;
  tokenProductId?: string;
  isMasterToken: boolean;
  onHistoryTokenChange: (value: string) => void;
  onHistorySubmit: (e: React.FormEvent) => void;
  onCopyUrl: (url: string) => void;
  generateHistoryUrl: () => string;
  generateCreditsUrl: () => string;
  onCreditBoxClick: () => void;
  onScrollToTransactions: () => void;
}

const HistoryForm: React.FC<HistoryFormProps> = ({
  historyToken,
  historyLoading,
  credits,
  tokenProductName,
  tokenProductId,
  isMasterToken,
  onHistoryTokenChange,
  onHistorySubmit,
  onCopyUrl,
  generateHistoryUrl,
  generateCreditsUrl,
  onCreditBoxClick,
  onScrollToTransactions
}) => {
  // Debug logging for HistoryForm props
  useEffect(() => {
    console.log('HistoryForm debug:', { 
      credits, 
      tokenProductName, 
      tokenProductId, 
      isMasterToken,
      historyToken
    });
  }, [credits, tokenProductName, tokenProductId, isMasterToken, historyToken]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search Token - Transaction History & Balance</CardTitle>
        <CardDescription>
          View your transaction history by entering your token
        </CardDescription>
        {credits !== null && historyToken && (
          <div 
            className={`mt-2 p-3 rounded-lg cursor-pointer transition-colors duration-200 hover:opacity-80 ${
              credits > 0 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-gray-50 border border-gray-200'
            }`}
            onClick={onCreditBoxClick}
            title="Click to auto-fill request form"
          >
            <p className={`font-medium ${credits > 0 ? 'text-green-800' : 'text-gray-800'}`}>
              Credits: {credits}
            </p>
            {tokenProductName && (
              <p className={`text-sm mt-1 ${credits > 0 ? 'text-green-700' : 'text-gray-700'}`}>
                Product: <span className="font-medium">{tokenProductName}</span>
              </p>
            )}
            {tokenProductId && !isMasterToken && (
              <p className={`text-xs mt-1 font-mono ${credits > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                Product ID: {tokenProductId}
              </p>
            )}
            <div className="mt-2 flex items-center justify-between">
              <p className={`text-xs ${credits > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                👆 Click to auto-fill request form
              </p>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={(e) => {
                  e.stopPropagation();
                  onScrollToTransactions();
                }}
                className="flex items-center gap-1 text-xs"
              >
                <Eye className="h-3 w-3" />
                View Transactions
              </Button>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={onHistorySubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="historyToken">Token</Label>
            <Input
              id="historyToken"
              type="text"
              placeholder="Enter your token"
              value={historyToken}
              onChange={(e) => onHistoryTokenChange(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" disabled={historyLoading}>
            {historyLoading ? "Loading..." : "View History & Balance"}
          </Button>
        </form>

        {/* Show API URLs when token is entered */}
        {historyToken && (
          <div className="mt-6">
            <Separator className="mb-4" />
            <h3 className="font-semibold mb-3">Secure API Endpoints:</h3>
            
            {/* Credits API URL */}
            <div className="bg-gray-100 p-3 rounded-lg mb-4">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-green-600">GET Credits</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCopyUrl(generateCreditsUrl())}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <code className="text-xs bg-white p-2 rounded block break-all">
                {generateCreditsUrl()}
              </code>
            </div>

            {/* History API URL */}
            <div className="bg-gray-100 p-3 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-blue-600">GET History</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCopyUrl(generateHistoryUrl())}
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
      </CardContent>
    </Card>
  );
};

export default HistoryForm;
