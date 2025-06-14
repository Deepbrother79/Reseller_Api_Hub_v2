
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Copy } from "lucide-react";

interface HistoryFormProps {
  historyToken: string;
  historyLoading: boolean;
  credits: number | null;
  onHistoryTokenChange: (value: string) => void;
  onHistorySubmit: (e: React.FormEvent) => void;
  onCopyUrl: (url: string) => void;
  generateHistoryUrl: () => string;
  generateCreditsUrl: () => string;
}

const HistoryForm: React.FC<HistoryFormProps> = ({
  historyToken,
  historyLoading,
  credits,
  onHistoryTokenChange,
  onHistorySubmit,
  onCopyUrl,
  generateHistoryUrl,
  generateCreditsUrl
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History & Balance</CardTitle>
        <CardDescription>
          View your transaction history by entering your token
        </CardDescription>
        {credits !== null && historyToken && (
          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-medium">Credits: {credits}</p>
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
