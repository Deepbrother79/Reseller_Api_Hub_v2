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
import GetOAuth2Service from "@/components/services/GetOAuth2Service";
import CapCutProService from "@/components/services/CapCutProService";

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
  const [useTransactionIds, setUseTransactionIds] = useState(true);
  const [useEmailStrings, setUseEmailStrings] = useState(false);
  const { toast } = useToast();

  const services = [
    { id: 'get-2fa', name: 'Get 2FA', disabled: false },
    { id: 'read-inbox', name: 'Read Inbox Mail', disabled: false },
    { id: 'get-oauth2', name: 'Get Oauth2 Token', disabled: false },
    { id: 'capcut-pro', name: 'Capcut Pro', disabled: false }
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
    
    // Validate input selection
    if (!useTransactionIds && !useEmailStrings) {
      toast({
        title: "Error",
        description: "Please select at least one input type (Transaction IDs or Email Strings)",
        variant: "destructive"
      });
      return;
    }

    if (useTransactionIds && useEmailStrings) {
      toast({
        title: "Error",
        description: "Please select only one input type at a time",
        variant: "destructive"
      });
      return;
    }

    // Validate content based on selection
    if (useTransactionIds && !transactionIds.trim()) {
      toast({
        title: "Error",
        description: "Please enter transaction IDs",
        variant: "destructive"
      });
      return;
    }

    if (useEmailStrings && !emailStrings.trim()) {
      toast({
        title: "Error",
        description: "Please enter email strings",
        variant: "destructive"
      });
      return;
    }

    if (useEmailStrings && !token.trim()) {
      toast({
        title: "Error",
        description: "Authorization token is required for email strings",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      const requestData = {
        transaction_ids: useTransactionIds && transactionIds.trim() 
          ? transactionIds.split('\n').filter(id => id.trim()) 
          : [],
        email_strings: useEmailStrings && emailStrings.trim() 
          ? emailStrings.split('\n').filter(str => str.trim()) 
          : [],
        token: useEmailStrings && token.trim() ? token.trim() : null
      };

      console.log('Sending request:', requestData);

      const { data, error } = await supabase.functions.invoke('read-inbox-mail', {
        body: requestData
      });

      if (error) {
        console.error('Supabase function error:', error);
        
        let errorMessage = "Server response error";
        
        try {
          if (error.message) {
            const errorData = JSON.parse(error.message);
            if (errorData.message) {
              errorMessage = errorData.message;
            } else if (errorData.error_description) {
              errorMessage = `Authentication error: ${errorData.error_description}`;
            } else if (errorData.error) {
              errorMessage = `Error: ${errorData.error}`;
            }
          }
        } catch (parseError) {
          if (error.details) {
            errorMessage = error.details;
          } else if (error.message) {
            errorMessage = error.message;
          }
        }
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
        return;
      }

      console.log('Response received:', data);

      if (data && data.success) {
        const resultsCount = data.results?.length || 0;
        setResults(data.results || []);
        
        toast({
          title: "Success!",
          description: `Successfully processed ${resultsCount} emails. Results are now displayed below.`,
          className: "bg-green-50 border-green-200 text-green-800",
        });
      } else {
        let errorMessage = "Server response error";
        
        if (data && data.message) {
          errorMessage = data.message;
        } else if (data && data.error) {
          errorMessage = data.error;
        }
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error processing inbox:', error);
      
      let errorMessage = "Server response error";
      
      if (error.message) {
        try {
          const errorData = JSON.parse(error.message);
          if (errorData.error_description) {
            errorMessage = `Authentication error: ${errorData.error_description}`;
          } else if (errorData.error) {
            errorMessage = `Server error: ${errorData.error}`;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
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
            useTransactionIds={useTransactionIds}
            setUseTransactionIds={setUseTransactionIds}
            useEmailStrings={useEmailStrings}
            setUseEmailStrings={setUseEmailStrings}
            onSubmit={handleSubmit}
            onCopy={copyToClipboard}
          />
        )}

        {activeService === 'get-oauth2' && (
          <GetOAuth2Service onCopy={copyToClipboard} />
        )}

        {activeService === 'capcut-pro' && (
          <CapCutProService onCopy={copyToClipboard} />
        )}

        {!['read-inbox', 'get-2fa', 'get-oauth2', 'capcut-pro'].includes(activeService) && (
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
