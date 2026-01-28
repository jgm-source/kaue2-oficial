import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { WebhookInstructions } from '@/components/WebhookInstructions';
import { ClientSupabaseConfig } from '@/components/ClientSupabaseConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Save, TestTube, Copy, Check, Loader2, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
interface MetaCredentials {
  pixel_id: string;
  page_id: string;
  access_token: string;
}

export default function Configuracao() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [credentials, setCredentials] = useState<MetaCredentials>({
    pixel_id: '',
    page_id: '',
    access_token: '',
  });
  const [showToken, setShowToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasExistingCredentials, setHasExistingCredentials] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Fetch existing credentials
    const fetchCredentials = async () => {
      const { data } = await supabase
        .from('meta_credentials')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setCredentials({
          pixel_id: data.pixel_id,
          page_id: data.page_id || '',
          access_token: data.access_token,
        });
        setHasExistingCredentials(true);
      }
    };

    // Fetch webhook URL
    const fetchWebhook = async () => {
      const { data } = await supabase
        .from('webhook_urls')
        .select('webhook_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setWebhookUrl(data.webhook_url);
      }
    };

    fetchCredentials();
    fetchWebhook();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    if (!credentials.pixel_id || !credentials.access_token) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Pixel ID e Access Token são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      if (hasExistingCredentials) {
        const { error } = await supabase
          .from('meta_credentials')
          .update({
            pixel_id: credentials.pixel_id,
            page_id: credentials.page_id || null,
            access_token: credentials.access_token,
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('meta_credentials')
          .insert({
            user_id: user.id,
            pixel_id: credentials.pixel_id,
            page_id: credentials.page_id || null,
            access_token: credentials.access_token,
          });

        if (error) throw error;
        setHasExistingCredentials(true);
      }

      toast({
        title: 'Salvo com sucesso!',
        description: 'Suas credenciais foram atualizadas.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!credentials.pixel_id || !credentials.access_token) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o Pixel ID e Access Token para testar.',
        variant: 'destructive',
      });
      return;
    }

    setIsTesting(true);
    try {
      // Test the Meta API connection
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${credentials.pixel_id}?access_token=${credentials.access_token}`
      );
      
      if (response.ok) {
        toast({
          title: 'Conexão bem-sucedida!',
          description: 'Suas credenciais estão válidas.',
        });
      } else {
        const error = await response.json();
        throw new Error(error.error?.message || 'Credenciais inválidas');
      }
    } catch (error: any) {
      toast({
        title: 'Falha na conexão',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const copyWebhookUrl = () => {
    if (webhookUrl) {
      navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Copiado!',
        description: 'URL do webhook copiada para a área de transferência.',
      });
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuração</h1>
          <p className="text-muted-foreground">
            Configure suas credenciais da Meta e webhook
          </p>
        </div>

        {/* Meta Credentials Card */}
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="gradient-primary p-2 rounded-lg">
                <LinkIcon className="h-4 w-4 text-primary-foreground" />
              </div>
              Credenciais da Meta
            </CardTitle>
            <CardDescription>
              Configure seu Pixel ID e Access Token para enviar eventos de conversão
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pixel_id">Pixel ID *</Label>
              <Input
                id="pixel_id"
                placeholder="Ex: 123456789012345"
                value={credentials.pixel_id}
                onChange={(e) => setCredentials({ ...credentials, pixel_id: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="page_id">Page ID (opcional)</Label>
              <Input
                id="page_id"
                placeholder="Ex: 123456789012345"
                value={credentials.page_id}
                onChange={(e) => setCredentials({ ...credentials, page_id: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="access_token">Access Token *</Label>
              <div className="relative">
                <Input
                  id="access_token"
                  type={showToken ? 'text' : 'password'}
                  placeholder="EAAxxxxxxxxxx..."
                  value={credentials.access_token}
                  onChange={(e) => setCredentials({ ...credentials, access_token: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={isSaving} className="gradient-primary">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Configurações
              </Button>
              <Button variant="outline" onClick={handleTestConnection} disabled={isTesting}>
                {isTesting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <TestTube className="h-4 w-4 mr-2" />
                )}
                Testar Conexão
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Webhook URL Card */}
        <Card className="animate-slide-up" style={{ animationDelay: '100ms' }}>
          <CardHeader>
            <CardTitle>URL do Webhook</CardTitle>
            <CardDescription>
              Use esta URL para configurar o webhook na sua plataforma de pagamentos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {webhookUrl ? (
              <>
                <div className="flex gap-2">
                  <Input
                    value={webhookUrl}
                    readOnly
                    className="font-mono text-sm bg-muted"
                  />
                  <Button variant="outline" onClick={copyWebhookUrl}>
                    {copied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <WebhookInstructions />
              </>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Webhook não configurado. Entre em contato com o suporte para obter sua URL personalizada.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Client Supabase Configuration */}
        <ClientSupabaseConfig />
      </div>
    </Layout>
  );
}