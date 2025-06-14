
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, Mail, Clock, FileText, Hash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EmailResult {
  mail: string;
  from: string;
  time: string;
  content: string;
  code: string;
}

const ServicesUtils = () => {
  const [activeService, setActiveService] = useState('read-inbox');
  const [transactionIds, setTransactionIds] = useState('');
  const [emailStrings, setEmailStrings] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<EmailResult[]>([]);
  const { toast } = useToast();

  const services = [
    { id: 'get-2fa', name: 'Get 2FA', disabled: true },
    { id: 'get-code-mail', name: 'Get Code Mail', disabled: true },
    { id: 'read-inbox', name: 'Read Inbox Mail', disabled: false },
    { id: 'get-oauth2', name: 'Get Oauth2 Token', disabled: true },
    { id: 'capcut-pro', name: 'Capcut Pro', disabled: true }
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Code copied to clipboard",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionIds.trim() && !emailStrings.trim()) {
      toast({
        title: "Error",
        description: "Please enter either transaction IDs or email strings",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      const { data, error } = await supabase.functions.invoke('read-inbox-mail', {
        body: {
          transaction_ids: transactionIds.trim() ? transactionIds.split('\n').filter(id => id.trim()) : [],
          email_strings: emailStrings.trim() ? emailStrings.split('\n').filter(str => str.trim()) : [],
          token: token.trim() || null
        }
      });

      if (error) throw error;

      if (data.success) {
        setResults(data.results || []);
        toast({
          title: "Success",
          description: `Processed ${data.results?.length || 0} emails successfully`,
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to process request",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error processing inbox:', error);
      toast({
        title: "Error",
        description: "Failed to process inbox mail",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Services & Utils</h1>
          <p className="text-gray-600">Advanced tools and utilities for email management and automation</p>
        </div>

        {/* Service Navigation */}
        <div className="flex flex-wrap gap-2 mb-8">
          {services.map((service) => (
            <Button
              key={service.id}
              variant={activeService === service.id ? "default" : "outline"}
              onClick={() => !service.disabled && setActiveService(service.id)}
              disabled={service.disabled}
              className="relative"
            >
              {service.name}
              {service.disabled && (
                <span className="absolute -top-1 -right-1 bg-yellow-500 text-xs text-white px-1 rounded-full">
                  Soon
                </span>
              )}
            </Button>
          ))}
        </div>

        {/* Read Inbox Mail Service */}
        {activeService === 'read-inbox' && (
          <div className="space-y-6">
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
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="transaction-ids">Transaction IDs (one per line, max 10)</Label>
                      <Textarea
                        id="transaction-ids"
                        placeholder="Enter transaction IDs..."
                        value={transactionIds}
                        onChange={(e) => setTransactionIds(e.target.value)}
                        rows={5}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email-strings">Email Strings (email|password|refresh_token|client_id, max 10)</Label>
                      <Textarea
                        id="email-strings"
                        placeholder="email@example.com|password|refresh_token|client_id"
                        value={emailStrings}
                        onChange={(e) => setEmailStrings(e.target.value)}
                        rows={5}
                      />
                    </div>
                  </div>
                  
                  {emailStrings.trim() && (
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

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Processing..." : "Read Inbox Mail"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Results Table */}
            {results.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Email Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mail</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Content</TableHead>
                        <TableHead>Code</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((result, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{result.mail}</TableCell>
                          <TableCell>{result.from}</TableCell>
                          <TableCell className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {result.time}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="truncate text-sm text-gray-600">
                              {result.content}
                            </div>
                          </TableCell>
                          <TableCell>
                            {result.code && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(result.code)}
                                className="flex items-center gap-1"
                              >
                                <Hash className="h-3 w-3" />
                                {result.code}
                                <Copy className="h-3 w-3" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Placeholder for other services */}
        {activeService !== 'read-inbox' && (
          <Card>
            <CardContent className="text-center py-12">
              <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
              <p className="text-gray-600">This service is under development and will be available soon.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ServicesUtils;
