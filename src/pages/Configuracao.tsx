import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Save, Copy, Check, Loader2, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Credentials {
  id?: number;
  'ID do Pixel': string;
  'Page_ID': string;
  'Acess_Token': string;
}

export default function Configuracao() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [credentials, setCredentials] = useState<Credentials>({
    'ID do Pixel': '',
    'Page_ID': '',
    'Acess_Token': '',
  });
  const [showToken, setShowToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [credentialsId, setCredentialsId] = useState<number | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string>('');

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    try {
      // Buscar credenciais da tabela Credenciais (pegar o primeiro registro)
      const { data, error } = await supabase
        .from('Credenciais')
        .select('*')
        .limit(1)
        .single();

      if (data) {
        setCredentials({
          'ID do Pixel': data['ID do Pixel']?.toString() || '',
          'Page_ID': data['Page_ID']?.toString() || '',
          'Acess_Token': data['Acess_Token'] || '',
        });
        setWebhookUrl(data['Webhook'] || '');
        setCredentialsId(data.id);
      }
    } catch (error: any) {
      console.error('Erro ao buscar credenciais:', error);
    }
  };

  const handleSave = async () => {
    if (!credentials['ID do Pixel'] || !credentials['Acess_Token']) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Pixel ID e Access Token são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      if (credentialsId) {
        // Atualizar credenciais existentes
        const { error } = await supabase
          .from('Credenciais')
          .update({
            'ID do Pixel': parseFloat(credentials['ID do Pixel']),
            'Page_ID': credentials['Page_ID'] ? parseFloat(credentials['Page_ID']) : null,
            'Acess_Token': credentials['Acess_Token'],
          })
          .eq('id', credentialsId);

        if (error) throw error;
      } else {
        // Inserir novas credenciais
        const { data, error } = await supabase
          .from('Credenciais')
          .insert({
            'ID do Pixel': parseFloat(credentials['ID do Pixel']),
            'Page_ID': credentials['Page_ID'] ? parseFloat(credentials['Page_ID']) : null,
            'Acess_Token': credentials['Acess_Token'],
          })
          .select()
          .single();

        if (error) throw error;
        if (data) setCredentialsId(data.id);
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

  const copyAccessToken = () => {
    if (credentials['Acess_Token']) {
      navigator.clipboard.writeText(credentials['Acess_Token']);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
      toast({
        title: 'Copiado!',
        description: 'Access Token copiado para a área de transferência.',
      });
    }
  };

  const copyWebhook = () => {
    if (webhookUrl) {
      navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
      toast({
        title: 'Copiado!',
        description: 'Webhook URL copiado para a área de transferência.',
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
                value={credentials['ID do Pixel']}
                onChange={(e) => setCredentials({ ...credentials, 'ID do Pixel': e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="page_id">Page ID (opcional)</Label>
              <Input
                id="page_id"
                placeholder="Ex: 123456789012345"
                value={credentials['Page_ID']}
                onChange={(e) => setCredentials({ ...credentials, 'Page_ID': e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="access_token">Access Token *</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="access_token"
                    type={showToken ? 'text' : 'password'}
                    placeholder="EAAxxxxxxxxxx..."
                    value={credentials['Acess_Token']}
                    onChange={(e) => setCredentials({ ...credentials, 'Acess_Token': e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button 
                  variant="outline" 
                  onClick={copyAccessToken}
                  disabled={!credentials['Acess_Token']}
                  className="shrink-0"
                >
                  {copiedToken ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
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
            </div>
          </CardContent>
        </Card>

        {/* Webhook URL Card - Somente Leitura */}
        {webhookUrl && (
          <Card className="animate-slide-up" style={{ animationDelay: '100ms' }}>
            <CardHeader>
              <CardTitle>Webhook Configurado</CardTitle>
              <CardDescription>
                URL do webhook configurada no banco de dados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={webhookUrl}
                    readOnly
                    className="font-mono text-sm bg-muted cursor-not-allowed"
                  />
                  <Button variant="outline" onClick={copyWebhook}>
                    {copiedWebhook ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Este campo é gerenciado diretamente no banco de dados
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
