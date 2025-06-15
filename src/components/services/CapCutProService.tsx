
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Copy, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CapCutProServiceProps {
  onCopy: (text: string) => void;
}

const CapCutProService: React.FC<CapCutProServiceProps> = ({ onCopy }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [selectedDays, setSelectedDays] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { toast } = useToast();

  // Generate days options (7, 14, 21, 28, 35, 42, 49, 56, 63, 70)
  const daysOptions = Array.from({ length: 10 }, (_, i) => (i + 1) * 7);

  const getRequiredCredits = (days: number) => Math.ceil(days / 7);

  const handleConfirm = () => {
    if (!inviteCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter your CapCut invite code",
        variant: "destructive"
      });
      return;
    }

    if (!selectedDays) {
      toast({
        title: "Error",
        description: "Please select the number of days",
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

    setShowConfirmation(true);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setResult(null);
    setShowConfirmation(false);

    try {
      const requestData = {
        invite_code: inviteCode.trim(),
        days: parseInt(selectedDays),
        token: token.trim()
      };

      console.log('Sending CapCut Pro request:', requestData);

      const { data, error } = await supabase.functions.invoke('invite-capcut-pro', {
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
          description: `CapCut Pro activated for ${selectedDays} days successfully`,
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
      console.error('Error processing CapCut Pro request:', error);
      
      let errorMessage = "Server response error";
      
      if (error.message) {
        try {
          const errorData = JSON.parse(error.message);
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = `Server error: ${errorData.error}`;
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
    return `${baseUrl}/invite-capcut-pro`;
  };

  const generateApiBody = () => {
    if (!inviteCode || !selectedDays || !token) return '';
    return JSON.stringify({
      invite_code: inviteCode,
      days: parseInt(selectedDays),
      token: token
    }, null, 2);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <CardTitle>CapCut Pro Invite</CardTitle>
            <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
              NEW
            </Badge>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Get free days on CapCut Pro, up to 70 days with your invite friend code. New accounts only. 24 hours to complete the order. One credit every seven days.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inviteCode">CapCut Invite Friends CODE</Label>
                <Input
                  id="inviteCode"
                  type="text"
                  placeholder="Enter your invite code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="days">Days</Label>
                <Select value={selectedDays} onValueChange={setSelectedDays}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select days" />
                  </SelectTrigger>
                  <SelectContent>
                    {daysOptions.map((days) => (
                      <SelectItem key={days} value={days.toString()}>
                        {days} days
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Credits Required</Label>
                <div className="h-10 px-3 py-2 bg-gray-50 border rounded-md flex items-center">
                  <span className="text-sm font-medium">
                    {selectedDays ? `${getRequiredCredits(parseInt(selectedDays))} credit${getRequiredCredits(parseInt(selectedDays)) > 1 ? 's' : ''}` : '-'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="token">Authorization Token</Label>
              <Input
                id="token"
                type="text"
                placeholder="Enter your INVITE-CAPCUT-PRO service token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <Button 
              onClick={handleConfirm} 
              className="w-full" 
              disabled={loading}
            >
              Confirm Request
            </Button>

            {/* Confirmation Dialog */}
            {showConfirmation && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900">Confirm Your Request</h4>
                    <div className="mt-2 text-sm text-blue-800">
                      <p><strong>Invite Code:</strong> {inviteCode}</p>
                      <p><strong>Days:</strong> {selectedDays}</p>
                      <p><strong>Credits Required:</strong> {getRequiredCredits(parseInt(selectedDays))}</p>
                      <p><strong>Token:</strong> {token.substring(0, 8)}...</p>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSubmit}
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          'Confirm & Submit'
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowConfirmation(false)}
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* API Documentation */}
            {inviteCode && selectedDays && token && (
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
                <h3 className="font-semibold mb-3">CapCut Pro Response:</h3>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
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
                      <div className="text-sm text-green-800 mb-3">
                        <p><strong>Days Activated:</strong> {result.days}</p>
                        <p><strong>Credits Used:</strong> {result.credits_used}</p>
                        <p><strong>Remaining Credits:</strong> {result.remaining_credits}</p>
                      </div>
                      <pre className="text-xs bg-white p-3 rounded overflow-x-auto border">
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CapCutProService;
