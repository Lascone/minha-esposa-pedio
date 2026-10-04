# Motor de Mouse (MOUSE_ENGINE.md)

O **MouseEngine** é responsável pela injeção nativa de eventos de mouse no Windows.

## 1. Implementação Nativa (Win32 API)
A emissão de eventos utiliza `SendInput` com a estrutura `INPUT` configurada com `INPUT_MOUSE` e `MOUSEINPUT`:
- `MOUSEEVENTF_LEFTDOWN` / `MOUSEEVENTF_LEFTUP`
- `MOUSEEVENTF_RIGHTDOWN` / `MOUSEEVENTF_RIGHTUP`
- `MOUSEEVENTF_MIDDLEDOWN` / `MOUSEEVENTF_MIDDLEUP`
- `MOUSEEVENTF_WHEEL` (rolagem vertical de scroll)

## 2. Tipos de Cliques
- **Single**: Envia `DOWN`, pausa de 15ms para registro confiável pelo jogo/aplicativo, e envia `UP`.
- **Double**: Executa dois ciclos Single com intervalo de 40ms entre eles.
- **Triple**: Executa três ciclos Single com intervalo de 40ms entre eles.
- **Hold**: Envia apenas o evento `DOWN` e mantém o botão pressionado até o encerramento da automação ou disparo do Failsafe.

## 3. Posicionamento
1. **Cursor Atual**: Não altera as coordenadas atuais do cursor do Windows (`GetCursorPos`).
2. **Posição Fixa**: Move com `SetCursorPos` e, no mesmo `SendInput` do clique, manda `MOUSEEVENTF_MOVE | ABSOLUTE | VIRTUALDESK`. Sem o movimento absoluto, o próximo movimento físico do mouse faz o clique cair onde o cursor estiver. O clique rápido só usa essa posição quando a aba ativa não é Multi-Pontos nem Sequências.
3. **Área Randômica**: Gera um ponto pseudo-aleatório `(rx, ry)` dentro do retângulo delimitado por `[x1, y1, x2, y2]`.
