import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Copy, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface GetOAuth2ServiceProps {
  onCopy: (text: string) => void;
}

type RowStatus = 'pending' | 'success' | 'fail';

interface RowItem {
  stt: number;
  email: string;
  pass: string;
  status: RowStatus;
  refreshToken?: string;
  clientId?: string;
  resultText?: string;
}

const PRODUCT_NAME = 'GET-OAUTH2-TOKEN';

const parseLines = (raw: string) => {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const sep = line.includes('|') ? '|' : line.includes(':') ? ':' : null;
      if (!sep) return null as any;
      const parts = line.split(sep);
      if (parts.length !== 2) return null as any;
      return { email: parts[0].trim(), pass: parts[1].trim(), original: line };
    })
    .filter(Boolean) as Array<{ email: string; pass: string; original: string }>;
};

const dedupeByEmail = (items: Array<{ email: string; pass: string; original: string }>) => {
  const seen = new Set<string>();
  const out: typeof items = [];
  for (const it of items) {
    const key = it.email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
};

const GetOAuth2Service: React.FC<GetOAuth2ServiceProps> = ({ onCopy }) => {
  const [inputText, setInputText] = useState('');
  const [token, setToken] = useState('');
  const [removeDup, setRemoveDup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<RowItem[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const startIsoRef = useRef<string>('');
  const emailsSetRef = useRef<Set<string>>(new Set());

  const parsedPreview = useMemo(() => parseLines(inputText), [inputText]);

  useEffect(() => {
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  const setupRealtime = () => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase
      .channel('oauth2-transactions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions' },
        (payload: any) => {
          const rec = payload.new;
          if (!rec) return;
          if (rec.product_name !== PRODUCT_NAME) return;
          if (rec.token !== token) return;
          if (startIsoRef.current && rec.timestamp < startIsoRef.current) return;

          const noteEmail = (rec.note || '').toString();
          if (!noteEmail || !emailsSetRef.current.has(noteEmail)) return;

          setRows((prev) => {
            const idx = prev.findIndex((r) => r.email === noteEmail);
            if (idx === -1) return prev;

            const next = [...prev];
            const r = { ...next[idx] };
            const status = (rec.status || '').toString();

            if (status === 'success') {
              // response_data expected to be object with refresh_token & CLIENT_ID
              let refreshToken = '';
              let clientId = '';
              try {
                if (rec.response_data?.refresh_token) refreshToken = rec.response_data.refresh_token;
                if (rec.response_data?.CLIENT_ID) clientId = rec.response_data.CLIENT_ID;
                if ((!refreshToken || !clientId) && Array.isArray(rec.output_result) && rec.output_result[0]) {
                  const parts = (rec.output_result[0] as string).split('|');
                  if (parts.length >= 4) {
                    refreshToken = parts[2];
                    clientId = parts[3];
                  }
                }
              } catch (_) {}

              r.status = 'success';
              r.refreshToken = refreshToken;
              r.clientId = clientId;
              r.resultText = Array.isArray(rec.output_result) ? rec.output_result[0] : undefined;
            } else if (status === 'fail') {
              r.status = 'fail';
            }

            next[idx] = r;
            return next;
          });
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const creds = parseLines(inputText);
    if (!creds.length) {
      toast({ title: 'Error', description: "Please enter one credential per line in the format email|password or email:password", variant: 'destructive' });
      return;
    }

    const filtered = removeDup ? dedupeByEmail(creds) : creds;
    if (filtered.length > 100) {
      toast({ title: 'Error', description: 'Maximum 100 emails per request', variant: 'destructive' });
      return;
    }

    if (!token.trim()) {
      toast({ title: 'Error', description: 'Please enter your authorization token', variant: 'destructive' });
      return;
    }

    // Prepare rows immediately
    const initRows: RowItem[] = filtered.map((c, i) => ({ stt: i + 1, email: c.email, pass: c.pass, status: 'pending' }));
    setRows(initRows);
    setSubmitted(true);

    // Track emails set & start time for realtime filtering
    emailsSetRef.current = new Set(filtered.map((c) => c.email));
    startIsoRef.current = new Date().toISOString();
    setupRealtime();

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-oauth2-token', {
        body: {
          token: token.trim(),
          email_passwords: inputText,
          remove_duplicates: removeDup,
        }
      });

      if (error) {
        let errMsg = error.message || 'Server response error';
        try {
          const ed = JSON.parse(errMsg);
          errMsg = ed.message || errMsg;
        } catch {}
        toast({ title: 'Error', description: errMsg, variant: 'destructive' });
        return;
      }

      if (!data?.success) {
        toast({ title: 'Error', description: data?.message || 'Server response error', variant: 'destructive' });
        return;
      }

      toast({ title: 'Processing started', description: `Queued ${data.count || initRows.length} emails (up to 10 parallel). Live results will appear below.` });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Server error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const generateApiUrl = () => {
    const baseUrl = 'https://vvtnzixsxfjzwhjetrfm.supabase.co/functions/v1';
    return `${baseUrl}/get-oauth2-token`;
  };

  const generateApiBody = () => {
    if (!inputText || !token) return '';
    return JSON.stringify({
      token: token.trim(),
      email_passwords: inputText,
      remove_duplicates: removeDup,
    }, null, 2);
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onCopy(text);
      toast({ title: 'Copied', description: 'Copied to clipboard' });
    } catch {
      toast({ title: 'Copy failed', description: 'Unable to copy', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <CardTitle>Get OAuth2 Token</CardTitle>
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Live</Badge>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Retrieve OAuth2 (refresh_token|client_id) using email credentials. Supported separators: | or :
            </p>
            <div className="flex items-center gap-2">
              <Badge className="bg-cyan-100 text-cyan-800 hover:bg-cyan-100">Outlook</Badge>
              <span className="text-sm text-muted-foreground">and</span>
              <Badge className="bg-cyan-100 text-cyan-800 hover:bg-cyan-100">Hotmail</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emailPassword">Email and Password</Label>
              <Textarea
                id="emailPassword"
                placeholder={`email@domain1.com|password1\nemail@domain2.com:password2`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="font-mono text-sm min-h-[160px]"
              />
              <p className="text-xs text-muted-foreground">
                One credential per line. Supported separators: | or : . Max 100 lines per request.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Checkbox id="removeDup" checked={removeDup} onCheckedChange={(v) => setRemoveDup(Boolean(v))} />
                <Label htmlFor="removeDup" className="text-sm">Remove Duplicate</Label>
              </div>
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
          {inputText && token && (
            <div className="mt-6">
              <Separator className="mb-4" />
              <h3 className="font-semibold mb-3">API Endpoint:</h3>

              <div className="bg-muted p-3 rounded-lg mb-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-primary">POST Request</span>
                  <Button size="sm" variant="outline" onClick={() => onCopy(generateApiUrl())}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <code className="text-xs bg-background p-2 rounded block break-all">
                  {generateApiUrl()}
                </code>
              </div>

              <div className="bg-muted p-3 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-primary">Request Body</span>
                  <Button size="sm" variant="outline" onClick={() => onCopy(generateApiBody())}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
                  {generateApiBody()}
                </pre>
              </div>
            </div>
          )}

          {/* Live Results Table */}
          {submitted && (
            <div className="mt-6">
              <Separator className="mb-4" />
              <h3 className="font-semibold mb-3">Processing Results</h3>
              <div className="max-h-[360px] overflow-y-auto rounded border">
                <Table>
                  <TableCaption>Status updates in real time</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>STT</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Pass</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>OAuth2 (refresh_token|client_id)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => {
                      const oauthStr = r.refreshToken && r.clientId ? `${r.refreshToken}|${r.clientId}` : '';
                      return (
                        <TableRow key={r.stt}>
                          <TableCell className="font-mono text-xs">{r.stt}</TableCell>
                          <TableCell className="font-mono text-xs">
                            <button className="underline-offset-2 hover:underline" onClick={() => copy(r.email)} title="Copy email">
                              {r.email}
                            </button>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            <button className="underline-offset-2 hover:underline" onClick={() => copy(r.pass)} title="Copy password">
                              {r.pass}
                            </button>
                          </TableCell>
                          <TableCell>
                            {r.status === 'pending' && <Badge className="bg-amber-100 text-amber-800">pending</Badge>}
                            {r.status === 'success' && <Badge className="bg-emerald-100 text-emerald-800">success</Badge>}
                            {r.status === 'fail' && <Badge className="bg-red-100 text-red-800">fail</Badge>}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {oauthStr ? (
                              <button className="underline-offset-2 hover:underline" onClick={() => copy(oauthStr)} title="Copy refresh_token|client_id">
                                {oauthStr}
                              </button>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GetOAuth2Service;
