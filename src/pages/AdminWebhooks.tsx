import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAdmin } from '@/hooks/useAdmin';
import { 
  Loader2, 
  Plus, 
  Trash2, 
  Link as LinkIcon,
  Shield,
  Users
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Navigate } from 'react-router-dom';

interface Profile {
  id: string;
  email: string | null;
}

interface WebhookUrl {
  id: string;
  user_id: string;
  webhook_url: string;
  created_at: string | null;
  profiles?: Profile;
}

export default function AdminWebhooks() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { toast } = useToast();
  
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookUrl[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    
    const fetchData = async () => {
      try {
        // Fetch all profiles
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email')
          .order('email');

        if (profilesData) {
          setProfiles(profilesData);
        }

        // Fetch all webhooks
        const { data: webhooksData } = await supabase
          .from('webhook_urls')
          .select('*')
          .order('created_at', { ascending: false });

        if (webhooksData) {
          // Map profiles to webhooks
          const webhooksWithProfiles = webhooksData.map(webhook => ({
            ...webhook,
            profiles: profilesData?.find(p => p.id === webhook.user_id)
          }));
          setWebhooks(webhooksWithProfiles);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAdmin]);

  const handleAddWebhook = async () => {
    if (!selectedUserId || !webhookUrl) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Selecione um usuário e insira a URL do webhook.',
        variant: 'destructive',
      });
      return;
    }

    // Check if user already has a webhook
    const existingWebhook = webhooks.find(w => w.user_id === selectedUserId);
    if (existingWebhook) {
      toast({
        title: 'Usuário já possui webhook',
        description: 'Este usuário já tem um webhook cadastrado. Delete o existente primeiro.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('webhook_urls')
        .insert({
          user_id: selectedUserId,
          webhook_url: webhookUrl,
          created_by_admin: true,
        })
        .select()
        .single();

      if (error) throw error;

      const profile = profiles.find(p => p.id === selectedUserId);
      setWebhooks(prev => [{ ...data, profiles: profile }, ...prev]);
      setSelectedUserId('');
      setWebhookUrl('');

      toast({
        title: 'Webhook adicionado!',
        description: 'O webhook foi cadastrado com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao adicionar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    try {
      const { error } = await supabase
        .from('webhook_urls')
        .delete()
        .eq('id', webhookId);

      if (error) throw error;

      setWebhooks(prev => prev.filter(w => w.id !== webhookId));

      toast({
        title: 'Webhook removido!',
        description: 'O webhook foi removido com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao remover',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (adminLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <div className="gradient-primary p-3 rounded-lg">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin - Webhooks</h1>
            <p className="text-muted-foreground">
              Gerencie os webhooks dos usuários
            </p>
          </div>
        </div>

        {/* Add New Webhook */}
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Adicionar Webhook
            </CardTitle>
            <CardDescription>
              Cadastre um novo webhook para um usuário
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Usuário *</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {profile.email || 'Sem email'}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>URL do Webhook *</Label>
                <Input
                  placeholder="https://seu-webhook.com/endpoint"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
              </div>
            </div>

            <Button 
              onClick={handleAddWebhook} 
              disabled={isSaving}
              className="gradient-primary"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Adicionar Webhook
            </Button>
          </CardContent>
        </Card>

        {/* Webhooks List */}
        <Card className="animate-slide-up" style={{ animationDelay: '100ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Webhooks Cadastrados
            </CardTitle>
            <CardDescription>
              Lista de todos os webhooks cadastrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : webhooks.length === 0 ? (
              <Alert>
                <AlertDescription>
                  Nenhum webhook cadastrado ainda.
                </AlertDescription>
              </Alert>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>URL do Webhook</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhooks.map((webhook) => (
                    <TableRow key={webhook.id}>
                      <TableCell className="font-medium">
                        {webhook.profiles?.email || 'Usuário desconhecido'}
                      </TableCell>
                      <TableCell className="font-mono text-sm max-w-[300px] truncate">
                        {webhook.webhook_url}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {webhook.created_at 
                          ? new Date(webhook.created_at).toLocaleDateString('pt-BR')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteWebhook(webhook.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
