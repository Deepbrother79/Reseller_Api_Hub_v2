
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
  const [useTransactionIds, setUseTransactionIds] = useState(true);
  const [useEmailStrings, setUseEmailStrings] = useState(false);
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
        toast({
          title: "Error",
          description: `Server returned error: ${error.message}`,
          variant: "destructive"
        });
        return;
      }

      console.log('Response received:', data);

      if (data.success) {
        const resultsCount = data.results?.length || 0;
        setResults(data.results || []);
        
        if (resultsCount === 0) {
          // Check if there were processing errors or warnings
          if (data.warnings && data.warnings.length > 0) {
            const warningMessage = data.warnings.join('; ');
            toast({
              title: "Warning",
              description: warningMessage,
              variant: "destructive"
            });
          } else if (useTransactionIds) {
            toast({
              title: "Warning",
              description: "No emails found. Please verify that the transaction IDs are correct and from compatible products (HOTMAIL-NEW-LIVE-1-12H, OUTLOOK-NEW-LIVE-1-12H)",
              variant: "destructive"
            });
          } else {
            toast({
              title: "Warning", 
              description: "No emails found. Please verify that the email credentials are correct and valid",
              variant: "destructive"
            });
          }
        } else {
          toast({
            title: "Success",
            description: `Processed ${resultsCount} emails successfully`,
          });
        }
      } else {
        // Server returned an error
        let errorMessage = data.message || "Failed to process request";
        
        // Include detailed errors if available
        if (data.errors && data.errors.length > 0) {
          errorMessage = data.errors.join('; ');
        }
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error processing inbox:', error);
      
      // Try to parse error message if it's a JSON response
      let errorMessage = "Failed to process inbox mail";
      if (error.message) {
        try {
          const errorData = JSON.parse(error.message);
          if (errorData.error_description) {
            errorMessage = `Authentication error: ${errorData.error_description}`;
          } else if (errorData.error) {
            errorMessage = `Error: ${errorData.error}`;
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
