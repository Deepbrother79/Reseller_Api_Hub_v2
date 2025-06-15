
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
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const { toast } = useToast();

  // Calculate required credits based on selected days
  const calculateCredits = (days: string) => {
    if (!days) return 0;
    return Math.ceil(parseInt(days) / 7);
  };

  const daysOptions = [7, 14, 21, 28, 35, 42, 49, 56, 63, 70];

  const generateApiUrl = () => {
    return 'https://vvtnzixsxfjzwhjetrfm.supabase.co/functions/v1/invite-capcut-pro';
  };

  const generateRequestBody = () => {
    return JSON.stringify({
      invite_code: inviteCode,
      days: parseInt(selectedDays),
      token: token
    }, null, 2);
  };

  const handleConfirm = () => {
    if (!inviteCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a CapCut invite code",
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
    setResponse(null);

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

      console.log('CapCut Pro response received:', data);

      if (data && data.success) {
        setResponse(data);
        toast({
          title: "Success!",
          description: data.message || "CapCut Pro invitation processed successfully",
          className: "bg-green-50 border-green-200 text-green-800",
        });
      } else {
        let errorMessage = "Server response error";
        
        if (data && data.message) {
          errorMessage = data.message;
        }
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error processing CapCut Pro request:', error);
      
      toast({
        title: "Error",
        description: error.message || "Failed to process CapCut Pro request",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setShowConfirmation(false);
    }
  };

  const resetForm = () => {
    setShowConfirmation(false);
    setInviteCode('');
    setSelectedDays('');
    setToken('');
    setResponse(null);
  };

  if (showConfirmation) {
    return (
      <div className="space-y-6">
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-orange-800">Confirm CapCut Pro Request</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white p-4 rounded-lg space-y-2">
              <p><strong>Invite Code:</strong> {inviteCode}</p>
              <p><strong>Days:</strong> {selectedDays}</p>
              <p><strong>Credits Required:</strong> {calculateCredits(selectedDays)}</p>
              <p><strong>Token:</strong> {token.substring(0, 8)}...</p>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Confirm & Submit'
                )}
              </Button>
              <Button variant="outline" onClick={resetForm} disabled={loading}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>CapCut Pro</CardTitle>
          <p className="text-sm text-gray-600">
            Get free days on CapCut Pro, up to 70 days with your invite friend code. New accounts only. 24 hours to complete the order. One credit every seven days.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="inviteCode">CapCut Invite Friends CODE</Label>
                <Input
                  id="inviteCode"
                  type="text"
                  placeholder="Enter your CapCut invite code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                />
              </div>
              
              <div className="w-32">
                <Label htmlFor="days">Days</Label>
                <Select value={selectedDays} onValueChange={setSelectedDays}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select days" />
                  </SelectTrigger>
                  <SelectContent>
                    {daysOptions.map((days) => (
                      <SelectItem key={days} value={days.toString()}>
                        {days}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedDays && (
                <div className="flex items-end pb-2">
                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                    {calculateCredits(selectedDays)} credit{calculateCredits(selectedDays) !== 1 ? 's' : ''}
                  </Badge>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="token">Authorization Token</Label>
              <Input
                id="token"
                type="text"
                placeholder="Enter your INVITE-CAPCUT-PRO token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </div>

            <Button onClick={handleConfirm} className="w-full">
              Process CapCut Pro Request
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* API Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>API Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* API URL */}
            <div className="bg-gray-100 p-3 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-blue-600">POST Request URL</span>
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

            {/* Request Body */}
            <div className="bg-gray-100 p-3 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-green-600">Request Body</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCopy(generateRequestBody())}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <pre className="text-xs bg-white p-2 rounded block overflow-x-auto">
                {generateRequestBody()}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Response Card */}
      {response && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <CardTitle className="text-green-800">CapCut Pro Response</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-white p-4 rounded-lg">
              <pre className="text-sm overflow-x-auto">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onCopy(JSON.stringify(response, null, 2))}
              className="mt-2"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Response
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CapCutProService;
