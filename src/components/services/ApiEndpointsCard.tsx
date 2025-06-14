
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";

interface ApiEndpointsCardProps {
  baseUrl: string;
  transactionIds: string;
  emailStrings: string;
  token: string;
  onCopy: (text: string) => void;
}

const ApiEndpointsCard: React.FC<ApiEndpointsCardProps> = ({
  baseUrl,
  transactionIds,
  emailStrings,
  token,
  onCopy
}) => {
  const generateReadInboxUrl = () => {
    return `${baseUrl}/read-inbox-mail`;
  };

  const generateReadInboxBody = () => {
    if (!transactionIds.trim() && !emailStrings.trim()) return '';
    
    const body = {
      transaction_ids: transactionIds.trim() ? transactionIds.split('\n').filter(id => id.trim()) : [],
      email_strings: emailStrings.trim() ? emailStrings.split('\n').filter(str => str.trim()) : [],
      token: token.trim() || null
    };
    
    return JSON.stringify(body, null, 2);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>🔗 API Endpoints</CardTitle>
        <CardDescription>
          Copy these URLs and JSON bodies to use the API directly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* POST URL */}
        <div className="bg-gray-100 p-3 rounded-lg">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-medium text-blue-600">POST - Read Inbox Mail URL</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onCopy(generateReadInboxUrl())}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <code className="text-xs bg-white p-2 rounded block break-all">
            {generateReadInboxUrl()}
          </code>
        </div>

        {/* JSON Body */}
        {(transactionIds.trim() || emailStrings.trim()) && (
          <div className="bg-gray-100 p-3 rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-medium text-blue-600">JSON Body</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCopy(generateReadInboxBody())}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <pre className="text-xs bg-white p-2 rounded block break-all whitespace-pre-wrap">
              {generateReadInboxBody()}
            </pre>
          </div>
        )}

        {/* API Documentation */}
        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>Method:</strong> POST</p>
          <p><strong>Content-Type:</strong> application/json</p>
          <p><strong>Parameters:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li><code>transaction_ids</code> - Array of transaction IDs (max 10)</li>
            <li><code>email_strings</code> - Array of email credential strings (max 10)</li>
            <li><code>token</code> - Authorization token (required for email_strings)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApiEndpointsCard;
