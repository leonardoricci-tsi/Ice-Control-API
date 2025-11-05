# Central Informação API

API REST construída com [NestJS](https://nestjs.com/) e [Prisma](https://www.prisma.io/) para atender a aplicação Angular do projeto Central Informação. O desenho do banco segue o diagrama compartilhado (usuários, clientes, fornecedores, produtos, pedidos, itens de pedido e movimentações de estoque).

## Requisitos

- Node.js >= 18.18
- PostgreSQL 13+
- `npm` ou `yarn`

## Configuração

1. Copie o arquivo `.env.example` para `.env` e ajuste a variável `DATABASE_URL`.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Gere o cliente do Prisma e aplique as migrações:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate -- --name init
   ```
4. Popule a base com dados exemplo:
   ```bash
   npm run prisma:seed
   ```
5. Suba o servidor em modo desenvolvimento:
   ```bash
   npm run start:dev
   ```

Por padrão a API responde em `http://localhost:3000/api`.

## Estrutura

- `src/prisma`: configuração do cliente Prisma e filtro de exceções.
- `src/users`, `src/customers`, `src/suppliers`, `src/product-categories`, `src/products`, `src/orders`, `src/stock-movements`: módulos REST separados por domínio.
- `prisma/schema.prisma`: modelos relacionais (User, Customer, Supplier, ProductCategory, Product, Order, OrderItem, StockMovement).
- `prisma/seed.ts`: script opcional de carga inicial (usuário admin, categorias, fornecedores, produtos, clientes e um pedido).

## Endpoints

Todos os endpoints estão sob o prefixo `/api`.

### Usuários
- `POST /users` — cria usuário (senha armazenada com Argon2).
- `GET /users` — lista usuários.
- `GET /users/:id`
- `PATCH /users/:id`
- `DELETE /users/:id`

### Clientes
- `POST /customers`
- `GET /customers?search=nome` — busca por nome, documento ou e-mail.
- `GET /customers/:id` — inclui pedidos com itens.
- `PATCH /customers/:id`
- `DELETE /customers/:id`

### Fornecedores
- `POST /suppliers`
- `GET /suppliers` — inclui produtos relacionados.
- `GET /suppliers/:id`
- `PATCH /suppliers/:id`
- `DELETE /suppliers/:id`

### Categorias de Produto
- `POST /product-categories`
- `GET /product-categories`
- `GET /product-categories/:id`
- `PATCH /product-categories/:id`
- `DELETE /product-categories/:id`

### Produtos
- `POST /products`
- `GET /products?search=&categoryId=&supplierId=&onlyActive=true`
- `GET /products/:id` — inclui categoria, fornecedor e movimentações.
- `PATCH /products/:id`
- `DELETE /products/:id`

### Pedidos
- `POST /orders` — gera número sequencial automaticamente se não fornecido; atualiza estoque e cria movimentações.
- `GET /orders?status=&customerId=&from=&to=`
- `GET /orders/:id`
- `PATCH /orders/:id` — atualiza status, forma de pagamento ou vencimento.
- `DELETE /orders/:id` — estorna estoque e registra movimentação de cancelamento.

### Movimentações de Estoque
- `POST /stock-movements` — ajusta o estoque (positivo ou negativo) e registra motivo.
- `GET /stock-movements?productId=&from=&to=`
- `GET /stock-movements/:id`

## Próximos passos sugeridos

- Adicionar autenticação (JWT) e controle de acesso por `role`.
- Implementar testes automatizados (unitários e e2e).
- Integrar com ferramentas de observabilidade (logging estruturado e métricas).
