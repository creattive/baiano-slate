# Configuração do EmailJS - Passo a Passo

## 📧 Como Configurar o Envio de Email

### 1. Criar Conta no EmailJS
1. Acesse: https://www.emailjs.com/
2. Crie uma conta gratuita
3. Confirme seu email

### 2. Configurar Serviço de Email
1. No dashboard, vá em **"Email Services"**
2. Clique em **"Add New Service"**
3. Escolha seu provedor (Gmail, Outlook, etc.)
4. Configure as credenciais
5. Anote o **Service ID** (ex: service_digitalslate)

### 3. Criar Template de Email
1. Vá em **"Email Templates"**
2. Clique em **"Create New Template"**
3. Configure o template com as seguintes variáveis:

\`\`\`html
Assunto: {{subject}}

De: {{from_name}} <{{from_email}}>
Para: {{to_email}}

{{message}}

---
Detalhes do Projeto:
- Título: {{project_title}}
- Diretor: {{director}}
- Data de Gravação: {{recording_date}}
- Total de Takes: {{total_takes}}

Anexo: {{filename}}
\`\`\`

4. Anote o **Template ID** (ex: template_digitalslate)

### 4. Obter Chave Pública
1. Vá em **"Account"** > **"General"**
2. Copie sua **Public Key**

### 5. Atualizar Configuração no Código
No arquivo `app/page.tsx`, atualize as constantes:

\`\`\`javascript
const EMAILJS_CONFIG = {
  serviceId: 'seu_service_id_aqui',
  templateId: 'seu_template_id_aqui', 
  publicKey: 'sua_public_key_aqui'
}
\`\`\`

### 6. Testar Funcionalidade
1. Preencha as informações do projeto
2. Crie alguns takes
3. Clique em "Exportar" > "Enviar por Email"
4. Preencha os dados e teste o envio

## 🔧 Solução de Problemas

### Email não está sendo enviado:
- Verifique se as credenciais do EmailJS estão corretas
- Confirme se o serviço de email está ativo
- Verifique o console do navegador para erros

### PDF não está sendo anexado:
- Verifique se há takes para gerar o relatório
- Confirme se as configurações de PDF estão corretas

### Limite de emails:
- Conta gratuita: 200 emails/mês
- Para mais emails, considere upgrade para plano pago

## 📋 Recursos Incluídos

✅ **Envio automático de PDF**
✅ **Template personalizável**
✅ **Validação de campos**
✅ **Status de envio em tempo real**
✅ **Informações do projeto incluídas**
✅ **Interface moderna e intuitiva**
