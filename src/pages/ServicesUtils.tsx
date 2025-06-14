import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import ServiceNavigation from "@/components/services/ServiceNavigation";
import ReadInboxService from "@/components/services/ReadInboxService";
import Get2FAService from "@/components/services/Get2FAService";

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
    { id: 'get-2fa', name: 'Get 2FA', disabled: false },
    { id: 'read-inbox', name: 'Read Inbox Mail', disabled: false },
    { id: 'get-oauth2', name: 'Get Oauth2 Token', disabled: true },
    { id: 'capcut-pro', name: 'Capcut Pro', disabled: true }
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Content copied to clipboard",
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
        <div className="mb-8 flex items-center gap-4">
          <Link to="/">
            <Button variant="outline" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Home
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Services & Utils</h1>
            <p className="text-gray-600">Advanced tools and utilities for email management and automation</p>
          </div>
        </div>

        <ServiceNavigation
          services={services}
          activeService={activeService}
          onServiceChange={setActiveService}
        />

        {activeService === 'get-2fa' && (
          <Get2FAService onCopy={copyToClipboard} />
        )}

        {activeService === 'read-inbox' && (
          <ReadInboxService
            transactionIds={transactionIds}
            setTransactionIds={setTransactionIds}
            emailStrings={emailStrings}
            setEmailStrings={setEmailStrings}
            token={token}
            setToken={setToken}
            loading={loading}
            results={results}
            onSubmit={handleSubmit}
            onCopy={copyToClipboard}
          />
        )}

        {activeService !== 'read-inbox' && activeService !== 'get-2fa' && (
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
