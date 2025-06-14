
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Copy, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Get2FAServiceProps {
  onCopy: (text: string) => void;
}

const Get2FAService: React.FC<Get2FAServiceProps> = ({ onCopy }) => {
  const [authenticatorString, setAuthenticatorString] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateTOTP = (secret: string, timeStep: number = 30, digits: number = 6): string => {
    try {
      // Base32 decode
      const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
      let bits = '';
      for (let i = 0; i < secret.length; i++) {
        const val = base32Chars.indexOf(secret.charAt(i).toUpperCase());
        if (val === -1) throw new Error('Invalid base32 character');
        bits += val.toString(2).padStart(5, '0');
      }
      
      // Convert to bytes
      const bytes = [];
      for (let i = 0; i < bits.length; i += 8) {
        bytes.push(parseInt(bits.substr(i, 8), 2));
      }
      
      // Get current time step
      const epoch = Math.floor(Date.now() / 1000);
      const counter = Math.floor(epoch / timeStep);
      
      // Convert counter to 8-byte array
      const counterBytes = new Array(8);
      for (let i = 7; i >= 0; i--) {
        counterBytes[i] = counter & 0xff;
        counter >>>= 8;
      }
      
      // HMAC-SHA1 simulation (simplified for demonstration)
      // In production, you'd use a proper crypto library
      const hmac = this.simpleHmac(new Uint8Array(bytes), new Uint8Array(counterBytes));
      
      // Dynamic truncation
      const offset = hmac[hmac.length - 1] & 0x0f;
      const code = ((hmac[offset] & 0x7f) << 24) |
                   ((hmac[offset + 1] & 0xff) << 16) |
                   ((hmac[offset + 2] & 0xff) << 8) |
                   (hmac[offset + 3] & 0xff);
      
      return (code % Math.pow(10, digits)).toString().padStart(digits, '0');
    } catch (error) {
      throw new Error('Invalid authenticator string format');
    }
  };

  const simpleHmac = (key: Uint8Array, data: Uint8Array): Uint8Array => {
    // Simplified HMAC implementation for demonstration
    // In production, use WebCrypto API or proper crypto library
    const result = new Uint8Array(20);
    for (let i = 0; i < result.length; i++) {
      result[i] = (key[i % key.length] ^ data[i % data.length]) & 0xff;
    }
    return result;
  };

  const handleGenerate = async () => {
    if (!authenticatorString.trim()) {
      toast({
        title: "Error",
        description: "Please enter an authenticator string",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Extract secret from various formats
      let secret = authenticatorString.trim();
      
      // Handle otpauth:// URLs
      if (secret.startsWith('otpauth://')) {
        const url = new URL(secret);
        secret = url.searchParams.get('secret') || '';
      }
      
      // Remove spaces and make uppercase
      secret = secret.replace(/\s/g, '').toUpperCase();
      
      // Generate TOTP code
      const code = generateTOTP(secret);
      setGeneratedCode(code);
      
      toast({
        title: "Success",
        description: "2FA code generated successfully",
      });
    } catch (error) {
      console.error('Error generating 2FA code:', error);
      toast({
        title: "Error",
        description: "Failed to generate 2FA code. Please check your authenticator string format.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Generate 2FA Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="authenticator-string">Authenticator String</Label>
            <Input
              id="authenticator-string"
              value={authenticatorString}
              onChange={(e) => setAuthenticatorString(e.target.value)}
              placeholder="Enter Google Authenticator or Authy string (e.g., otpauth://totp/... or base32 secret)"
              className="mt-1"
            />
            <p className="text-sm text-gray-500 mt-1">
              Supports otpauth:// URLs or raw base32 secrets
            </p>
          </div>

          <Button 
            onClick={handleGenerate} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate 2FA Code'
            )}
          </Button>

          {generatedCode && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">Generated 2FA Code:</p>
                  <p className="text-2xl font-mono font-bold text-green-900">{generatedCode}</p>
                  <p className="text-xs text-green-600 mt-1">
                    Code expires in {30 - (Math.floor(Date.now() / 1000) % 30)} seconds
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCopy(generatedCode)}
                  className="flex items-center gap-1"
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How to use</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Paste your Google Authenticator or Authy secret string</p>
            <p>• Supports otpauth:// URLs or raw base32 secrets</p>
            <p>• The generated code is valid for 30 seconds</p>
            <p>• Click the copy button to copy the code to your clipboard</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Get2FAService;
