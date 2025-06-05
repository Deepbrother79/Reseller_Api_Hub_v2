
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Product {
  id: string;
  name: string;
  fornitore_url: string;
  payload_template: any;
}

interface Transaction {
  id: string;
  token: string;
  product_id: string;
  qty: number;
  response_data: any;
  status: string;
  timestamp: string;
  products?: { name: string };
}

const Index = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [historyToken, setHistoryToken] = useState<string>("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const { toast } = useToast();

  // Carica i prodotti al caricamento della pagina
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Errore nel caricamento prodotti:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i prodotti",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProduct || !token || !quantity) {
      toast({
        title: "Errore",
        description: "Compila tutti i campi",
        variant: "destructive",
      });
      return;
    }

    const selectedProductData = products.find(p => p.id === selectedProduct);
    if (!selectedProductData) {
      toast({
        title: "Errore",
        description: "Prodotto non trovato",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('processa-richiesta', {
        body: {
          product_name: selectedProductData.name,
          token: token,
          qty: parseInt(quantity)
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Successo",
          description: data.message || "Richiesta elaborata con successo",
        });
        
        // Reset form
        setSelectedProduct("");
        setToken("");
        setQuantity("");
      } else {
        toast({
          title: "Errore",
          description: data.message || "Errore nell'elaborazione della richiesta",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Errore:', error);
      toast({
        title: "Errore",
        description: "Errore di comunicazione con il server",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleHistorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!historyToken) {
      toast({
        title: "Errore",
        description: "Inserisci il token",
        variant: "destructive",
      });
      return;
    }

    setHistoryLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('storico', {
        body: {
          token: historyToken
        }
      });

      if (error) throw error;

      setTransactions(data.transactions || []);
      
      if (!data.transactions || data.transactions.length === 0) {
        toast({
          title: "Info",
          description: "Nessuna transazione trovata per questo token",
        });
      }
    } catch (error) {
      console.error('Errore:', error);
      toast({
        title: "Errore",
        description: "Errore nel recupero dello storico",
        variant: "destructive",
      });
      setTransactions([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">API Shop</h1>
          <p className="text-lg text-gray-600">Acquista e gestisci i tuoi prodotti digitali</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Form principale per la richiesta */}
          <Card>
            <CardHeader>
              <CardTitle>Effettua Richiesta</CardTitle>
              <CardDescription>
                Seleziona un prodotto, inserisci il tuo token e la quantità desiderata
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="product">Prodotto</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona un prodotto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="token">Token/Voucher</Label>
                  <Input
                    id="token"
                    type="text"
                    placeholder="Inserisci il tuo token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantità</Label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="Inserisci la quantità"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    min="1"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Elaborazione..." : "Invia Richiesta"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Form per lo storico */}
          <Card>
            <CardHeader>
              <CardTitle>Storico Transazioni</CardTitle>
              <CardDescription>
                Visualizza lo storico delle tue transazioni inserendo il token
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleHistorySubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="historyToken">Token</Label>
                  <Input
                    id="historyToken"
                    type="text"
                    placeholder="Inserisci il tuo token"
                    value={historyToken}
                    onChange={(e) => setHistoryToken(e.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={historyLoading}>
                  {historyLoading ? "Caricamento..." : "Visualizza Storico"}
                </Button>
              </form>

              {transactions.length > 0 && (
                <div className="mt-6">
                  <Separator className="mb-4" />
                  <h3 className="font-semibold mb-3">Transazioni Trovate:</h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">
                            {transaction.products?.name || 'Prodotto sconosciuto'}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            transaction.status === 'success' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {transaction.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <p>Quantità: {transaction.qty}</p>
                          <p>Data: {new Date(transaction.timestamp).toLocaleString('it-IT')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
