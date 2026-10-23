# Diferenças entre a maquete física (fotos de 22/10/2026) e o mapa 3D

Fonte das fotos: `documentos/escola/projetao/fotos-maquete-22-10/` (inventário e 4 folhas de contato; as fotos grandes 26, 27, 34, 36, 37, 38, 41, 42, 43, 45, 46, 47 foram vistas uma a uma). **A planta (`compartilhado/maquete.js`) manda em posição e em ID.** As fotos mandam em aparência e contagem. Medidas antes de mexer: **236 meshes, 412 draw calls, 46.976 triângulos** (vista da cidade, 1400 x 900, alta).

Regras desta atualização: nenhuma coordenada de bloco, via ou sensor muda; nenhum campo do contrato, módulo, cartão ou sensor é removido; itens novos entram numa seção `// fotos 22/10` de `maquete.js`; o que o inventário marca como "não confirmado" fica como está.

## Residencial (bloco 2, x 4 a 50, y 46 a 96)

| A foto mostra | O código desenha hoje | O que vou fazer |
|---|---|---|
| 4 casas diferentes de caixa branca com telhado de **duas águas** | 3 casas iguais, parede bege, telhado de quatro águas (cone de 4 lados) | 4 casas com telhado de duas águas (prisma): casa 1 (x 9) rosa, casa 2 (x 22) marrom, casa 3 (x 35) verde-água, casa 4 branca de zinco. A casa 4 é nova (`// fotos 22/10`, atrás da faixa verde) |
| Casa rosa: telhado rosa com bordas azuis, triângulo de frente mais escuro, coração azul, porta rosa | Parede e porta bege | Casa 1: telhado rosa com tiras azuis nos beirais e na cumeeira, coração azul na frente, porta rosa. Segue com o brilho do aquecimento |
| Casa marrom: parede branca, telhado marrom liso, porta marrom com grade, janela de grade | Telhado cor de barro | Casa 2: parede branca, telhado marrom liso, porta marrom com grade (textura pequena). Segue com persiana na lateral e o painel solar no telhado |
| Casa verde-água: parede verde-água, telhado de escamas claro, porta grande aberta em arco | Idem | Casa 3: parede verde-água, telhado com textura de escamas (canvas pequeno), arco escuro no lugar da porta |
| Casa branca: telhado de zinco marrom ondulado, janela azul | Idem | Casa 4: telhado marrom ondulado (textura de listras), janela azul |
| Faixa verde-água comprida com pedrinhas brancas nas duas bordas | Só uma calçada bege fina (y 67 a 69) | A calçada fica. Faixa verde-água nova (x 9 a 45, y 70 a 73) com pedrinhas brancas instanciadas nas bordas |
| Retalhos de grama sintética entre as casas | Nada | Retalhos de grama (caixas finas verdes) nos vãos entre as casas |
| Janelas: pretas com borda amarela ou azuis | 1 material único de janela (modo noite) | Mantém **um material único** para todas as janelas (modo noite); cor do dia fica azulada |

## Energia (bloco 1, x 4 a 32, y 4 a 34)

| A foto mostra | O código desenha hoje | O que vou fazer |
|---|---|---|
| Placa de grama sintética verde cobrindo a área | Bloco na tinta pastel âmbar | Grama sintética (placa verde fina) sobre o bloco, com uma borda fina da tinta da área |
| **3 turbinas** brancas (torre, 3 pás, base redonda com pedrinhas brancas) | 1 turbina em (24, 20), sem base de pedrinhas | A atual vira a primeira; 2 novas (`// fotos 22/10`). Base redonda branca com pedrinhas em cada uma. As 3 giram juntas com `eolica_w` |
| **4 painéis solares** cinza escuro inclinados, em duas colunas desencontradas | 2 painéis azuis (pastel) | Os 2 existentes ficam no lugar; 2 novos. Cor passa para cinza azulado escuro, com a mesma textura de células |
| Caixa de baterias: **não aparece** nas fotos (não confirmado) | Caixa de baterias em (7, 29) com LED de bateria | Mantém (não confirmado) |
| Árvores: não aparecem nas fotos | 2 árvores | Mantém (a planta tem; não confirmado que sumiram) |

## Mobilidade (bloco 4, x 58 a 116, y 46 a 96)

| A foto mostra | O código desenha hoje | O que vou fazer |
|---|---|---|
| Trilho **circular** vermelho de plástico sobre base marrom escura, pedrinhas brancas dentro e fora | Trilho reto de 50 cm (x 61 a 111, y 58) com dormentes | Anel vermelho (diâmetro uns 28 cm, centro novo em (74, 67)) com travessas escuras instanciadas, base marrom escura quadrada, pedrinhas brancas dentro e fora. Substitui o trilho reto |
| Trem branco, 3 vagões, nariz azul arredondado | Trem azul curto de 1 caixa, anda de x 61 a 111 | Trem de 3 carros brancos com nariz azul, andando no círculo. O dado `trem`/`demonstracao` continua: "em movimento" dá voltas, "na estação" para perto do galpão, "parado" fica onde está. A posição vira **fração de volta** |
| Faixa vermelha com tracejado amarelo e duas setas brancas (uma para cada sentido) | Faixa vermelha (y 90 a 94) com tracejado rosa claro | Mesma posição; tracejado amarelo e duas setas brancas de sentidos opostos |
| Galpão marrom de telhado baixo ao lado do círculo (provável estação, não confirmado) | Plataforma da estação clara (x 70, y 62) | Galpão marrom novo (`// fotos 22/10`) à direita do círculo. A **plataforma não é mais desenhada**: ela cai dentro do círculo (decisão minha) |
| Sem ônibus, sem ponto de ônibus, sem painel de partidas, sem banco (confirmado pelo Samuel) | Ônibus azul, ponto de ônibus, painel de partidas com tela, banco vermelho | Removo do desenho. Os campos `proximo_veiculo`, `veiculo_na_plataforma` e o painel continuam no contrato e nos cartões; o código que escreve o painel fica sem uso visual |
| Árvores: não aparecem | 3 árvores | Mantém (a planta tem). Escolhi o centro do círculo para nenhuma árvore cair em cima do anel |
| Sensores ultrassônicos ao lado da faixa | S16, S17, S18, P2 como marcadores | Marcadores ficam onde estão (posição e ID da planta). Os que sobram sem objeto embaixo vão para o relatório |

## Centro Urbano (bloco 3, x 42 a 72, y 4 a 34)

| A foto mostra | O código desenha hoje | O que vou fazer |
|---|---|---|
| **Shopping**: azul claro, grade de janelas quadradas, porta vermelha dupla, letreiro "Shopping", topo com glitter, parte de trás azul escuro mais alta | 3 prédios cinza com janelas | Prédio do meio (x 58): frente azul clara com janelas (material único), porta vermelha dupla, letreiro "Shopping" (textura de canvas pequena), parte de trás azul escuro mais alta |
| **Candy Sweet**: loja baixa rosa, toldo listrado rosa e branco, letreiro "Candy Sweet" | idem | Prédio da esquerda (x 44): loja baixa rosa, toldo listrado (textura de listras), letreiro "Candy Sweet" |
| Prédio **alto azul escuro** ao lado | idem | Prédio da direita (x 65): alto, azul escuro |
| Semáforo de palito de madeira com caixa preta pequena | Poste cinza com caixa e 3 luzes | Mantém as 3 luzes funcionando; poste de madeira e caixa escura menor |
| Praça circular e estacionamento com 4 vagas: **não existem mais** (confirmado pelo Samuel) | Praça circular, estacionamento com linhas, 4 carros | Removo do desenho: praça, estacionamento e carros. Campo `vagas_livres` e sensores S4 a S7 continuam (marcadores sem objeto) |

## Postes e sensores

| A foto mostra | O código desenha hoje | O que vou fazer |
|---|---|---|
| Postes de canudo listrado vermelho e branco, curvados no topo (bengala), LED na ponta, base de massinha verde | Vareta reta listrada, LED no alto, base cinza | Mesmos 16 pontos. Haste mais curta, gancho curvo (arco de torus instanciado) virado para a rua, LED e halo na ponta, base verde |
| Módulos ultrassônicos (dois cilindros prateados) em alguns pontos | Marcadores esfera, octaedro e caixa | **Não vou fazer** o modelo ultrassônico (opcional): as fotos não dizem qual sensor da planta é qual |

## Não vou mexer

Blocos, vias, faixas, coordenadas e IDs de sensores, ESP32 escondido no palete (marcadores de ESP32 ficam como estão, sem placa física), Economia Circular (as fotos não a mostram), palete, luz e sombras, contrato e servidor.

## O que foi feito

Todas as fases (1 a 5) foram feitas; o único item deixado de fora é o modelo ultrassônico opcional. O detalhamento e as decisões estão em `docs/DECISOES.md`, itens 159 a 166. Depois: 219 meshes, 379 chamadas de desenho, 68.144 triângulos (antes 236, 412 e 46.976).

## Conferência de tamanhos e posições (23/10/2026)

Depois das cinco fases, `npm run colisoes` conferiu proporções, sobreposições, pinos dos sensores e câmera. O que mudou e o que ficou está em `docs/DECISOES.md`, itens 167 a 169.
