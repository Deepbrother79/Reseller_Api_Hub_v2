
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface RefundFormProps {
  baseUrl: string;
}

const RefundForm: React.FC<RefundFormProps> = ({ baseUrl }) => {
  const [transactionId, setTransactionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [refundResult, setRefundResult] = useState<any>(null);
  const { toast } = useToast();

  const handleRefundRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a transaction ID",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setRefundResult(null);

    try {
      const response = await fetch(`${baseUrl}/api-refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_id: transactionId
        })
      });

      const data = await response.json();
      setRefundResult(data);

      if (data.success) {
        toast({
          title: "Success",
          description: data.message,
        });
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to process refund request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>💰 Refund Request</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRefundRequest} className="space-y-4">
          <div>
            <Input
              type="text"
              placeholder="Enter Transaction ID"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button 
            type="submit" 
            disabled={loading || !transactionId.trim()}
            className="w-full"
          >
            {loading ? 'Processing...' : 'Request Refund'}
          </Button>
        </form>

        {refundResult && (
          <div className="mt-4 p-3 rounded-lg border">
            <div className={`text-sm ${refundResult.success ? 'text-green-700' : 'text-red-700'}`}>
              <p className="font-medium">{refundResult.message}</p>
              {refundResult.refund_data && (
                <div className="mt-2 space-y-1">
                  <p><strong>Status:</strong> {refundResult.refund_data.refund_status}</p>
                  <p><strong>Response:</strong> {refundResult.refund_data.response_message}</p>
                  <p><strong>Date:</strong> {new Date(refundResult.refund_data.created_at).toLocaleString('en-US')}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RefundForm;
