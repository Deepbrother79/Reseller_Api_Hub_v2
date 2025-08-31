
import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import ServiceNavigation from "@/components/services/ServiceNavigation";
import ReadInboxService from "@/components/services/ReadInboxService";
import Get2FAService from "@/components/services/Get2FAService";
import GetOAuth2Service from "@/components/services/GetOAuth2Service";
import FAQ from "@/components/FAQ";

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
  const [useMasterTokenInbox, setUseMasterTokenInbox] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<EmailResult[]>([]);
  const [useTransactionIds, setUseTransactionIds] = useState(true);
  const [useEmailStrings, setUseEmailStrings] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);
  const { toast } = useToast();

  const services = [
    { id: 'get-2fa', name: 'Get 2FA', disabled: false },
    { id: 'read-inbox', name: 'Read Inbox Mail', disabled: false },
    { id: 'get-oauth2', name: 'Get Oauth2 Token', disabled: false }
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
        token: useEmailStrings && token.trim() ? token.trim() : null,
        use_master_token: useEmailStrings && token.trim() ? useMasterTokenInbox : undefined
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
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link to="/">
              <Button className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white px-3 py-2 md:px-4 md:py-2 text-sm md:text-base flex items-center gap-2">
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">API Hub Dashboard</span>
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => window.open('https://pay.accshub.org/', '_blank')}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 md:px-4 md:py-2 text-sm md:text-base"
              >
                Buy Tokens
              </Button>
              <Button 
                onClick={() => setShowFAQ(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 md:px-4 md:py-2 text-sm md:text-base flex items-center gap-2"
              >
                <HelpCircle className="h-4 w-4" />
                <span className="hidden sm:inline">FAQ</span>
              </Button>
            </div>
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2 md:mb-3">
              ⚡ Services & Utils
            </h1>
            <p className="text-base md:text-lg text-gray-700 font-medium px-2 md:px-0">
              🚀 Advanced tools and utilities for email management and automation
            </p>
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
            useMasterToken={useMasterTokenInbox}
            setUseMasterToken={setUseMasterTokenInbox}
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

        {!['read-inbox', 'get-2fa', 'get-oauth2'].includes(activeService) && (
          <Card>
            <CardContent className="text-center py-12">
              <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
              <p className="text-gray-600">This service is under development and will be available soon.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* FAQ Modal */}
      <FAQ isOpen={showFAQ} onClose={() => setShowFAQ(false)} />
    </div>
  );
};

export default ServicesUtils;
