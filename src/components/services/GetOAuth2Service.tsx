import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Copy, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface GetOAuth2ServiceProps {
  onCopy: (text: string) => void;
}

const GetOAuth2Service: React.FC<GetOAuth2ServiceProps> = ({ onCopy }) => {
  const [emailPassword, setEmailPassword] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailPassword.trim()) {
      toast({
        title: "Error",
        description: "Please enter email and password in the format: email@domain.com|password",
        variant: "destructive"
      });
      return;
    }

    if (!token.trim()) {
      toast({
        title: "Error",
        description: "Please enter your authorization token",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const requestData = {
        email_password: emailPassword.trim(),
        token: token.trim()
      };

      console.log('Sending OAuth2 request');

      const { data, error } = await supabase.functions.invoke('get-oauth2-token', {
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
        setResult(data.data);
        
        toast({
          title: "Success!",
          description: "OAuth2 token retrieved successfully",
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
      console.error('Error processing OAuth2 request:', error);
      
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

  const generateApiUrl = () => {
    const baseUrl = 'https://vvtnzixsxfjzwhjetrfm.supabase.co/functions/v1';
    return `${baseUrl}/get-oauth2-token`;
  };

  const generateApiBody = () => {
    if (!emailPassword || !token) return '';
    return JSON.stringify({
      email_password: emailPassword,
      token: token
    }, null, 2);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <CardTitle>Get OAuth2 Token</CardTitle>
            <Badge className="bg-yellow-200 text-yellow-800 hover:bg-yellow-200">
              coming soon
            </Badge>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Retrieve OAuth2 (refresh_token|client_id) tokens using email credentials. Format: email@domain.com|password
            </p>
            <div className="flex items-center gap-2">
              <Badge className="bg-cyan-100 text-cyan-800 hover:bg-cyan-100">
                Outlook
              </Badge>
              <span className="text-sm text-gray-500">and</span>
              <Badge className="bg-cyan-100 text-cyan-800 hover:bg-cyan-100">
                Hotmail
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emailPassword">Email and Password</Label>
              <Input
                id="emailPassword"
                type="text"
                placeholder="email@hotmail.com|password123"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500">
                Format: email@domain.com|password
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="token">Authorization Token</Label>
              <Input
                id="token"
                type="text"
                placeholder="Enter your GET-OAUTH2-TOKEN service token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Get OAuth2 Token'
              )}
            </Button>
          </form>

          {/* API Documentation */}
          {emailPassword && token && (
            <div className="mt-6">
              <Separator className="mb-4" />
              <h3 className="font-semibold mb-3">API Endpoint:</h3>
              
              <div className="bg-gray-100 p-3 rounded-lg mb-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-purple-600">POST Request</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onCopy(generateApiUrl())}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <code className="text-xs bg-white p-2 rounded block break-all">
                  {generateApiUrl()}
                </code>
              </div>

              <div className="bg-gray-100 p-3 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-blue-600">Request Body</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onCopy(generateApiBody())}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
                  {generateApiBody()}
                </pre>
              </div>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="mt-6">
              <Separator className="mb-4" />
              <h3 className="font-semibold mb-3">OAuth2 Response:</h3>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-green-700">Success</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onCopy(JSON.stringify(result, null, 2))}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <pre className="text-xs bg-white p-3 rounded overflow-x-auto border">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GetOAuth2Service;
