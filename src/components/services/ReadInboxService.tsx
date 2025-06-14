
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReadInboxForm from './ReadInboxForm';
import EmailResultsTable from './EmailResultsTable';
import ApiEndpointsCard from './ApiEndpointsCard';
import { Mail } from "lucide-react";

interface EmailResult {
  mail: string;
  from: string;
  time: string;
  content: string;
  code: string;
}

interface ReadInboxServiceProps {
  transactionIds: string;
  setTransactionIds: (value: string) => void;
  emailStrings: string;
  setEmailStrings: (value: string) => void;
  token: string;
  setToken: (value: string) => void;
  loading: boolean;
  results: EmailResult[];
  onSubmit: (e: React.FormEvent) => void;
  onCopy: (text: string) => void;
}

const ReadInboxService: React.FC<ReadInboxServiceProps> = ({
  transactionIds,
  setTransactionIds,
  emailStrings,
  setEmailStrings,
  token,
  setToken,
  loading,
  results,
  onSubmit,
  onCopy
}) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Read Inbox Mail
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-blue-800 mb-2">Important Information:</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p><strong>Transaction IDs:</strong> Only transactions from inbox-compatible products can be used:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>HOTMAIL-NEW-LIVE-1-12H</li>
                <li>OUTLOOK-NEW-LIVE-1-12H</li>
              </ul>
              <p><strong>Email Strings:</strong> Requires a token for the EMAIL-INBOX-READER product.</p>
            </div>
          </div>
          
          <ReadInboxForm
            transactionIds={transactionIds}
            setTransactionIds={setTransactionIds}
            emailStrings={emailStrings}
            setEmailStrings={setEmailStrings}
            token={token}
            setToken={setToken}
            loading={loading}
            onSubmit={onSubmit}
          />
        </CardContent>
      </Card>

      <ApiEndpointsCard onCopy={onCopy} />

      {results.length > 0 && (
        <EmailResultsTable results={results} onCopy={onCopy} />
      )}
    </div>
  );
};

export default ReadInboxService;
