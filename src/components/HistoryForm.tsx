
import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Copy, Eye, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface HistoryFormProps {
  historyToken: string;
  historyLoading: boolean;
  credits: number | null;
  tokenProductName?: string;
  tokenProductId?: string;
  isMasterToken: boolean;
  activated?: boolean;
  locked?: boolean;
  activationStatus?: string;
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
  activated,
  locked,
  activationStatus,
  onHistoryTokenChange,
  onHistorySubmit,
  onCopyUrl,
  generateHistoryUrl,
  generateCreditsUrl,
  onCreditBoxClick,
  onScrollToTransactions
}) => {
  const [activating, setActivating] = useState(false);
  const { toast } = useToast();

  const handleActivateToken = async () => {
    if (!historyToken) return;
    
    setActivating(true);
    
    try {
      const response = await fetch('https://vvtnzixsxfjzwhjetrfm.supabase.co/functions/v1/activate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token_string: historyToken
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Token Activation",
          description: data.message,
          variant: "default",
        });
        
        // Refresh the token data by re-submitting the form
        const syntheticEvent = { preventDefault: () => {} } as React.FormEvent;
        onHistorySubmit(syntheticEvent);
      } else {
        toast({
          title: "Activation Failed",
          description: data.error || 'Failed to activate token',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Activation error:', error);
      toast({
        title: "Error",
        description: "Failed to activate token. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActivating(false);
    }
  };
  // Debug logging for HistoryForm props
  useEffect(() => {
    console.log('HistoryForm debug:', { 
      credits, 
      tokenProductName, 
      tokenProductId, 
      isMasterToken,
      activationStatus,
      historyToken
    });
  }, [credits, tokenProductName, tokenProductId, isMasterToken, activationStatus, historyToken]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-bold">Info Token</CardTitle>
        <CardDescription>
          Search Token for Activation - Transaction History - Balance
        </CardDescription>
        {credits !== null && historyToken && (
          <div 
            className={`mt-2 p-3 rounded-lg transition-colors duration-200 ${
              activationStatus === 'Pending'
                ? 'bg-yellow-50 border border-yellow-200 cursor-not-allowed'
                : activationStatus === 'Rejected'
                ? 'bg-red-50 border border-red-200 cursor-not-allowed'
                : locked 
                ? 'bg-red-50 border border-red-200 cursor-not-allowed' 
                : credits > 0 
                ? 'bg-green-50 border border-green-200 cursor-pointer hover:opacity-80' 
                : 'bg-gray-50 border border-gray-200 cursor-pointer hover:opacity-80'
            }`}
            onClick={!locked && activationStatus !== 'Pending' && activationStatus !== 'Reject' ? onCreditBoxClick : undefined}
            title={
              activationStatus === 'Pending' 
                ? "Activation Pending - Contact the dealer" 
                : activationStatus === 'Rejected'
                ? "Activation Rejected - Contact the dealer"
                : locked 
                ? "Token is locked" 
                : "Click to auto-fill request form"
            }
          >
            <div className="flex items-center justify-between">
              <p className={`font-medium ${
                activationStatus === 'Pending'
                  ? 'text-yellow-800'
                  : activationStatus === 'Rejected'
                  ? 'text-red-800'
                  : locked 
                  ? 'text-red-800' 
                  : credits > 0 
                  ? 'text-green-800' 
                  : 'text-gray-800'
              }`}>
                Credits: {credits}
              </p>
              
              {/* Token Status Indicators */}
              <div className="flex items-center gap-2">
                {activationStatus === 'Pending' && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                    ⏳ Activation Pending
                  </div>
                )}
                {activationStatus === 'Rejected' && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                    ❌ Token Rejected
                  </div>
                )}
                {locked && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                    <Lock className="h-3 w-3" />
                    Locked
                  </div>
                )}
                {!isMasterToken && activated === false && activationStatus !== 'Pending' && activationStatus !== 'Rejected' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-yellow-100 text-green-700 border-yellow-300 hover:bg-yellow-200 text-xs px-2 py-1 h-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleActivateToken();
                    }}
                    disabled={activating}
                  >
                    {activating ? "Activating..." : "Activate"}
                  </Button>
                )}
              </div>
            </div>
            
            {tokenProductName && (
              <p className={`text-sm mt-1 ${
                activationStatus === 'Pending'
                  ? 'text-yellow-700'
                  : activationStatus === 'Rejected'
                  ? 'text-red-700'
                  : locked 
                  ? 'text-red-700' 
                  : credits > 0 
                  ? 'text-green-700' 
                  : 'text-gray-700'
              }`}>
                Product: <span className="font-medium">{tokenProductName}</span>
              </p>
            )}
            {tokenProductId && !isMasterToken && (
              <p className={`text-xs mt-1 font-mono ${
                activationStatus === 'Pending'
                  ? 'text-yellow-600'
                  : activationStatus === 'Rejected'
                  ? 'text-red-600'
                  : locked 
                  ? 'text-red-600' 
                  : credits > 0 
                  ? 'text-green-600' 
                  : 'text-gray-600'
              }`}>
                Product ID: {tokenProductId}
              </p>
            )}
            <div className="mt-2 flex items-center justify-between">
              <p className={`text-xs ${
                activationStatus === 'Pending'
                  ? 'text-yellow-600'
                  : activationStatus === 'Rejected'
                  ? 'text-red-600'
                  : locked 
                  ? 'text-red-600' 
                  : credits > 0 
                  ? 'text-green-600' 
                  : 'text-gray-600'
              }`}>
                {activationStatus === 'Pending' 
                  ? '⏳ Activation Pending - Contact the dealer'
                  : activationStatus === 'Rejected'
                  ? '❌ Activation rejected - Contact the seller'
                  : locked 
                  ? '🔒 Token is locked' 
                  : '👆 Click to auto-fill request form'
                }
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
            
            {/* Info API URL */}
            <div className="bg-gray-100 p-3 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-blue-600">GET Info</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCopyUrl(`https://api.accshub.org/history?token=${encodeURIComponent(historyToken)}`)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <code className="text-xs bg-white p-2 rounded block break-all">
                {`https://api.accshub.org/history?token=${encodeURIComponent(historyToken)}`}
              </code>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HistoryForm;
