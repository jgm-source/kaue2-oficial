# Docker - Meta Events Manager

Instruções para executar o projeto usando Docker.

## Pré-requisitos

- Docker instalado (versão 20.10 ou superior)
- Docker Compose instalado (versão 1.29 ou superior)

## Configuração

1. **Configure as variáveis de ambiente**

Certifique-se de que o arquivo `.env` está configurado com as credenciais corretas do Supabase:

```env
VITE_SUPABASE_PROJECT_ID="iqzakpwzkiwesspfuutu"
VITE_SUPABASE_PUBLISHABLE_KEY="sua-chave-aqui"
VITE_SUPABASE_URL="https://iqzakpwzkiwesspfuutu.supabase.co"
```

## Executar com Docker Compose (Recomendado)

### Build e Start

```bash
docker-compose up -d --build
```

### Parar o container

```bash
docker-compose down
```

### Ver logs

```bash
docker-compose logs -f
```

### Acessar a aplicação

Abra o navegador em: http://localhost:3000

## Executar com Docker (Manual)

### Build da imagem

```bash
docker build -t meta-events-manager .
```

### Executar o container

```bash
docker run -d -p 3000:80 --name meta-events-manager meta-events-manager
```

### Parar o container

```bash
docker stop meta-events-manager
```

### Remover o container

```bash
docker rm meta-events-manager
```

### Ver logs

```bash
docker logs -f meta-events-manager
```

## Estrutura do Dockerfile

O Dockerfile usa uma estratégia de **multi-stage build**:

1. **Build Stage**: 
   - Usa Node.js 18 Alpine
   - Instala dependências
   - Compila o projeto com Vite

2. **Production Stage**:
   - Usa Nginx Alpine (imagem leve)
   - Copia apenas os arquivos compilados
   - Serve a aplicação na porta 80

## Configuração do Nginx

O arquivo `nginx.conf` inclui:

- ✅ Suporte para React Router (SPA)
- ✅ Compressão Gzip
- ✅ Cache de assets estáticos
- ✅ Headers de segurança
- ✅ Sem cache para index.html

## Otimizações

- Imagem final ~25MB (Nginx Alpine)
- Build otimizado com cache de layers
- `.dockerignore` para excluir arquivos desnecessários
- Compressão Gzip habilitada
- Cache de assets estáticos (1 ano)

## Troubleshooting

### Porta 3000 já está em uso

Altere a porta no `docker-compose.yml`:

```yaml
ports:
  - "8080:80"  # Usar porta 8080 ao invés de 3000
```

### Erro de build

Limpe o cache do Docker:

```bash
docker system prune -a
docker-compose build --no-cache
```

### Variáveis de ambiente não funcionam

As variáveis de ambiente do Vite são compiladas no build. Se você alterar o `.env`, precisa fazer rebuild:

```bash
docker-compose up -d --build
```

## Produção

Para deploy em produção, considere:

1. Usar um registry de imagens (Docker Hub, AWS ECR, etc.)
2. Configurar HTTPS com certificado SSL
3. Usar um reverse proxy (Traefik, Nginx Proxy Manager)
4. Configurar health checks
5. Implementar CI/CD para builds automáticos

### Exemplo de push para Docker Hub

```bash
# Login
docker login

# Tag da imagem
docker tag meta-events-manager seu-usuario/meta-events-manager:latest

# Push
docker push seu-usuario/meta-events-manager:latest
```

## Suporte

Para problemas ou dúvidas, consulte a documentação do Docker:
- https://docs.docker.com/
- https://docs.docker.com/compose/
