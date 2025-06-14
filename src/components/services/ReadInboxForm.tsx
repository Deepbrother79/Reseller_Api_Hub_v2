
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail } from "lucide-react";

interface ReadInboxFormProps {
  transactionIds: string;
  setTransactionIds: (value: string) => void;
  emailStrings: string;
  setEmailStrings: (value: string) => void;
  token: string;
  setToken: (value: string) => void;
  loading: boolean;
  useTransactionIds: boolean;
  setUseTransactionIds: (value: boolean) => void;
  useEmailStrings: boolean;
  setUseEmailStrings: (value: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const ReadInboxForm: React.FC<ReadInboxFormProps> = ({
  transactionIds,
  setTransactionIds,
  emailStrings,
  setEmailStrings,
  token,
  setToken,
  loading,
  useTransactionIds,
  setUseTransactionIds,
  useEmailStrings,
  setUseEmailStrings,
  onSubmit
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Read Inbox Mail
        </CardTitle>
        <CardDescription>
          Extract emails from Microsoft Outlook/Hotmail accounts using transaction IDs or direct email credentials
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="use-transaction-ids" 
                  checked={useTransactionIds}
                  onCheckedChange={setUseTransactionIds}
                />
                <Label htmlFor="use-transaction-ids" className="text-sm font-medium">
                  Use Transaction IDs
                </Label>
              </div>
              <Label htmlFor="transaction-ids">Transaction IDs (one per line, max 10)</Label>
              <Textarea
                id="transaction-ids"
                placeholder="Enter transaction IDs..."
                value={transactionIds}
                onChange={(e) => setTransactionIds(e.target.value)}
                rows={5}
                disabled={!useTransactionIds}
                className={!useTransactionIds ? "opacity-50" : ""}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="use-email-strings" 
                  checked={useEmailStrings}
                  onCheckedChange={setUseEmailStrings}
                />
                <Label htmlFor="use-email-strings" className="text-sm font-medium">
                  Use Email Strings
                </Label>
              </div>
              <Label htmlFor="email-strings">Email Strings (email|password|refresh_token|client_id, max 10)</Label>
              <Textarea
                id="email-strings"
                placeholder="email@example.com|password|refresh_token|client_id"
                value={emailStrings}
                onChange={(e) => setEmailStrings(e.target.value)}
                rows={5}
                disabled={!useEmailStrings}
                className={!useEmailStrings ? "opacity-50" : ""}
              />
            </div>
          </div>
          
          {useEmailStrings && (
            <div className="space-y-2">
              <Label htmlFor="token">Authorization Token (required for email strings)</Label>
              <Input
                id="token"
                type="text"
                placeholder="Enter your authorization token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </div>
          )}

          <Button type="submit" disabled={loading || (!useTransactionIds && !useEmailStrings)} className="w-full">
            {loading ? "Processing..." : "Read Inbox Mail"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ReadInboxForm;
