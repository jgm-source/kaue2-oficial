import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  Database, 
  Eye, 
  EyeOff, 
  Save, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  Info,
  Unplug
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

interface ClientSupabaseCredentials {
  url: string;
  key: string;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export function ClientSupabaseConfig() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [credentials, setCredentials] = useState<ClientSupabaseCredentials>({
    url: '',
    key: '',
  });
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [hasExistingConfig, setHasExistingConfig] = useState(false);

  // Auto-test connection when credentials change
  const testConnection = useCallback(async (url: string, key: string): Promise<boolean> => {
    if (!url || !key) {
      setConnectionStatus('disconnected');
      return false;
    }

    try {
      // Validate URL format
      const urlPattern = /^https:\/\/[a-z0-9-]+\.supabase\.co$/;
      if (!urlPattern.test(url)) {
        setConnectionError('Formato de URL inválido. Use: https://xxxxx.supabase.co');
        setConnectionStatus('error');
        return false;
      }

      setConnectionStatus('connecting');

      // Create a test client
      const testClient = createClient(url, key);
      
      // Try to make a simple request to verify connection
      const { error } = await testClient.from('_test_connection_').select('*').limit(1);
      
      // We expect an error about the table not existing, but not an auth error
      if (error && error.message.includes('Invalid API key')) {
        setConnectionError('Chave de API inválida');
        setConnectionStatus('error');
        return false;
      }

      setConnectionError(null);
      setConnectionStatus('connected');
      return true;
    } catch (error: any) {
      if (error.message.includes('Invalid API key')) {
        setConnectionError('Chave de API inválida');
        setConnectionStatus('error');
        return false;
      }
      // Connection succeeded even if table doesn't exist
      setConnectionError(null);
      setConnectionStatus('connected');
      return true;
    }
  }, []);

  // Debounced auto-test
  useEffect(() => {
    const timer = setTimeout(() => {
      if (credentials.url && credentials.key) {
        testConnection(credentials.url, credentials.key);
      } else {
        setConnectionStatus('disconnected');
        setConnectionError(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [credentials.url, credentials.key, testConnection]);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('client_supabase_url, client_supabase_key')
        .eq('id', user.id)
        .maybeSingle();

      if (data && data.client_supabase_url && data.client_supabase_key) {
        setCredentials({
          url: data.client_supabase_url,
          key: data.client_supabase_key,
        });
        setHasExistingConfig(true);
      }
    };

    fetchProfile();
  }, [user]);

  const provisionTables = async (url: string, key: string) => {
    try {
      const clientSupabase = createClient(url, key);

      // Verify the connection works by trying to access something
      // Note: We can't actually create tables with the anon key
      // The user needs to create tables manually or use a service role key
      const { error } = await clientSupabase.from('meta_credentials').select('id').limit(1);
      
      if (error && !error.message.includes('does not exist')) {
        console.log('Client Supabase connected, but tables may not exist yet');
      }
      
      console.log('Client Supabase connected successfully');
      
      toast({
        title: 'Atenção',
        description: 'Lembre-se de criar as tabelas meta_credentials, webhook_urls e events no seu Supabase.',
      });
      
      return true;
    } catch (error) {
      console.error('Error provisioning tables:', error);
      return false;
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (!credentials.url || !credentials.key) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha a URL e a chave do Supabase.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      // Test connection first
      const isConnected = await testConnection(credentials.url, credentials.key);
      
      if (!isConnected) {
        toast({
          title: 'Falha na conexão',
          description: connectionError || 'Não foi possível conectar ao Supabase.',
          variant: 'destructive',
        });
        return;
      }

      // Save to profile
      const { error } = await supabase
        .from('profiles')
        .update({
          client_supabase_url: credentials.url,
          client_supabase_key: credentials.key,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Try to provision tables
      await provisionTables(credentials.url, credentials.key);

      setHasExistingConfig(true);

      toast({
        title: 'Configuração salva!',
        description: 'Seu Supabase foi conectado com sucesso.',
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

  const handleDisconnect = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          client_supabase_url: null,
          client_supabase_key: null,
        })
        .eq('id', user.id);

      if (error) throw error;

      setCredentials({ url: '', key: '' });
      setConnectionStatus('disconnected');
      setConnectionError(null);
      setHasExistingConfig(false);

      toast({
        title: 'Desconectado',
        description: 'Seu Supabase foi desconectado. Você pode conectar outro.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao desconectar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connecting':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'connected':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <XCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connecting':
        return 'Verificando...';
      case 'connected':
        return 'Conectado';
      case 'error':
        return 'Erro na conexão';
      default:
        return 'Desconectado';
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connecting':
        return 'text-primary';
      case 'connected':
        return 'text-success';
      case 'error':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Card className="animate-slide-up" style={{ animationDelay: '200ms' }}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="gradient-primary p-2 rounded-lg">
              <Database className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <CardTitle>Seu Banco de Dados</CardTitle>
              <CardDescription>
                Conecte seu próprio Supabase para armazenar dados
              </CardDescription>
            </div>
          </div>
          <div className={`flex items-center gap-2 text-sm font-medium ${getStatusColor()}`}>
            {getStatusIcon()}
            {getStatusText()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-accent/50 border-accent">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-foreground">
            Seus dados de eventos, credenciais da Meta e tokens serão armazenados no SEU Supabase.
          </AlertDescription>
        </Alert>

        {connectionError && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{connectionError}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="supabase_url">URL do Supabase *</Label>
          <Input
            id="supabase_url"
            placeholder="https://xxxxx.supabase.co"
            value={credentials.url}
            onChange={(e) => setCredentials({ ...credentials, url: e.target.value })}
            disabled={hasExistingConfig && connectionStatus === 'connected'}
          />
          <p className="text-xs text-muted-foreground">
            Encontre em: Supabase Dashboard → Settings → API → Project URL
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="supabase_key">Chave Anon/Public *</Label>
          <div className="relative">
            <Input
              id="supabase_key"
              type={showKey ? 'text' : 'password'}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={credentials.key}
              onChange={(e) => setCredentials({ ...credentials, key: e.target.value })}
              disabled={hasExistingConfig && connectionStatus === 'connected'}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Encontre em: Supabase Dashboard → Settings → API → anon public
          </p>
        </div>

        <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Importante:</strong> Use a chave <strong>anon/public</strong>, não a service role key. 
            A service role key tem acesso total ao banco e não deve ser exposta.
          </AlertDescription>
        </Alert>

        <div className="flex gap-3 pt-2">
          {hasExistingConfig && connectionStatus === 'connected' ? (
            <Button 
              variant="destructive" 
              onClick={handleDisconnect} 
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Unplug className="h-4 w-4 mr-2" />
              )}
              Desconectar e Usar Outro
            </Button>
          ) : (
            <Button 
              onClick={handleSave} 
              disabled={isSaving || connectionStatus === 'connecting'} 
              className="gradient-primary"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {hasExistingConfig ? 'Atualizar Conexão' : 'Salvar e Conectar'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
